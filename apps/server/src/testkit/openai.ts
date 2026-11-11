import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import type * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Jwk from "effect/jose/Jwk";
import * as Jwks from "effect/jose/Jwks";
import * as Jwt from "effect/jose/Jwt";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Signature from "effect/crypto/Signature";

import { layerCrypto } from "../chatgpt/ChatGpt.ts";
import { OpenAi } from "../chatgpt/OpenAi.ts";

/** The fake's addresses. Nothing listens there: the fake HttpClient answers instead. */
export const FAKE_OPENAI = {
  ...OpenAi.defaultValue(),
  issuer: "https://auth.test",
  authorizeUrl: "https://auth.test/authorize",
  tokenUrl: "https://auth.test/token",
  revokeUrl: "https://auth.test/revoke",
  apiUrl: "https://api.test/v1",
  // A free port: the test must not depend on 1455 being free on the machine.
  registrationPort: 0,
};

export interface Answer {
  readonly status: number;
  /** JSON body, or SSE events for a streamed response. */
  readonly body: unknown;
  readonly sse?: boolean;
  /** Keep the stream open after the events, as a long answer still on its way. */
  readonly open?: boolean;
}

/** An SSE body that sends `text`, then stays open until the reader cancels it. */
const openStream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start: (controller) => controller.enqueue(new TextEncoder().encode(text)),
  });

export interface RecordedRequest {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

const IdClaims = Schema.Struct({
  iss: Schema.String,
  aud: Schema.String,
  sub: Schema.String,
  email: Schema.String,
  nonce: Schema.String,
  exp: Schema.Number,
});

/** SSE text of a streamed Responses API answer. */
export const sse = (events: ReadonlyArray<unknown>) =>
  events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

const bodyText = (request: HttpClientRequest.HttpClientRequest) =>
  request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "";

/**
 * A scripted OpenAI: answers queued per URL, every request recorded, and a signing key whose
 * public half is the only key Glose trusts.
 */
export const makeFakeOpenAi = Effect.gen(function* () {
  const { publicKey, privateKey } = yield* Jwk.generateKeyPair({
    algorithm: "RS256",
    kid: "test",
  });
  const signingKey = yield* Jwk.importPrivate(privateKey, "RS256");
  const signature = yield* Signature.Signature;
  const queues = new Map<string, Array<Answer>>();
  const requests: Array<RecordedRequest> = [];

  const client = HttpClient.make((request, url) =>
    Effect.sync(() => {
      const target = `${url.origin}${url.pathname}`;
      requests.push({ url: target, headers: request.headers, body: bodyText(request) });
      const answer = queues.get(target)?.shift() ?? { status: 404, body: { detail: "no answer" } };
      const response = answer.sse
        ? new Response(
            answer.open
              ? openStream(sse(answer.body as ReadonlyArray<unknown>))
              : sse(answer.body as ReadonlyArray<unknown>),
            {
              status: answer.status,
              headers: { "content-type": "text/event-stream" },
            },
          )
        : new Response(JSON.stringify(answer.body), {
            status: answer.status,
            headers: { "content-type": "application/json" },
          });
      return HttpClientResponse.fromWeb(request, response);
    }),
  );

  return {
    layer: Layer.mergeAll(
      Layer.succeed(HttpClient.HttpClient, client),
      Jwks.layerLocal({ keys: [publicKey] }),
      Layer.succeed(OpenAi, FAKE_OPENAI),
    ),
    requests,
    /** Queues answers for a URL; each request takes the next one. */
    answer: (url: string, ...answers: ReadonlyArray<Answer>) => {
      queues.set(url, [...(queues.get(url) ?? []), ...answers]);
    },
    /** An ID token as OpenAI would sign it for this client. */
    idToken: (claims: {
      readonly clientId: string;
      readonly sub: string;
      readonly email: string;
      readonly nonce: string;
    }) =>
      Jwt.sign(
        IdClaims,
        {
          iss: FAKE_OPENAI.issuer,
          aud: claims.clientId,
          sub: claims.sub,
          email: claims.email,
          nonce: claims.nonce,
          exp: 4_000_000_000,
        },
        signingKey,
        { kid: "test" },
      ).pipe(Effect.map(Redacted.value), Effect.provideService(Signature.Signature, signature)),
  };
}).pipe(Effect.provide(layerCrypto));

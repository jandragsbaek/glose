import type {
  ChatGptAccountChoice,
  ChatGptProblem,
  ChatGptStatus,
  StorageError,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import * as HttpClient from "effect/http/HttpClient";
import * as Jwks from "effect/jose/Jwks";
import * as Jwt from "effect/jose/Jwt";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Signature from "effect/crypto/Signature";

import * as Settings from "../settings/Settings.ts";
import { Browser } from "./Browser.ts";
import { listen } from "./callback.ts";
import {
  type Account,
  activeAccount,
  Credentials,
  type CredentialsData,
  putAccount,
  type Tokens,
} from "./Credentials.ts";
import {
  makeAttemptSecrets,
  requestTokens,
  scopesOf,
  type TokenResponse,
  UNUSABLE_REFRESH_CODES,
} from "./oauth.ts";
import {
  AGENT_NAME,
  CALLBACK_PATH,
  OpenAi,
  PLAN_SCOPE,
  REGISTRATION_CLIENT_ID,
  SCOPES,
} from "./OpenAi.ts";

/** Why the AI cannot use ChatGPT right now. */
export class ChatGptUnavailable extends Data.TaggedError("ChatGptUnavailable")<{
  readonly reason: "not-connected" | "plan-not-allowed" | "unavailable";
}> {}

/** A sign-in attempt that ended without a connection. */
class ConnectFailed extends Data.TaggedError("ConnectFailed")<{
  readonly problem: ChatGptProblem;
  readonly detail: string;
}> {}

export class ChatGpt extends Context.Service<
  ChatGpt,
  {
    /** The status now, then every change. */
    readonly status: Stream.Stream<ChatGptStatus>;
    /** Starts a sign-in in the browser and returns; `status` follows it. */
    readonly connect: (input: {
      readonly account: ChatGptAccountChoice;
      readonly consent: boolean;
    }) => Effect.Effect<void, StorageError>;
    readonly cancel: Effect.Effect<void>;
    /** Stops what runs on the user's plan, then revokes and forgets the sign-in. */
    readonly disconnect: Effect.Effect<{ readonly revoked: boolean }, StorageError>;
    /** Runs `stop` at each sign-out, before the tokens are revoked and forgotten. */
    readonly beforeSignOut: (stop: Effect.Effect<void>) => Effect.Effect<void>;
    readonly dismissPlanNotice: Effect.Effect<void, StorageError>;
    /** An access token for the Responses API, refreshed when it is about to expire. */
    readonly accessToken: Effect.Effect<Redacted.Redacted<string>, ChatGptUnavailable>;
  }
>()("glose/chatgpt/ChatGpt") {}

const IdTokenClaims = Schema.Struct({
  sub: Schema.String,
  email: Schema.optionalKey(Schema.String),
  nonce: Schema.optionalKey(Schema.String),
});

/** Refresh this long before the access token expires (it lives one hour). */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const SIGN_IN_TIME_LIMIT = "10 minutes";

const statusOf = (data: CredentialsData, problem: ChatGptProblem | null): ChatGptStatus => {
  const account = activeAccount(data);
  if (account?.tokens) {
    return {
      _tag: "Connected",
      email: account.email,
      planUsage: account.tokens.scopes.includes(PLAN_SCOPE),
      planNoticeSeen: account.planNoticeSeen,
    };
  }
  return { _tag: "Disconnected", email: account?.email ?? null, problem };
};

const tokensFrom = (response: TokenResponse, now: number, previous?: Tokens): Tokens | null => {
  const idToken = response.id_token ?? previous?.idToken;
  const refreshToken = response.refresh_token ?? previous?.refreshToken;
  if (idToken === undefined || refreshToken === undefined) return null;
  return {
    idToken,
    accessToken: response.access_token,
    refreshToken,
    expiresAt: now + response.expires_in * 1000,
    scopes: response.scope === undefined ? (previous?.scopes ?? []) : scopesOf(response.scope),
  };
};

const failed = (detail: string) => new ConnectFailed({ problem: "failed", detail });

export const make = Effect.gen(function* () {
  const credentials = yield* Credentials;
  const settings = yield* Settings.Settings;
  const openAi = yield* OpenAi;
  const browser = yield* Browser;
  const http = yield* HttpClient.HttpClient;
  const jwks = yield* Jwks.Jwks;
  const signature = yield* Signature.Signature;

  const initial = yield* credentials.get.pipe(
    Effect.map((data) => statusOf(data, null)),
    Effect.orElseSucceed((): ChatGptStatus => ({
      _tag: "Disconnected",
      email: null,
      problem: null,
    })),
  );
  const status = yield* SubscriptionRef.make<ChatGptStatus>(initial);
  const attempt = yield* FiberHandle.make<void, never>();
  const refreshLock = yield* Semaphore.make(1);
  const signOutSteps: Array<Effect.Effect<void>> = [];

  const publish = (problem: ChatGptProblem | null) =>
    credentials.get.pipe(
      Effect.flatMap((data) => SubscriptionRef.set(status, statusOf(data, problem))),
      Effect.catch(() =>
        SubscriptionRef.set(status, { _tag: "Disconnected", email: null, problem: "failed" }),
      ),
    );

  const verifyIdToken = (idToken: string, clientId: string, nonce: string) =>
    Jwt.verifyWithKeySet(IdTokenClaims, idToken, {
      algorithms: ["RS256"],
      issuer: openAi.issuer,
      audience: clientId,
      requiredClaims: ["sub", "exp"],
      clockTolerance: "1 minute",
    }).pipe(
      Effect.provideService(Jwks.Jwks, jwks),
      Effect.provideService(Signature.Signature, signature),
      Effect.mapError((error) => failed(`ID token: ${String(error)}`)),
      Effect.flatMap(({ claims }) =>
        claims.nonce === nonce ? Effect.succeed(claims) : Effect.fail(failed("ID token nonce")),
      ),
    );

  /** One sign-in: listener, browser, callback, code exchange, ID token check, saved tokens. */
  const signIn = Effect.fn("ChatGpt.signIn")(function* (
    choice: ChatGptAccountChoice,
    consent: boolean,
  ) {
    const data = yield* credentials.get;
    const saved: Account | undefined = choice === "saved" ? activeAccount(data) : undefined;
    const { language } = (yield* settings.get).settings;
    const secrets = makeAttemptSecrets();

    const listener = yield* listen(
      saved ? 0 : openAi.registrationPort,
      secrets.state,
      language ?? "en",
    ).pipe(
      Effect.catchTags({
        PortBusy: () => Effect.fail(new ConnectFailed({ problem: "port-busy", detail: "" })),
        ListenFailed: (error) => Effect.fail(failed(String(error.cause))),
      }),
    );
    const redirectUri = `http://127.0.0.1:${listener.port}${CALLBACK_PATH}`;

    const query = new URLSearchParams({
      client_id: saved?.clientId ?? REGISTRATION_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      resource: openAi.apiUrl,
      state: secrets.state,
      nonce: secrets.nonce,
      code_challenge: secrets.challenge,
      code_challenge_method: "S256",
      ext_agent_host_id: data.hostId,
    });
    if (saved) {
      query.set("login_hint", saved.email);
      if (saved.tokens) query.set("id_token_hint", saved.tokens.idToken);
    } else {
      query.set("agent_name_hint", AGENT_NAME);
    }
    if (consent) query.set("prompt", "consent");
    const authorizeUrl = `${openAi.authorizeUrl}?${query.toString()}`;

    yield* SubscriptionRef.set(status, { _tag: "Connecting", authorizeUrl });
    yield* browser.open(authorizeUrl);

    const callback = yield* listener.callback.pipe(
      Effect.timeoutOrElse({
        duration: SIGN_IN_TIME_LIMIT,
        orElse: () => Effect.fail(new ConnectFailed({ problem: "timed-out", detail: "" })),
      }),
    );
    const error = callback.get("error");
    if (error !== null) {
      return yield* new ConnectFailed({
        problem: error === "access_denied" ? "declined" : "failed",
        detail: `callback error ${error}`,
      });
    }
    const code = callback.get("code");
    if (code === null) return yield* failed("callback without code");

    // A first sign-in learns its client ID here; a later one must keep its own.
    const returnedClientId = callback.get("client_id");
    const clientId = saved?.clientId ?? returnedClientId;
    if (clientId === null || clientId === REGISTRATION_CLIENT_ID) {
      return yield* failed("registration returned no client ID");
    }
    if (returnedClientId !== null && returnedClientId !== clientId) {
      return yield* new ConnectFailed({ problem: "other-account", detail: "client ID changed" });
    }

    const response = yield* requestTokens(openAi.tokenUrl, {
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      code_verifier: secrets.verifier,
      redirect_uri: redirectUri,
      resource: openAi.apiUrl,
    }).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.mapError((error) => failed(String(error))),
    );
    const tokens = tokensFrom(response, yield* Clock.currentTimeMillis);
    if (tokens === null) return yield* failed("token response without ID or refresh token");

    const claims = yield* verifyIdToken(tokens.idToken, clientId, secrets.nonce);
    if (saved && claims.sub !== saved.subject) {
      return yield* new ConnectFailed({ problem: "other-account", detail: "subject changed" });
    }
    const previous = data.accounts.find((account) => account.subject === claims.sub);
    yield* credentials.update((current) => ({
      ...putAccount(current, {
        subject: claims.sub,
        email: claims.email ?? previous?.email ?? saved?.email ?? "",
        clientId,
        tokens,
        planNoticeSeen: previous?.planNoticeSeen ?? false,
      }),
      active: claims.sub,
    }));
  });

  const runAttempt = (choice: ChatGptAccountChoice, consent: boolean) =>
    Effect.scoped(signIn(choice, consent)).pipe(
      Effect.andThen(publish(null)),
      Effect.catchTags({
        ConnectFailed: (error) =>
          Effect.logWarning("ChatGPT sign-in failed", error.detail).pipe(
            Effect.andThen(publish(error.problem)),
          ),
        StorageError: (error) =>
          Effect.logWarning("ChatGPT sign-in failed", error.detail).pipe(
            Effect.andThen(publish("failed")),
          ),
      }),
      Effect.onInterrupt(() => publish(null)),
    );

  /** Forgets the active account's tokens but keeps its registration for a later sign-in. */
  const forgetTokens = credentials.update((data) => {
    const account = activeAccount(data);
    return account ? putAccount(data, { ...account, tokens: null }) : data;
  });

  const refresh = Effect.fn("ChatGpt.refresh")(function* (account: Account, tokens: Tokens) {
    const response = yield* requestTokens(openAi.tokenUrl, {
      grant_type: "refresh_token",
      client_id: account.clientId,
      refresh_token: tokens.refreshToken,
      resource: openAi.apiUrl,
    }).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.catchTags({
        TokenRejected: (error) =>
          UNUSABLE_REFRESH_CODES.has(error.code)
            ? forgetTokens.pipe(
                Effect.andThen(publish("expired")),
                Effect.ignore,
                Effect.andThen(Effect.fail(new ChatGptUnavailable({ reason: "not-connected" }))),
              )
            : Effect.fail(new ChatGptUnavailable({ reason: "unavailable" })),
        TokenUnavailable: () => Effect.fail(new ChatGptUnavailable({ reason: "unavailable" })),
      }),
    );
    const next = tokensFrom(response, yield* Clock.currentTimeMillis, tokens);
    if (next === null) return yield* new ChatGptUnavailable({ reason: "unavailable" });
    yield* credentials
      .update((data) => putAccount(data, { ...account, tokens: next }))
      .pipe(Effect.mapError(() => new ChatGptUnavailable({ reason: "unavailable" })));
    return next;
  });

  const revoke = (account: Account, tokens: Tokens) =>
    http
      .execute(
        HttpClientRequest.post(openAi.revokeUrl).pipe(
          HttpClientRequest.bodyUrlParams({
            token: tokens.refreshToken,
            token_type_hint: "refresh_token",
            client_id: account.clientId,
          }),
        ),
      )
      .pipe(
        Effect.flatMap((response) =>
          response.status === 200
            ? Effect.succeed(true)
            : response.status >= 500
              ? Effect.fail(response.status)
              : Effect.succeed(false),
        ),
        Effect.retry({ schedule: Schedule.exponential("200 millis"), times: 2 }),
        Effect.orElseSucceed(() => false),
      );

  return ChatGpt.of({
    status: SubscriptionRef.changes(status),

    connect: ({ account, consent }) =>
      // The old attempt finishes interrupting first, so its status cannot land after the new one.
      FiberHandle.clear(attempt).pipe(
        Effect.andThen(FiberHandle.run(attempt, runAttempt(account, consent))),
        Effect.asVoid,
      ),

    cancel: FiberHandle.clear(attempt),

    disconnect: Effect.gen(function* () {
      yield* FiberHandle.clear(attempt);
      yield* Effect.all(signOutSteps, { discard: true });
      const account = activeAccount(yield* credentials.get);
      const revoked =
        account?.tokens === undefined || account.tokens === null
          ? true
          : yield* revoke(account, account.tokens);
      yield* forgetTokens;
      yield* publish(null);
      return { revoked };
    }),

    beforeSignOut: (stop) => Effect.sync(() => void signOutSteps.push(stop)),

    dismissPlanNotice: Effect.gen(function* () {
      yield* credentials.update((data) => {
        const account = activeAccount(data);
        return account ? putAccount(data, { ...account, planNoticeSeen: true }) : data;
      });
      yield* publish(null);
    }),

    accessToken: refreshLock.withPermit(
      Effect.gen(function* () {
        const data = yield* credentials.get.pipe(
          Effect.mapError(() => new ChatGptUnavailable({ reason: "unavailable" })),
        );
        const account = activeAccount(data);
        if (!account?.tokens) return yield* new ChatGptUnavailable({ reason: "not-connected" });
        if (!account.tokens.scopes.includes(PLAN_SCOPE)) {
          return yield* new ChatGptUnavailable({ reason: "plan-not-allowed" });
        }
        const now = yield* Clock.currentTimeMillis;
        const tokens =
          account.tokens.expiresAt - REFRESH_MARGIN_MS > now
            ? account.tokens
            : yield* refresh(account, account.tokens);
        return Redacted.make(tokens.accessToken);
      }),
    ),
  });
});

/** OpenAI's signing keys, fetched when the first ID token needs them. */
export const layerJwks = Layer.unwrap(
  Effect.gen(function* () {
    const { jwksUrl } = yield* OpenAi;
    return Jwks.layerRemote({ url: jwksUrl });
  }),
);

export const layerCrypto = Signature.layerWebCrypto.pipe(
  Layer.provide(SecureRandom.layerWebCrypto),
);

export const layer = Layer.effect(ChatGpt, make);

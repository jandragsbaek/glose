import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import type * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Schema from "effect/Schema";
import * as NodeCrypto from "node:crypto";

/** A fresh secret per sign-in attempt: PKCE verifier and challenge, `state` and `nonce`. */
export const makeAttemptSecrets = () => {
  const verifier = NodeCrypto.randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: NodeCrypto.createHash("sha256").update(verifier).digest("base64url"),
    state: NodeCrypto.randomBytes(16).toString("base64url"),
    nonce: NodeCrypto.randomBytes(16).toString("base64url"),
  };
};

export const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.optionalKey(Schema.String),
  id_token: Schema.optionalKey(Schema.String),
  expires_in: Schema.Number,
  /** Space-separated granted scopes. */
  scope: Schema.optionalKey(Schema.String),
});
export type TokenResponse = typeof TokenResponse.Type;

const OAuthErrorBody = Schema.Struct({ error: Schema.String });

/** The token endpoint said no; `code` is the OAuth error, such as `invalid_grant`. */
export class TokenRejected extends Schema.TaggedError<TokenRejected>()("TokenRejected", {
  status: Schema.Number,
  code: Schema.String,
}) {}

/** No usable answer: network failure, a 5xx, or a body Glose cannot read. */
export class TokenUnavailable extends Schema.TaggedError<TokenUnavailable>()("TokenUnavailable", {
  detail: Schema.String,
}) {}

/** Refresh errors after which the refresh token can never work again. */
export const UNUSABLE_REFRESH_CODES: ReadonlySet<string> = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused",
]);

const decodeTokens = Schema.decodeUnknownEffect(TokenResponse);
const decodeOAuthError = Schema.decodeUnknownEffect(OAuthErrorBody);

const readTokenResponse = Effect.fn("oauth.readTokenResponse")(function* (
  response: HttpClientResponse.HttpClientResponse,
) {
  const body = yield* response.json;
  if (response.status >= 200 && response.status < 300) return yield* decodeTokens(body);
  if (response.status >= 400 && response.status < 500) {
    const { error } = yield* decodeOAuthError(body);
    return yield* new TokenRejected({ status: response.status, code: error });
  }
  return yield* new TokenUnavailable({ detail: `token endpoint answered ${response.status}` });
});

/** POSTs a form to the token endpoint and reads the tokens. */
export const requestTokens = Effect.fn("oauth.requestTokens")(
  function* (tokenUrl: string, form: Record<string, string>) {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.execute(
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.acceptJson,
        HttpClientRequest.bodyUrlParams(form),
      ),
    );
    return yield* readTokenResponse(response);
  },
  Effect.catchTags({
    HttpClientError: (error) => Effect.fail(new TokenUnavailable({ detail: String(error) })),
    SchemaError: (error) => Effect.fail(new TokenUnavailable({ detail: String(error) })),
  }),
);

export const scopesOf = (scope: string | undefined): ReadonlyArray<string> =>
  scope === undefined ? [] : scope.split(" ").filter((part) => part !== "");

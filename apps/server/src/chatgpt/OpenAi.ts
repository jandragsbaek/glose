import * as Context from "effect/Context";

/**
 * Where "Sign in with ChatGPT" and the Responses API live. OpenAI documents this flow for
 * open-source and locally hosted apps: https://developers.openai.com/siwc/token-sharing-open-source
 * A test points these at a local fake.
 */
export const OpenAi = Context.Reference<{
  readonly issuer: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly revokeUrl: string;
  readonly jwksUrl: string;
  /** Base of the public API that bills the user's ChatGPT plan; also the token's `resource`. */
  readonly apiUrl: string;
  /** Callback port of a first sign-in; later sign-ins take any free port. */
  readonly registrationPort: number;
}>("glose/chatgpt/OpenAi", {
  defaultValue: () => ({
    issuer: "https://auth.openai.com",
    authorizeUrl: "https://auth.openai.com/api/accounts/authorize",
    tokenUrl: "https://auth.openai.com/api/accounts/oauth/token",
    revokeUrl: "https://auth.openai.com/api/accounts/oauth/revoke",
    jwksUrl: "https://auth.openai.com/.well-known/jwks.json",
    apiUrl: "https://api.openai.com/v1",
    registrationPort: 1455,
  }),
});

/** The client ID of a first sign-in. OpenAI answers with the client ID to keep. */
export const REGISTRATION_CLIENT_ID = "dynamic_agent_client";

/** The app's name, shown to the user when they approve Glose in ChatGPT. */
export const AGENT_NAME = "Glose";

export const IDENTITY_SCOPES = ["openid", "profile", "email"] as const;

/** The scope that lets Glose bill Responses API requests to the user's ChatGPT plan. */
export const PLAN_SCOPE = "chatgpt.tokens.use.direct";

export const SCOPES = [...IDENTITY_SCOPES, "offline_access", "resource.invoke", PLAN_SCOPE];

export const CALLBACK_PATH = "/auth/callback";

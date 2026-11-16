import * as Context from "effect/Context";

export const OpenAi = Context.Reference<{
  readonly issuer: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly revokeUrl: string;
  readonly jwksUrl: string;
  readonly apiUrl: string;
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

export const REGISTRATION_CLIENT_ID = "dynamic_agent_client";

export const AGENT_NAME = "Glose";

export const IDENTITY_SCOPES = ["openid", "profile", "email"] as const;

export const PLAN_SCOPE = "chatgpt.tokens.use.direct";

export const SCOPES = [...IDENTITY_SCOPES, "offline_access", "resource.invoke", PLAN_SCOPE];

export const CALLBACK_PATH = "/auth/callback";

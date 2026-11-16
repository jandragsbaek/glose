import * as Context from "effect/Context";

export const CLIENT_ID = "Ov23liRS2mcRW1FtyAfH";

export const SCOPE = "repo";

export const GitHubApi = Context.Reference<{
  readonly clientId: string;
  readonly deviceCodeUrl: string;
  readonly tokenUrl: string;
  readonly apiUrl: string;
  readonly gitUrl: string;
}>("glose/github/GitHubApi", {
  defaultValue: () => ({
    clientId: process.env.GLOSE_GITHUB_CLIENT_ID || CLIENT_ID,
    deviceCodeUrl: "https://github.com/login/device/code",
    tokenUrl: "https://github.com/login/oauth/access_token",
    apiUrl: "https://api.github.com",
    gitUrl: "https://github.com/",
  }),
});

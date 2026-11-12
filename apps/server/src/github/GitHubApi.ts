import * as Context from "effect/Context";

/**
 * The client ID of Glose's OAuth app on GitHub (owned by jandragsbaek), with Device Flow on. A
 * client ID is public; the device flow needs no client secret. `GLOSE_GITHUB_CLIENT_ID` replaces
 * it, for example with a test app.
 */
export const CLIENT_ID = "Ov23liRS2mcRW1FtyAfH";

/** Glose may make and push to the user's private repositories; GitHub has no narrower scope. */
export const SCOPE = "repo";

/**
 * Where GitHub's device flow, REST API and git server live. A test points these at a local fake.
 * Device flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */
export const GitHubApi = Context.Reference<{
  readonly clientId: string;
  readonly deviceCodeUrl: string;
  readonly tokenUrl: string;
  readonly apiUrl: string;
  /** Git over HTTPS; the sign-in header goes only to addresses under it. */
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

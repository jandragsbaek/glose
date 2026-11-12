import * as Schema from "effect/Schema";

/** Why the last attempt to connect GitHub, or the connection itself, ended. */
export const GitHubProblem = Schema.Literals([
  /** The user declined on github.com. */
  "declined",
  /** The code expired before the user entered it. */
  "timed-out",
  /** GitHub no longer accepts the sign-in (revoked on github.com); connect again. */
  "expired",
  "failed",
]);
export type GitHubProblem = typeof GitHubProblem.Type;

/**
 * The GitHub connection of this computer. Glose uses it only to make a private repository for
 * the Graph's Versions and to push them there.
 */
export const GitHubStatus = Schema.Union([
  /** This build of Glose has no GitHub app registered, so it cannot connect. */
  Schema.TaggedStruct("Unavailable", {}),
  Schema.TaggedStruct("Disconnected", { problem: Schema.NullOr(GitHubProblem) }),
  Schema.TaggedStruct("Connecting", {
    /** The code the user types on GitHub's page. */
    userCode: Schema.String,
    /** GitHub's page for the code; Glose opens it, and the user can open it again. */
    verificationUri: Schema.String,
  }),
  Schema.TaggedStruct("Connected", { login: Schema.String }),
]);
export type GitHubStatus = typeof GitHubStatus.Type;

/** GitHub's page where the user sees and revokes the apps that may use their account. */
export const GITHUB_APPS_URL = "https://github.com/settings/applications";

/** GitHub's sign-up page, for a user without an account. */
export const GITHUB_SIGNUP_URL = "https://github.com/signup";

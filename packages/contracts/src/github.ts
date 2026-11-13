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

/**
 * A private repository the connected account can read, offered at first start to copy a Graph
 * from. Glose lists the user's own and those other accounts share with them.
 */
export const GitHubRepository = Schema.Struct({
  /** `owner/name`, as GitHub shows it. */
  fullName: Schema.String,
  owner: Schema.String,
  /** The address git copies it from, over HTTPS. */
  url: Schema.String,
  /** Another account owns it and shares it with the user. */
  shared: Schema.Boolean,
  /** It holds a Graph: Glose's `.glose/settings.json` is in it. */
  graph: Schema.Boolean,
  /** When something was last pushed to it (ms since epoch), or null when GitHub does not say. */
  pushedAt: Schema.NullOr(Schema.Number),
});
export type GitHubRepository = typeof GitHubRepository.Type;

/** GitHub's page where the user sees and revokes the apps that may use their account. */
export const GITHUB_APPS_URL = "https://github.com/settings/applications";

/** GitHub's sign-up page, for a user without an account. */
export const GITHUB_SIGNUP_URL = "https://github.com/signup";

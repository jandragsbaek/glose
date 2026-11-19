import * as Schema from "effect/Schema";

export const GitHubProblem = Schema.Literals(["declined", "timed-out", "expired", "failed"]);
export type GitHubProblem = typeof GitHubProblem.Type;

export const GitHubStatus = Schema.Union([
  Schema.TaggedStruct("Unavailable", {}),
  Schema.TaggedStruct("Disconnected", { problem: Schema.NullOr(GitHubProblem) }),
  Schema.TaggedStruct("Connecting", {
    userCode: Schema.String,
    verificationUri: Schema.String,
  }),
  Schema.TaggedStruct("Connected", { login: Schema.String }),
]);
export type GitHubStatus = typeof GitHubStatus.Type;

export const GitHubRepository = Schema.Struct({
  fullName: Schema.String,
  owner: Schema.String,
  url: Schema.String,
  shared: Schema.Boolean,
  vault: Schema.Boolean,
  pushedAt: Schema.NullOr(Schema.Number),
});
export type GitHubRepository = typeof GitHubRepository.Type;

export const GITHUB_APPS_URL = "https://github.com/settings/applications";

export const GITHUB_SIGNUP_URL = "https://github.com/signup";

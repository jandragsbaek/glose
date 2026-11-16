import * as Schema from "effect/Schema";

export const VersionsOffReason = Schema.Literals([
  "no-graph",
  "no-git",
  "other-repository",
  "failed",
]);
export type VersionsOffReason = typeof VersionsOffReason.Type;

export const VersionsProblem = Schema.Literals(["conflict", "sync-failed", "save-failed"]);
export type VersionsProblem = typeof VersionsProblem.Type;

export const VersionsStatus = Schema.Union([
  Schema.TaggedStruct("Off", { reason: VersionsOffReason }),
  Schema.TaggedStruct("On", {
    savedAt: Schema.NullOr(Schema.Number),
    unsaved: Schema.Boolean,
    activity: Schema.Literals(["idle", "saving", "syncing"]),
    remote: Schema.NullOr(Schema.String),
    remoteUrl: Schema.NullOr(Schema.String),
    unpushed: Schema.Number,
    syncedAt: Schema.NullOr(Schema.Number),
    problem: Schema.NullOr(VersionsProblem),
  }),
]);
export type VersionsStatus = typeof VersionsStatus.Type;

export const EndDay = Schema.Struct({ summary: Schema.String });
export type EndDay = typeof EndDay.Type;

export const GITHUB_REPOSITORY_NAME = /^[A-Za-z0-9._-]{1,100}$/;

export const DEFAULT_BACKUP_REPOSITORY = "glose-graph";

export const BackUpToGitHub = Schema.Struct({
  name: Schema.String.pipe(Schema.check(Schema.isPattern(GITHUB_REPOSITORY_NAME))),
});
export type BackUpToGitHub = typeof BackUpToGitHub.Type;

export const SetRemote = Schema.Struct({
  url: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});
export type SetRemote = typeof SetRemote.Type;

export const RemoteRefusedReason = Schema.Literals([
  "versions-off",
  "github-not-connected",
  "public-repository",
  "github-failed",
  "unreachable",
  "other-graph",
]);
export type RemoteRefusedReason = typeof RemoteRefusedReason.Type;

export class RemoteRefused extends Schema.TaggedError<RemoteRefused>()("RemoteRefused", {
  reason: RemoteRefusedReason,
}) {}

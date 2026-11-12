import * as Schema from "effect/Schema";

/** Why Glose keeps no Versions of the Graph folder now. */
export const VersionsOffReason = Schema.Literals([
  /** The first-start setup has not chosen a Graph folder yet. */
  "no-graph",
  /** No `git` program on this computer. */
  "no-git",
  /** The Graph folder is inside another git repository, which Glose leaves alone. */
  "other-repository",
  /** Git refused to start a repository in the Graph folder, or to read it. */
  "failed",
]);
export type VersionsOffReason = typeof VersionsOffReason.Type;

/** What went wrong in the last save or sync. Glose tries again at the next change. */
export const VersionsProblem = Schema.Literals([
  /** The same lines changed here and on the remote. Glose undid its sync; nothing was lost. */
  "conflict",
  /** The remote did not answer, or refused the push. */
  "sync-failed",
  /** Git could not make a Version. */
  "save-failed",
]);
export type VersionsProblem = typeof VersionsProblem.Type;

/**
 * Glose's history of the Graph folder. Each Version is a git commit; Glose makes one after a
 * quiet pause in the user's work and at the end of the day, and syncs it with the remote.
 */
export const VersionsStatus = Schema.Union([
  Schema.TaggedStruct("Off", { reason: VersionsOffReason }),
  Schema.TaggedStruct("On", {
    /** When the latest Version was made (ms since epoch), or null before the first one. */
    savedAt: Schema.NullOr(Schema.Number),
    /** Files changed since the latest Version. */
    unsaved: Schema.Boolean,
    activity: Schema.Literals(["idle", "saving", "syncing"]),
    /** The git remote Glose syncs with, or null when the repository has none. */
    remote: Schema.NullOr(Schema.String),
    /** The remote's address without any password in it, or null. */
    remoteUrl: Schema.NullOr(Schema.String),
    /** Versions on this computer that the remote does not have yet. */
    unpushed: Schema.Number,
    /** When Glose last synced with the remote while it ran, or null. */
    syncedAt: Schema.NullOr(Schema.Number),
    problem: Schema.NullOr(VersionsProblem),
  }),
]);
export type VersionsStatus = typeof VersionsStatus.Type;

/** The user ends the day: one line about it names the Version. */
export const EndDay = Schema.Struct({ summary: Schema.String });
export type EndDay = typeof EndDay.Type;

/** A name GitHub accepts for a repository. */
export const GITHUB_REPOSITORY_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** The repository name Glose suggests for a Graph's backup. */
export const DEFAULT_BACKUP_REPOSITORY = "glose-graph";

/** Backs the Versions up to a private repository of the connected GitHub account. */
export const BackUpToGitHub = Schema.Struct({
  /** The repository's name; Glose makes it, or uses the user's private one of that name. */
  name: Schema.String.pipe(Schema.check(Schema.isPattern(GITHUB_REPOSITORY_NAME))),
});
export type BackUpToGitHub = typeof BackUpToGitHub.Type;

/** Backs the Versions up to a git remote the user already has, at any host. */
export const SetRemote = Schema.Struct({
  url: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});
export type SetRemote = typeof SetRemote.Type;

/** Why Glose did not back the Versions up to that remote. Nothing changed. */
export const RemoteRefusedReason = Schema.Literals([
  /** Glose keeps no Versions now (no git, say); the status says why. */
  "versions-off",
  "github-not-connected",
  /** A public repository of that name exists; Glose never pushes the Graph where all can read it. */
  "public-repository",
  /** GitHub refused or did not answer when Glose looked for or made the repository. */
  "github-failed",
  /** Git could not reach the remote, or could not sign in to it. */
  "unreachable",
  /** The remote holds a history that is not this Graph's. */
  "other-graph",
]);
export type RemoteRefusedReason = typeof RemoteRefusedReason.Type;

export class RemoteRefused extends Schema.TaggedError<RemoteRefused>()("RemoteRefused", {
  reason: RemoteRefusedReason,
}) {}

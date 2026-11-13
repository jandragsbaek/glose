import * as Schema from "effect/Schema";

/** Why this copy of Glose cannot update itself. */
export const UpdatesOffReason = Schema.Literals([
  /** Run from the repository, not installed: there is nothing to replace. */
  "not-installed",
  /** macOS replaces only a signed app, and Glose for macOS is not signed yet. */
  "unsigned-mac",
  /** On Linux only the AppImage can replace itself. */
  "not-appimage",
]);
export type UpdatesOffReason = typeof UpdatesOffReason.Type;

/** What went wrong in the last update step. The user can try that step again. */
export const UpdatesProblem = Schema.Literals([
  "check-failed",
  "download-failed",
  "install-failed",
]);
export type UpdatesProblem = typeof UpdatesProblem.Type;

/**
 * The app's own updates, from the nightly releases on GitHub. Glose looks for a newer
 * release every hour and when the user asks. The user downloads it, then restarts Glose
 * to install it.
 */
export const UpdatesStatus = Schema.Union([
  Schema.TaggedStruct("Off", {
    reason: UpdatesOffReason,
    currentVersion: Schema.String,
  }),
  Schema.TaggedStruct("On", {
    currentVersion: Schema.String,
    activity: Schema.Literals(["idle", "checking", "downloading"]),
    /** The newer release on GitHub, or null when this copy is the newest. */
    availableVersion: Schema.NullOr(Schema.String),
    /** The release that is downloaded and installs at the next restart, or null. */
    downloadedVersion: Schema.NullOr(Schema.String),
    /** 0 to 100 while a download runs, else null. */
    downloadPercent: Schema.NullOr(Schema.Number),
    /** When the last check ended (ms since epoch), or null before the first one. */
    checkedAt: Schema.NullOr(Schema.Number),
    problem: Schema.NullOr(UpdatesProblem),
  }),
]);
export type UpdatesStatus = typeof UpdatesStatus.Type;

/** What the user can do next with an update that is On: the step it waits for. */
export const updatesNextStep = (
  status: Extract<UpdatesStatus, { _tag: "On" }>,
): "check" | "download" | "install" | "wait" => {
  if (status.activity !== "idle") return "wait";
  if (status.availableVersion !== null && status.availableVersion !== status.downloadedVersion) {
    return "download";
  }
  if (status.downloadedVersion !== null) return "install";
  return "check";
};

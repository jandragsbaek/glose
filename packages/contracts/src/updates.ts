import * as Schema from "effect/Schema";

export const UpdatesOffReason = Schema.Literals(["not-installed", "unsigned-mac", "not-appimage"]);
export type UpdatesOffReason = typeof UpdatesOffReason.Type;

export const UpdatesProblem = Schema.Literals([
  "check-failed",
  "download-failed",
  "install-failed",
]);
export type UpdatesProblem = typeof UpdatesProblem.Type;

export const UpdatesStatus = Schema.Union([
  Schema.TaggedStruct("Off", {
    reason: UpdatesOffReason,
    currentVersion: Schema.String,
  }),
  Schema.TaggedStruct("On", {
    currentVersion: Schema.String,
    activity: Schema.Literals(["idle", "checking", "downloading"]),
    availableVersion: Schema.NullOr(Schema.String),
    downloadedVersion: Schema.NullOr(Schema.String),
    downloadPercent: Schema.NullOr(Schema.Number),
    checkedAt: Schema.NullOr(Schema.Number),
    problem: Schema.NullOr(UpdatesProblem),
  }),
]);
export type UpdatesStatus = typeof UpdatesStatus.Type;

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

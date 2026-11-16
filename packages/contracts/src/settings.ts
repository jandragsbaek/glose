import * as Schema from "effect/Schema";

import { RecallSettingsFile } from "./recall.ts";

export const Language = Schema.Literals(["en", "da"]);
export type Language = typeof Language.Type;

export const Settings = Schema.Struct({
  language: Schema.NullOr(Language),
  graphFolder: Schema.NullOr(Schema.String),
  siteFolder: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type Settings = typeof Settings.Type;

export const SettingsView = Schema.Struct({
  settings: Settings,
  suggestedGraphFolder: Schema.String,
});
export type SettingsView = typeof SettingsView.Type;

export const GraphSettings = Schema.Struct({
  recall: Schema.optionalKey(RecallSettingsFile),
});
export type GraphSettings = typeof GraphSettings.Type;

export const GraphFolderAction = Schema.Literals(["create", "open", "clone"]);
export type GraphFolderAction = typeof GraphFolderAction.Type;

export const CompleteSetup = Schema.Struct({
  language: Language,
  graphFolder: Schema.String,
  action: GraphFolderAction,
  remote: Schema.optionalKey(Schema.String),
});
export type CompleteSetup = typeof CompleteSetup.Type;

export const CheckRemote = Schema.Struct({
  url: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});
export type CheckRemote = typeof CheckRemote.Type;

export const GraphRemoteUnavailableReason = Schema.Literals(["no-git", "unreachable"]);
export type GraphRemoteUnavailableReason = typeof GraphRemoteUnavailableReason.Type;

export class GraphRemoteUnavailable extends Schema.TaggedError<GraphRemoteUnavailable>()(
  "GraphRemoteUnavailable",
  { reason: GraphRemoteUnavailableReason },
) {}

export class GraphFolderUnavailable extends Schema.TaggedError<GraphFolderUnavailable>()(
  "GraphFolderUnavailable",
  {
    path: Schema.String,
    reason: Schema.Literals([
      "not-absolute",
      "not-a-folder",
      "not-found",
      "not-empty",
      "not-writable",
    ]),
  },
) {}

export class GraphFolderNotSet extends Schema.TaggedError<GraphFolderNotSet>()(
  "GraphFolderNotSet",
  {},
) {}

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  detail: Schema.String,
}) {}

import * as Schema from "effect/Schema";

import { RecallSettingsFile } from "./recall.ts";

/** Interface languages. Notes and Writing projects may be in any language. */
export const Language = Schema.Literals(["en", "da"]);
export type Language = typeof Language.Type;

/**
 * Settings of this computer, kept outside the Graph folder; null fields are not chosen yet. The
 * interface language is here so that two people who share one Graph can each read their own.
 */
export const Settings = Schema.Struct({
  language: Schema.NullOr(Language),
  /** Absolute path of the folder that holds the Graph's Markdown files. */
  graphFolder: Schema.NullOr(Schema.String),
});
export type Settings = typeof Settings.Type;

export const SettingsView = Schema.Struct({
  settings: Settings,
  /** Offered in the first-start setup until the user picks a folder. */
  suggestedGraphFolder: Schema.String,
});
export type SettingsView = typeof SettingsView.Type;

/**
 * Settings that travel with the Graph folder, in its hidden `.glose/settings.json`; the file also
 * marks the folder as a Graph. A missing field takes its default, and unknown fields from a newer
 * Glose are ignored.
 */
export const GraphSettings = Schema.Struct({
  /** How Recall schedules Reviews. */
  recall: Schema.optionalKey(RecallSettingsFile),
});
export type GraphSettings = typeof GraphSettings.Type;

/** `create` starts an empty Graph; `open` uses a folder that exists, such as a moved Graph. */
export const GraphFolderAction = Schema.Literals(["create", "open"]);
export type GraphFolderAction = typeof GraphFolderAction.Type;

export const CompleteSetup = Schema.Struct({
  language: Language,
  graphFolder: Schema.String,
  action: GraphFolderAction,
});

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

/** A file could not be read or written; `detail` is for logs, not for the interface. */
export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  detail: Schema.String,
}) {}

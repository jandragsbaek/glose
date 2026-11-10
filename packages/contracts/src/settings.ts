import * as Schema from "effect/Schema";

/** Interface languages. Notes and Writing projects may be in any language. */
export const Language = Schema.Literals(["en", "da"]);
export type Language = typeof Language.Type;

/** App settings kept outside the Graph folder; null fields are not chosen yet. */
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

export const CompleteSetup = Schema.Struct({
  language: Language,
  graphFolder: Schema.String,
});

export class GraphFolderUnavailable extends Schema.TaggedError<GraphFolderUnavailable>()(
  "GraphFolderUnavailable",
  {
    path: Schema.String,
    reason: Schema.Literals(["not-absolute", "not-a-folder", "cannot-create"]),
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

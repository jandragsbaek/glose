import { GraphFolderUnavailable, GraphSettings, StorageError } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { writeFileAtomic } from "../storage.ts";

/** Hidden folder inside the Graph folder; it travels when the folder is moved or shared. */
export const GLOSE_DIR = ".glose";

const GraphSettingsJson = Schema.fromJsonString(GraphSettings);
const decodeGraphSettings = Schema.decodeUnknownEffect(GraphSettingsJson);
const encodeGraphSettings = Schema.encodeEffect(GraphSettingsJson);

const EMPTY: GraphSettings = {};

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

/** Starts and opens Graph folders. Both take an absolute path and refuse anything else. */
export const make = (fs: FileSystem.FileSystem, path: Path.Path) => {
  const settingsFile = (folder: string) => path.join(folder, GLOSE_DIR, "settings.json");

  const unavailable = (folder: string, reason: GraphFolderUnavailable["reason"]) =>
    new GraphFolderUnavailable({ path: folder, reason });

  /** "missing", or whether the path is a folder; a path Glose cannot inspect is a storage error. */
  const inspect = Effect.fn("GraphFolder.inspect")(function* (folder: string) {
    if (!path.isAbsolute(folder)) return yield* unavailable(folder, "not-absolute");
    if (!(yield* fs.exists(folder).pipe(Effect.mapError(storageError)))) return "missing";
    const info = yield* fs.stat(folder).pipe(Effect.mapError(storageError));
    if (info.type !== "Directory") return yield* unavailable(folder, "not-a-folder");
    return "folder";
  });

  const writeSettings = Effect.fn("GraphFolder.writeSettings")(
    function* (folder: string, settings: GraphSettings) {
      yield* fs.makeDirectory(path.join(folder, GLOSE_DIR), { recursive: true });
      yield* writeFileAtomic(fs, settingsFile(folder), yield* encodeGraphSettings(settings));
      return settings;
    },
    (effect, folder) => Effect.mapError(effect, () => unavailable(folder, "not-writable")),
  );

  /**
   * Makes a missing folder, and refuses one that holds files, so a new Graph mixes with nothing.
   * True when it made the folder.
   */
  const prepareEmpty = Effect.fn("GraphFolder.prepareEmpty")(function* (folder: string) {
    if ((yield* inspect(folder)) === "folder") {
      const entries = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
      if (entries.length > 0) return yield* unavailable(folder, "not-empty");
      return false;
    }
    yield* fs
      .makeDirectory(folder, { recursive: true })
      .pipe(Effect.mapError(() => unavailable(folder, "not-writable")));
    return true;
  });

  return {
    prepareEmpty,

    /** The Graph's settings now; a Graph without the file has every default. */
    settings: Effect.fn("GraphFolder.settings")(function* (folder: string) {
      const file = settingsFile(folder);
      if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return EMPTY;
      return yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decodeGraphSettings), Effect.mapError(storageError));
    }),

    /** Makes a new Graph in a folder that is missing or empty, so no existing files get mixed in. */
    create: Effect.fn("GraphFolder.create")(function* (folder: string) {
      yield* prepareEmpty(folder);
      return yield* writeSettings(folder, EMPTY);
    }),

    /**
     * Opens a folder that exists. A Graph keeps its own settings; any other folder (Markdown from
     * another editor, say) becomes a Graph as it is.
     */
    open: Effect.fn("GraphFolder.open")(function* (folder: string) {
      if ((yield* inspect(folder)) === "missing") return yield* unavailable(folder, "not-found");
      const file = settingsFile(folder);
      if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
        return yield* writeSettings(folder, EMPTY);
      }
      return yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decodeGraphSettings), Effect.mapError(storageError));
    }),
  };
};

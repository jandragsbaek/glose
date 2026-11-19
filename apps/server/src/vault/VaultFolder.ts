import { VaultFolderUnavailable, VaultSettings, StorageError } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { writeFileAtomic } from "../storage.ts";

export const GLOSE_DIR = ".glose";

const VaultSettingsJson = Schema.fromJsonString(VaultSettings);
const decodeVaultSettings = Schema.decodeUnknownEffect(VaultSettingsJson);
const encodeVaultSettings = Schema.encodeEffect(VaultSettingsJson);

const EMPTY: VaultSettings = {};

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = (fs: FileSystem.FileSystem, path: Path.Path) => {
  const settingsFile = (folder: string) => path.join(folder, GLOSE_DIR, "settings.json");

  const unavailable = (folder: string, reason: VaultFolderUnavailable["reason"]) =>
    new VaultFolderUnavailable({ path: folder, reason });

  const inspect = Effect.fn("VaultFolder.inspect")(function* (folder: string) {
    if (!path.isAbsolute(folder)) return yield* unavailable(folder, "not-absolute");
    if (!(yield* fs.exists(folder).pipe(Effect.mapError(storageError)))) return "missing";
    const info = yield* fs.stat(folder).pipe(Effect.mapError(storageError));
    if (info.type !== "Directory") return yield* unavailable(folder, "not-a-folder");
    return "folder";
  });

  const writeSettings = Effect.fn("VaultFolder.writeSettings")(
    function* (folder: string, settings: VaultSettings) {
      yield* fs.makeDirectory(path.join(folder, GLOSE_DIR), { recursive: true });
      yield* writeFileAtomic(fs, settingsFile(folder), yield* encodeVaultSettings(settings));
      return settings;
    },
    (effect, folder) => Effect.mapError(effect, () => unavailable(folder, "not-writable")),
  );

  const prepareEmpty = Effect.fn("VaultFolder.prepareEmpty")(function* (folder: string) {
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

    settings: Effect.fn("VaultFolder.settings")(function* (folder: string) {
      const file = settingsFile(folder);
      if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return EMPTY;
      return yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decodeVaultSettings), Effect.mapError(storageError));
    }),

    create: Effect.fn("VaultFolder.create")(function* (folder: string) {
      yield* prepareEmpty(folder);
      return yield* writeSettings(folder, EMPTY);
    }),

    open: Effect.fn("VaultFolder.open")(function* (folder: string) {
      if ((yield* inspect(folder)) === "missing") return yield* unavailable(folder, "not-found");
      const file = settingsFile(folder);
      if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
        return yield* writeSettings(folder, EMPTY);
      }
      return yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decodeVaultSettings), Effect.mapError(storageError));
    }),
  };
};

import {
  GraphFolderUnavailable,
  type Language,
  Settings as SettingsData,
  type SettingsView,
  StorageError,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as ServerConfig from "../config.ts";
import { writeFileAtomic } from "../storage.ts";

export class Settings extends Context.Service<
  Settings,
  {
    readonly get: Effect.Effect<SettingsView, StorageError>;
    readonly setLanguage: (language: Language) => Effect.Effect<SettingsView, StorageError>;
    /** Creates the Graph folder when it does not exist yet. */
    readonly completeSetup: (input: {
      readonly language: Language;
      readonly graphFolder: string;
    }) => Effect.Effect<SettingsView, GraphFolderUnavailable | StorageError>;
  }
>()("glose/Settings") {}

const SettingsJson = Schema.fromJsonString(SettingsData);
const decodeSettings = Schema.decodeUnknownEffect(SettingsJson);
const encodeSettings = Schema.encodeEffect(SettingsJson);

const EMPTY: SettingsData = { language: null, graphFolder: null };

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDir, homeDir } = yield* ServerConfig.ServerConfig;
  const file = path.join(dataDir, "settings.json");
  const suggestedGraphFolder = path.join(homeDir, "Glose");

  const read = Effect.gen(function* () {
    if (!(yield* fs.exists(file))) return EMPTY;
    return yield* decodeSettings(yield* fs.readFileString(file));
  }).pipe(Effect.mapError(storageError));

  const write = Effect.fn("Settings.write")(function* (settings: SettingsData) {
    yield* fs.makeDirectory(dataDir, { recursive: true });
    yield* writeFileAtomic(fs, file, yield* encodeSettings(settings));
  }, Effect.mapError(storageError));

  const view = (settings: SettingsData): SettingsView => ({ settings, suggestedGraphFolder });

  const ensureFolder = Effect.fn("Settings.ensureFolder")(function* (graphFolder: string) {
    const unavailable = (reason: GraphFolderUnavailable["reason"]) =>
      new GraphFolderUnavailable({ path: graphFolder, reason });
    if (!path.isAbsolute(graphFolder)) return yield* unavailable("not-absolute");
    const exists = yield* fs.exists(graphFolder).pipe(Effect.orElseSucceed(() => false));
    if (exists) {
      const info = yield* fs.stat(graphFolder).pipe(Effect.mapError(storageError));
      if (info.type !== "Directory") return yield* unavailable("not-a-folder");
      return;
    }
    yield* fs
      .makeDirectory(graphFolder, { recursive: true })
      .pipe(Effect.mapError(() => unavailable("cannot-create")));
  });

  return Settings.of({
    get: read.pipe(Effect.map(view)),
    setLanguage: Effect.fn("Settings.setLanguage")(function* (language) {
      const next = { ...(yield* read), language };
      yield* write(next);
      return view(next);
    }),
    completeSetup: Effect.fn("Settings.completeSetup")(function* ({ language, graphFolder }) {
      const folder = graphFolder.trim();
      yield* ensureFolder(folder);
      const next = { language, graphFolder: path.resolve(folder) };
      yield* write(next);
      return view(next);
    }),
  });
});

export const layer = Layer.effect(Settings, make);

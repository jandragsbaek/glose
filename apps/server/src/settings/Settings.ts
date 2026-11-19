import {
  type VaultFolderAction,
  type VaultFolderUnavailable,
  type Language,
  Settings as SettingsData,
  type SettingsView,
  SiteFolderUnavailable,
  StorageError,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as NodeCrypto from "node:crypto";

import * as ServerConfig from "../config.ts";
import * as VaultFolder from "../vault/VaultFolder.ts";
import { writeFileAtomic } from "../storage.ts";

export class Settings extends Context.Service<
  Settings,
  {
    readonly get: Effect.Effect<SettingsView, StorageError>;
    readonly computerId: Effect.Effect<string, StorageError>;
    readonly setLanguage: (language: Language) => Effect.Effect<SettingsView, StorageError>;
    readonly completeSetup: (input: {
      readonly language: Language;
      readonly vaultFolder: string;
      readonly action: Exclude<VaultFolderAction, "clone">;
    }) => Effect.Effect<SettingsView, VaultFolderUnavailable | StorageError>;
    readonly setSiteFolder: (
      siteFolder: string,
    ) => Effect.Effect<SettingsView, SiteFolderUnavailable | StorageError>;
  }
>()("glose/Settings") {}

const SettingsJson = Schema.fromJsonString(SettingsData);
const decodeSettings = Schema.decodeUnknownEffect(SettingsData);
const encodeSettings = Schema.encodeEffect(SettingsJson);

const fromGraphFolderKey = (json: unknown): unknown =>
  typeof json === "object" && json !== null && "graphFolder" in json && !("vaultFolder" in json)
    ? (({ graphFolder, ...rest }) => ({ ...rest, vaultFolder: graphFolder }))(json)
    : json;

const EMPTY: SettingsData = { language: null, vaultFolder: null };

const ComputerJson = Schema.fromJsonString(Schema.Struct({ id: Schema.String }));
const decodeComputer = Schema.decodeUnknownEffect(ComputerJson);
const encodeComputer = Schema.encodeEffect(ComputerJson);

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDir, homeDir } = yield* ServerConfig.ServerConfig;
  const file = path.join(dataDir, "settings.json");
  const suggestedVaultFolder = path.join(homeDir, "Glose");

  const read = Effect.gen(function* () {
    if (!(yield* fs.exists(file))) return EMPTY;
    const text = yield* fs.readFileString(file);
    const json = yield* Effect.try({
      try: (): unknown => JSON.parse(text),
      catch: (cause) => cause,
    });
    return yield* decodeSettings(fromGraphFolderKey(json));
  }).pipe(Effect.mapError(storageError));

  const write = Effect.fn("Settings.write")(function* (settings: SettingsData) {
    yield* fs.makeDirectory(dataDir, { recursive: true });
    yield* writeFileAtomic(fs, file, yield* encodeSettings(settings));
  }, Effect.mapError(storageError));

  const view = (settings: SettingsData): SettingsView => ({ settings, suggestedVaultFolder });

  const computerFile = path.join(dataDir, "computer.json");
  const computerId = Effect.gen(function* () {
    if (yield* fs.exists(computerFile)) {
      return (yield* decodeComputer(yield* fs.readFileString(computerFile))).id;
    }
    const id = NodeCrypto.randomBytes(4).toString("hex");
    yield* fs.makeDirectory(dataDir, { recursive: true });
    yield* writeFileAtomic(fs, computerFile, yield* encodeComputer({ id }));
    return id;
  }).pipe(Effect.mapError(storageError));

  const vaultFolders = VaultFolder.make(fs, path);

  return Settings.of({
    get: read.pipe(Effect.map(view)),
    computerId,
    setLanguage: Effect.fn("Settings.setLanguage")(function* (language) {
      const next = { ...(yield* read), language };
      yield* write(next);
      return view(next);
    }),
    completeSetup: Effect.fn("Settings.completeSetup")(function* ({
      language,
      vaultFolder,
      action,
    }) {
      const folder = vaultFolder.trim();
      yield* vaultFolders[action](folder);
      const next = { ...(yield* read), language, vaultFolder: path.resolve(folder) };
      yield* write(next);
      return view(next);
    }),
    setSiteFolder: Effect.fn("Settings.setSiteFolder")(function* (siteFolder) {
      const folder = siteFolder.trim();
      const unavailable = (reason: SiteFolderUnavailable["reason"]) =>
        new SiteFolderUnavailable({ path: folder, reason });
      if (!path.isAbsolute(folder)) return yield* unavailable("not-absolute");
      const isFolder = (target: string) =>
        fs.stat(target).pipe(
          Effect.map((info) => info.type === "Directory"),
          Effect.orElseSucceed(() => false),
        );
      if (!(yield* isFolder(folder))) return yield* unavailable("not-found");
      if (!(yield* isFolder(path.join(folder, "src")))) return yield* unavailable("not-bridgetown");
      const next = { ...(yield* read), siteFolder: path.resolve(folder) };
      yield* write(next);
      return view(next);
    }),
  });
});

export const layer = Layer.effect(Settings, make);

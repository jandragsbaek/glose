import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { layerServices, makeDirs } from "../testkit/services.ts";
import * as Settings from "./Settings.ts";

const onComputer = (dirs: { readonly dataDir: string; readonly homeDir: string }) =>
  Effect.provide(layerServices(dirs));

const completeSetup = (input: Parameters<Settings.Settings["Service"]["completeSetup"]>[0]) =>
  Settings.Settings.pipe(Effect.flatMap((settings) => settings.completeSetup(input)));

const readJson = (file: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fs) => fs.readFileString(file)),
    Effect.map((text): unknown => JSON.parse(text)),
  );

it.layer(NodeServices.layer)("Settings", (it) => {
  it.effect("starts unset and suggests a Glose folder in the home folder", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const path = yield* Path.Path;
      const view = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.get),
        onComputer(dirs),
      );
      assert.deepStrictEqual(view, {
        settings: { language: null, vaultFolder: null },
        suggestedVaultFolder: path.join(dirs.homeDir, "Glose"),
      });
    }).pipe(Effect.scoped),
  );

  it.effect("keeps the Vault of settings saved when it was the Graph folder", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dirs = yield* makeDirs;
      const vaultFolder = path.join(dirs.homeDir, "Glose");
      yield* fs.makeDirectory(dirs.dataDir, { recursive: true });
      yield* fs.writeFileString(
        path.join(dirs.dataDir, "settings.json"),
        JSON.stringify({ language: "da", graphFolder: vaultFolder }),
      );

      const view = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.setLanguage("en")),
        onComputer(dirs),
      );

      assert.deepStrictEqual(view.settings, { language: "en", vaultFolder });
      assert.deepStrictEqual(yield* readJson(path.join(dirs.dataDir, "settings.json")), {
        language: "en",
        vaultFolder,
      });
    }).pipe(Effect.scoped),
  );

  it.effect("creates a new Vault with hidden settings and keeps the setup across a restart", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const path = yield* Path.Path;
      const vaultFolder = path.join(dirs.homeDir, "Studier", "Glose");

      yield* completeSetup({ language: "da", vaultFolder, action: "create" }).pipe(
        onComputer(dirs),
      );
      const afterRestart = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.get),
        onComputer(dirs),
      );

      assert.deepStrictEqual(afterRestart.settings, { language: "da", vaultFolder });
      assert.deepStrictEqual(
        yield* readJson(path.join(vaultFolder, ".glose", "settings.json")),
        {},
      );
    }).pipe(Effect.scoped),
  );

  it.effect("opens a moved Vault on another computer with the settings it carries", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const first = yield* makeDirs;
      const second = yield* makeDirs;
      const created = path.join(first.homeDir, "Glose");
      const moved = path.join(second.homeDir, "Dropbox", "Glose");
      const carried = { fromNewerGlose: true };

      yield* completeSetup({ language: "en", vaultFolder: created, action: "create" }).pipe(
        onComputer(first),
      );
      yield* fs.writeFileString(
        path.join(created, ".glose", "settings.json"),
        JSON.stringify(carried),
      );
      yield* fs.makeDirectory(path.dirname(moved), { recursive: true });
      yield* fs.rename(created, moved);
      const view = yield* completeSetup({
        language: "da",
        vaultFolder: moved,
        action: "open",
      }).pipe(onComputer(second));

      assert.deepStrictEqual(view.settings, { language: "da", vaultFolder: moved });
      assert.deepStrictEqual(yield* readJson(path.join(moved, ".glose", "settings.json")), carried);
    }).pipe(Effect.scoped),
  );

  it.effect("opens a folder of Markdown from another editor as a Vault and keeps its files", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const vaultFolder = path.join(dirs.homeDir, "Notes");
      yield* fs.makeDirectory(vaultFolder);
      yield* fs.writeFileString(path.join(vaultFolder, "Labour.md"), "# Labour\n");

      yield* completeSetup({ language: "en", vaultFolder, action: "open" }).pipe(onComputer(dirs));

      assert.deepStrictEqual((yield* fs.readDirectory(vaultFolder)).toSorted(), [
        ".glose",
        "Labour.md",
      ]);
      assert.deepStrictEqual(
        yield* readJson(path.join(vaultFolder, ".glose", "settings.json")),
        {},
      );
    }).pipe(Effect.scoped),
  );

  it.effect("refuses folders that do not fit the action", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = path.join(dirs.homeDir, "notes.txt");
      const full = path.join(dirs.homeDir, "Documents");
      yield* fs.writeFileString(file, "");
      yield* fs.makeDirectory(full);
      yield* fs.writeFileString(path.join(full, "letter.md"), "");

      const cases = [
        { vaultFolder: "Glose", action: "create", reason: "not-absolute" },
        { vaultFolder: file, action: "create", reason: "not-a-folder" },
        { vaultFolder: full, action: "create", reason: "not-empty" },
        { vaultFolder: path.join(dirs.homeDir, "Missing"), action: "open", reason: "not-found" },
        { vaultFolder: file, action: "open", reason: "not-a-folder" },
      ] as const;
      const reasons = yield* Effect.forEach(cases, ({ vaultFolder, action }) =>
        completeSetup({ language: "en", vaultFolder, action }).pipe(
          Effect.flip,
          Effect.map((error) => (error._tag === "VaultFolderUnavailable" ? error.reason : error)),
          onComputer(dirs),
        ),
      );

      assert.deepStrictEqual<ReadonlyArray<unknown>>(
        reasons,
        cases.map(({ reason }) => reason),
      );
    }).pipe(Effect.scoped),
  );
});

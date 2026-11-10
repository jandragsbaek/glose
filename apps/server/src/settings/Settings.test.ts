import type { CompleteSetup } from "@glose/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { layerServices, makeDirs } from "../testkit/graph.ts";
import * as Settings from "./Settings.ts";

/** One computer: its own home and app data folder, with the real services over them. */
const onComputer = (dirs: { readonly dataDir: string; readonly homeDir: string }) =>
  Effect.provide(layerServices(dirs));

const completeSetup = (input: typeof CompleteSetup.Type) =>
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
        settings: { language: null, graphFolder: null },
        suggestedGraphFolder: path.join(dirs.homeDir, "Glose"),
      });
    }).pipe(Effect.scoped),
  );

  it.effect("creates a new Graph with hidden settings and keeps the setup across a restart", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const path = yield* Path.Path;
      const graphFolder = path.join(dirs.homeDir, "Studier", "Glose");

      yield* completeSetup({ language: "da", graphFolder, action: "create" }).pipe(
        onComputer(dirs),
      );
      const afterRestart = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.get),
        onComputer(dirs),
      );

      assert.deepStrictEqual(afterRestart.settings, { language: "da", graphFolder });
      assert.deepStrictEqual(
        yield* readJson(path.join(graphFolder, ".glose", "settings.json")),
        {},
      );
    }).pipe(Effect.scoped),
  );

  it.effect("opens a moved Graph on another computer with the settings it carries", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const first = yield* makeDirs;
      const second = yield* makeDirs;
      const created = path.join(first.homeDir, "Glose");
      const moved = path.join(second.homeDir, "Dropbox", "Glose");
      const carried = { fromNewerGlose: true };

      yield* completeSetup({ language: "en", graphFolder: created, action: "create" }).pipe(
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
        graphFolder: moved,
        action: "open",
      }).pipe(onComputer(second));

      assert.deepStrictEqual(view.settings, { language: "da", graphFolder: moved });
      assert.deepStrictEqual(yield* readJson(path.join(moved, ".glose", "settings.json")), carried);
    }).pipe(Effect.scoped),
  );

  it.effect("opens a folder of Markdown from another editor as a Graph and keeps its files", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const graphFolder = path.join(dirs.homeDir, "Notes");
      yield* fs.makeDirectory(graphFolder);
      yield* fs.writeFileString(path.join(graphFolder, "Labour.md"), "# Labour\n");

      yield* completeSetup({ language: "en", graphFolder, action: "open" }).pipe(onComputer(dirs));

      assert.deepStrictEqual((yield* fs.readDirectory(graphFolder)).toSorted(), [
        ".glose",
        "Labour.md",
      ]);
      assert.deepStrictEqual(
        yield* readJson(path.join(graphFolder, ".glose", "settings.json")),
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
        { graphFolder: "Glose", action: "create", reason: "not-absolute" },
        { graphFolder: file, action: "create", reason: "not-a-folder" },
        { graphFolder: full, action: "create", reason: "not-empty" },
        { graphFolder: path.join(dirs.homeDir, "Missing"), action: "open", reason: "not-found" },
        { graphFolder: file, action: "open", reason: "not-a-folder" },
      ] as const;
      const reasons = yield* Effect.forEach(cases, ({ graphFolder, action }) =>
        completeSetup({ language: "en", graphFolder, action }).pipe(
          Effect.flip,
          Effect.map((error) => (error._tag === "GraphFolderUnavailable" ? error.reason : error)),
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

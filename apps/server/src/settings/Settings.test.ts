import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { layerServices, makeDirs } from "../testkit/graph.ts";
import * as Settings from "./Settings.ts";

it.layer(NodeServices.layer)("Settings", (it) => {
  it.effect("starts unset and suggests a Glose folder in the home folder", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const path = yield* Path.Path;
      const view = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.get),
        Effect.provide(layerServices(dirs)),
      );
      assert.deepStrictEqual(view, {
        settings: { language: null, graphFolder: null },
        suggestedGraphFolder: path.join(dirs.homeDir, "Glose"),
      });
    }).pipe(Effect.scoped),
  );

  it.effect("creates the Graph folder and keeps the setup across a restart", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const graphFolder = path.join(dirs.homeDir, "Studier", "Glose");

      yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.completeSetup({ language: "da", graphFolder })),
        Effect.provide(layerServices(dirs)),
      );
      const afterRestart = yield* Settings.Settings.pipe(
        Effect.flatMap((settings) => settings.get),
        Effect.provide(layerServices(dirs)),
      );

      assert.deepStrictEqual(afterRestart.settings, { language: "da", graphFolder });
      assert.strictEqual((yield* fs.stat(graphFolder)).type, "Directory");
    }).pipe(Effect.scoped),
  );

  it.effect("refuses a relative path and a path that is a file", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = path.join(dirs.homeDir, "notes.txt");
      yield* fs.writeFileString(file, "");

      const reasons = yield* Effect.forEach(["Glose", file], (graphFolder) =>
        Settings.Settings.pipe(
          Effect.flatMap((settings) => settings.completeSetup({ language: "en", graphFolder })),
          Effect.flip,
          Effect.map((error) => (error._tag === "GraphFolderUnavailable" ? error.reason : error)),
          Effect.provide(layerServices(dirs)),
        ),
      );

      assert.deepStrictEqual(reasons, ["not-absolute", "not-a-folder"]);
    }).pipe(Effect.scoped),
  );
});

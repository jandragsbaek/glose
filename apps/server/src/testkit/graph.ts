import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as Server from "../server.ts";

/** A fresh home and app data folder per test, removed when the test's scope closes. */
export const makeDirs = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const homeDir = yield* fs.makeTempDirectoryScoped({ prefix: "glose-test-" });
  return { homeDir, dataDir: path.join(homeDir, "app-data") };
});

/** The real services over real files, as the server wires them. */
export const layerServices = (dirs: { readonly dataDir: string; readonly homeDir: string }) =>
  Server.layerServices.pipe(Layer.provide(ServerConfig.layerTest(dirs)));

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import * as Electron from "electron";

import * as Backend from "./backend/Backend.ts";
import * as Updates from "./updates/Updates.ts";
import * as MainWindow from "./window/MainWindow.ts";

const devServerUrl = process.env.GLOSE_DEV_SERVER_URL?.trim();

const program = Effect.gen(function* () {
  yield* Effect.promise(() => Electron.app.whenReady());
  const backend = yield* Backend.Backend;
  yield* MainWindow.open(backend.url);
  yield* Updates.start;
  // Electron ends the process on quit; until then the server and the update checks stay up.
  yield* Effect.never;
}).pipe(
  Effect.provide(devServerUrl ? Backend.layerDevServer(devServerUrl) : Backend.layerOwnServer),
  Effect.scoped,
);

// A second launch focuses the running window instead of starting a second server.
if (Electron.app.requestSingleInstanceLock()) {
  NodeRuntime.runMain(program);
} else {
  Electron.app.quit();
}

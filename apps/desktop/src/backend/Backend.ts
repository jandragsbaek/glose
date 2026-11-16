import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Electron from "electron";
import * as NodePath from "node:path";

import * as ServerProcess from "./ServerProcess.ts";

export class Backend extends Context.Service<
  Backend,
  {
    readonly url: string;
  }
>()("glose/desktop/Backend") {}

const resolveBuildRoot = () =>
  Electron.app.isPackaged ? process.resourcesPath : NodePath.join(Electron.app.getAppPath(), "..");

export const layerOwnServer = Layer.effect(
  Backend,
  Effect.gen(function* () {
    const root = resolveBuildRoot();
    const server = yield* ServerProcess.start({
      executablePath: process.execPath,
      entryPath: NodePath.join(root, "server", "dist", "bin.mjs"),
      env: {
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        GLOSE_WEB_DIST: NodePath.join(root, "web", "dist"),
        GLOSE_VERSION: Electron.app.getVersion(),
      },
      onUnexpectedExit: (code) => {
        Electron.dialog.showErrorBox(
          "Glose",
          `The local server stopped (exit code ${code ?? "unknown"}). Glose will close.`,
        );
        Electron.app.exit(1);
      },
    });
    Electron.app.once("will-quit", server.stop);
    return Backend.of({ url: server.url });
  }),
);

export const layerDevServer = (url: string) =>
  Layer.effect(
    Backend,
    ServerProcess.waitUntilHealthy(url, "/").pipe(Effect.as(Backend.of({ url }))),
  );

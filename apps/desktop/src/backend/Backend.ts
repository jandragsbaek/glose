import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Electron from "electron";
import * as NodePath from "node:path";

import * as ServerProcess from "./ServerProcess.ts";

/** The server the window talks to. */
export class Backend extends Context.Service<
  Backend,
  {
    /** Origin that serves the web app and its RPC. */
    readonly url: string;
  }
>()("glose/desktop/Backend") {}

/**
 * Installed, the server and the web app are extra resources next to app.asar. Run from
 * the repository, they are the build output of their own packages. Both use one layout.
 */
const resolveBuildRoot = () =>
  Electron.app.isPackaged ? process.resourcesPath : NodePath.join(Electron.app.getAppPath(), "..");

/** Starts the built server as a child of the app; it serves the built web app too. */
export const layerOwnServer = Layer.effect(
  Backend,
  Effect.gen(function* () {
    const root = resolveBuildRoot();
    const server = yield* ServerProcess.start({
      // Electron is the only Node on a user's machine.
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
    // Electron exits right after this event; the scope's finalizer would run too late.
    Electron.app.once("will-quit", server.stop);
    return Backend.of({ url: server.url });
  }),
);

/** In development `pnpm dev:desktop` already runs the server and Vite; wait for Vite, then use it. */
export const layerDevServer = (url: string) =>
  Layer.effect(
    Backend,
    // Vite has no health route; its index page answers once it is up.
    ServerProcess.waitUntilHealthy(url, "/").pipe(Effect.as(Backend.of({ url }))),
  );

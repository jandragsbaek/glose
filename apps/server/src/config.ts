import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

export class ServerConfig extends Context.Service<
  ServerConfig,
  {
    readonly host: string;
    readonly port: number;
    /** Built SPA to serve; unset in dev, where Vite serves it. */
    readonly webDistDir: Option.Option<string>;
    /** Where app settings live. The Graph itself lives in the folder the user picks. */
    readonly dataDir: string;
    readonly homeDir: string;
  }
>()("glose/ServerConfig") {}

/** The usual per-user app data folder of each OS, as Electron's `userData` would pick it. */
const defaultDataDir = (homeDir: string) => {
  switch (process.platform) {
    case "win32":
      return NodePath.join(
        process.env.APPDATA ?? NodePath.join(homeDir, "AppData", "Roaming"),
        "Glose",
      );
    case "darwin":
      return NodePath.join(homeDir, "Library", "Application Support", "Glose");
    default:
      return NodePath.join(
        process.env.XDG_CONFIG_HOME ?? NodePath.join(homeDir, ".config"),
        "Glose",
      );
  }
};

export const layer = Layer.effect(
  ServerConfig,
  Effect.gen(function* () {
    const homeDir = NodeOS.homedir();
    const config = yield* Config.all({
      host: Config.String("GLOSE_HOST").pipe(Config.withDefault("127.0.0.1")),
      port: Config.Port("GLOSE_PORT").pipe(Config.withDefault(4310)),
      webDistDir: Config.String("GLOSE_WEB_DIST").pipe(Config.option),
      dataDir: Config.String("GLOSE_DATA_DIR").pipe(Config.withDefault(defaultDataDir(homeDir))),
    });
    return ServerConfig.of({ ...config, homeDir });
  }),
);

export const layerTest = (dirs: { readonly dataDir: string; readonly homeDir: string }) =>
  Layer.succeed(
    ServerConfig,
    ServerConfig.of({ host: "127.0.0.1", port: 0, webDistDir: Option.none(), ...dirs }),
  );

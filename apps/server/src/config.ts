import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

export class ServerConfig extends Context.Service<
  ServerConfig,
  {
    readonly host: string;
    readonly port: number;
    /** Built SPA to serve; unset in dev, where Vite serves it. */
    readonly webDistDir: Option.Option<string>;
  }
>()("glose/ServerConfig") {}

export const layer = Layer.effect(
  ServerConfig,
  Effect.gen(function* () {
    const config = yield* Config.all({
      host: Config.String("GLOSE_HOST").pipe(Config.withDefault("127.0.0.1")),
      port: Config.Port("GLOSE_PORT").pipe(Config.withDefault(4310)),
      webDistDir: Config.String("GLOSE_WEB_DIST").pipe(Config.option),
    });
    return ServerConfig.of(config);
  }),
);

export const layerTest = Layer.succeed(
  ServerConfig,
  ServerConfig.of({ host: "127.0.0.1", port: 0, webDistDir: Option.none() }),
);

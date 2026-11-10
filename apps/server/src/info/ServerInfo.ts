import type { ServerInfo as ServerInfoData } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import packageJson from "../../package.json" with { type: "json" };

export class ServerInfo extends Context.Service<
  ServerInfo,
  {
    readonly get: Effect.Effect<ServerInfoData>;
  }
>()("glose/ServerInfo") {}

export const make = (version: string) =>
  ServerInfo.of({
    get: Effect.succeed({ version }),
  });

/** The desktop app passes its own version, so the window and the installer agree. */
export const layer = Layer.succeed(
  ServerInfo,
  make(process.env.GLOSE_VERSION ?? packageJson.version),
);

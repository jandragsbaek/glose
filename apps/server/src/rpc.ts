import { GloseRpcGroup, RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";

import * as ServerInfo from "./info/ServerInfo.ts";

/** Thin transport: RpcServer decodes the payload, the handler calls one service method. */
export const layer = GloseRpcGroup.toLayer(
  Effect.gen(function* () {
    const info = yield* ServerInfo.ServerInfo;
    return GloseRpcGroup.of({
      [RPC_METHODS.serverInfo]: () => info.get,
    });
  }),
);

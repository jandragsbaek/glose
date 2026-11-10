import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";

import { ServerInfo } from "./server.ts";

export const RPC_METHODS = {
  serverInfo: "server.info",
} as const;

export const RPC_PATH = "/rpc";

/** Plain HTTP, outside RPC: answers once the server accepts requests. */
export const HEALTH_PATH = "/health";

const ServerInfoRpc = Rpc.make(RPC_METHODS.serverInfo, {
  success: ServerInfo,
});

export const GloseRpcGroup = RpcGroup.make(ServerInfoRpc);

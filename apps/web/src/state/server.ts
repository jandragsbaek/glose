import { RPC_METHODS } from "@glose/contracts";

import { GloseClient } from "../rpc/client.ts";

export const serverInfoAtom = GloseClient.query(RPC_METHODS.serverInfo, undefined);

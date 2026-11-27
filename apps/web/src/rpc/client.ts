import { GloseRpcGroup, RPC_PATH } from "@glose/contracts";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as AtomRpc from "effect/reactivity/AtomRpc";
import * as RpcClient from "effect/rpc/RpcClient";
import * as RpcSerialization from "effect/rpc/RpcSerialization";

import { linearNdjson } from "./ndjson.ts";

const LONGEST_RESPONSE_LINE = 256 * 1024 * 1024;

export class GloseClient extends AtomRpc.Service<GloseClient>()("GloseClient", {
  group: GloseRpcGroup,
  protocol: RpcClient.layerProtocolHttp({
    url: new URL(RPC_PATH, window.location.origin).toString(),
  }).pipe(
    Layer.provide([
      FetchHttpClient.layer,
      Layer.succeed(RpcSerialization.RpcSerialization)(linearNdjson(LONGEST_RESPONSE_LINE)),
    ]),
  ),
}) {}

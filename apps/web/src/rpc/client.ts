import { GloseRpcGroup, RPC_PATH } from "@glose/contracts";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as AtomRpc from "effect/reactivity/AtomRpc";
import * as RpcClient from "effect/rpc/RpcClient";
import * as RpcSerialization from "effect/rpc/RpcSerialization";

/** Typed client for the server's RpcGroup, exposed as atoms (queries) and atom functions (mutations). */
export class GloseClient extends AtomRpc.Service<GloseClient>()("GloseClient", {
  group: GloseRpcGroup,
  protocol: RpcClient.layerProtocolHttp({
    url: new URL(RPC_PATH, window.location.origin).toString(),
  }).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson])),
}) {}

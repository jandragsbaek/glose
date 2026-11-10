import { GloseRpcGroup, HEALTH_PATH, RPC_METHODS, RPC_PATH } from "@glose/contracts";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import * as Layer from "effect/Layer";
import * as RpcClient from "effect/rpc/RpcClient";
import * as RpcSerialization from "effect/rpc/RpcSerialization";

import * as ServerConfig from "./config.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as Server from "./server.ts";
import { layerServices, makeDirs } from "./testkit/graph.ts";

// The real routes on a real socket: the same encoding, routing and decoding the web app uses.
const layerServer = Layer.unwrap(
  Effect.map(makeDirs, (dirs) =>
    HttpRouter.serve(Server.layerRoutes).pipe(
      Layer.provide(Layer.succeed(ServerInfo.ServerInfo, ServerInfo.make("1.2.3"))),
      Layer.provide(layerServices(dirs)),
      Layer.provide(ServerConfig.layerTest(dirs)),
      Layer.provideMerge(NodeHttpServer.layerTest),
    ),
  ),
).pipe(Layer.provide(NodeServices.layer));

// As in the web app: an absolute URL, fetch, and the same serialization as the server.
const layerClient = Layer.unwrap(
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer;
    const origin = HttpServer.formatAddress(server.address);
    return RpcClient.layerProtocolHttp({ url: new URL(RPC_PATH, origin).toString() });
  }),
).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));

it.layer(layerClient.pipe(Layer.provideMerge(layerServer)))("server", (it) => {
  it.effect("answers server.info over RPC", () =>
    Effect.gen(function* () {
      const client = yield* RpcClient.make(GloseRpcGroup);
      assert.deepStrictEqual(yield* client[RPC_METHODS.serverInfo](), { version: "1.2.3" });
    }),
  );

  it.effect("sends a typed error when the Graph folder is not set up", () =>
    Effect.gen(function* () {
      const client = yield* RpcClient.make(GloseRpcGroup);
      const error = yield* client[RPC_METHODS.sourcesList]().pipe(Effect.flip);
      assert.strictEqual(error._tag, "GraphFolderNotSet");
    }),
  );

  it.effect("answers the health check the desktop app waits for", () =>
    Effect.gen(function* () {
      const response = yield* HttpClient.get(HEALTH_PATH);
      assert.strictEqual(response.status, 200);
    }),
  );
});

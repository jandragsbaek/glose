import { GloseRpcGroup, HEALTH_PATH, RPC_PATH } from "@glose/contracts";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as HttpStaticServer from "effect/http/HttpStaticServer";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as RpcSerialization from "effect/rpc/RpcSerialization";
import * as RpcServer from "effect/rpc/RpcServer";
import * as NodeHttp from "node:http";

import * as ServerConfig from "./config.ts";
import * as Sources from "./graph/Sources.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as Rpc from "./rpc.ts";
import * as Settings from "./settings/Settings.ts";

/** Newline-delimited JSON, so a streamed reply reaches the client as it happens. */
const layerRpcRoute = RpcServer.layerHttp({
  group: GloseRpcGroup,
  path: RPC_PATH,
  protocol: "http",
}).pipe(Layer.provide(Rpc.layer), Layer.provide(RpcSerialization.layerNdjson));

/** The desktop app polls this before it opens a window. */
const layerHealthRoute = HttpRouter.add("GET", HEALTH_PATH, HttpServerResponse.text("ok"));

/** In production the server also serves the built SPA, so one origin hosts everything. */
const layerSpaRoute = Layer.unwrap(
  Effect.gen(function* () {
    const { webDistDir } = yield* ServerConfig.ServerConfig;
    return Option.match(webDistDir, {
      onNone: () => Layer.empty,
      onSome: (root) => HttpStaticServer.layer({ root, spa: true }),
    });
  }),
);

const layerHttpServer = Layer.unwrap(
  Effect.gen(function* () {
    const { host, port } = yield* ServerConfig.ServerConfig;
    return NodeHttpServer.layer(() => NodeHttp.createServer(), { host, port });
  }),
);

/** The app's services over the files on disk; they need ServerConfig. */
export const layerServices = Sources.layer.pipe(
  Layer.provideMerge(Settings.layer),
  Layer.provide(NodeServices.layer),
);

/** Every route, still waiting for an HTTP server; the test serves these on a random port. */
export const layerRoutes = Layer.mergeAll(layerRpcRoute, layerHealthRoute, layerSpaRoute);

export const layer = HttpRouter.serve(layerRoutes).pipe(
  Layer.provide(ServerInfo.layer),
  Layer.provide(layerServices),
  Layer.provide(layerHttpServer),
  Layer.provide(ServerConfig.layer),
);

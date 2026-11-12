import { GloseRpcGroup, HEALTH_PATH, RPC_PATH } from "@glose/contracts";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as HttpStaticServer from "effect/http/HttpStaticServer";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as RpcSerialization from "effect/rpc/RpcSerialization";
import * as RpcServer from "effect/rpc/RpcServer";
import * as NodeHttp from "node:http";

import * as CardChecks from "./cards/CardChecks.ts";
import * as Cards from "./cards/Cards.ts";
import * as Catalog from "./catalog/Catalog.ts";
import * as ChatGpt from "./chatgpt/ChatGpt.ts";
import * as Credentials from "./chatgpt/Credentials.ts";
import * as Responses from "./chatgpt/Responses.ts";
import * as ServerConfig from "./config.ts";
import * as Graph from "./graph/Graph.ts";
import * as Notes from "./graph/Notes.ts";
import * as Sources from "./graph/Sources.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as Recall from "./recall/Recall.ts";
import * as Rpc from "./rpc.ts";
import * as Sessions from "./sessions/Sessions.ts";
import * as Settings from "./settings/Settings.ts";
import * as GitHub from "./github/GitHub.ts";
import * as Git from "./versions/Git.ts";
import * as Versions from "./versions/Versions.ts";

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

const layerChatGpt = ChatGpt.layer.pipe(Layer.provide([ChatGpt.layerCrypto, Credentials.layer]));

/**
 * The app's services over the files on disk, ChatGPT and the Catalog. They still need ServerConfig, an
 * HttpClient, OpenAI's signing keys and the platform; a test supplies fakes for OpenAI.
 */
export const layerApp = Sessions.layer.pipe(
  Layer.provideMerge(CardChecks.layer),
  Layer.provideMerge(
    Layer.mergeAll(
      layerChatGpt,
      Responses.layer,
      Catalog.layer,
      Recall.layer,
      Versions.layer.pipe(Layer.provide(Git.layer), Layer.provideMerge(GitHub.layer)),
    ),
  ),
  Layer.provideMerge(Layer.mergeAll(Sources.layer, Graph.layer, Notes.layer, Cards.layer)),
  Layer.provideMerge(Settings.layer),
);

/** OpenAI's signing keys come only from the configured URL, never from a redirect. */
const layerFetchNoRedirects = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" })),
);

/** The app's services against the real OpenAI; they need ServerConfig. */
export const layerServices = layerApp.pipe(
  Layer.provide([
    ChatGpt.layerJwks.pipe(Layer.provide(layerFetchNoRedirects)),
    FetchHttpClient.layer,
    NodeServices.layer,
  ]),
);

/** Every route, still waiting for an HTTP server; the test serves these on a random port. */
export const layerRoutes = Layer.mergeAll(layerRpcRoute, layerHealthRoute, layerSpaRoute);

/**
 * The services are built before the port opens, and the Versions runner starts with them. A request that reached the port first would
 * find no handler yet and hang, and the desktop app's first health check could be that request.
 */
export const layer = HttpRouter.serve(layerRoutes).pipe(
  Layer.merge(Versions.layerRunner),
  Layer.provide(ServerInfo.layer),
  Layer.provide(layerHttpServer),
  Layer.provide(layerServices),
  Layer.provide(ServerConfig.layer),
);

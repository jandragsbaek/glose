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
import * as Videos from "./catalog/Videos.ts";
import * as ChatGpt from "./chatgpt/ChatGpt.ts";
import * as Credentials from "./chatgpt/Credentials.ts";
import * as Responses from "./chatgpt/Responses.ts";
import * as ServerConfig from "./config.ts";
import * as CourseVideoRoutes from "./vault/courseVideoRoutes.ts";
import * as Graph from "./vault/Graph.ts";
import * as Notes from "./vault/Notes.ts";
import * as Passages from "./vault/Passages.ts";
import * as Sources from "./vault/Sources.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as WebPages from "./research/WebPages.ts";
import * as Recall from "./recall/Recall.ts";
import * as Rpc from "./rpc.ts";
import * as Sessions from "./sessions/Sessions.ts";
import * as Settings from "./settings/Settings.ts";
import * as Setup from "./settings/Setup.ts";
import * as GitHub from "./github/GitHub.ts";
import * as Git from "./versions/Git.ts";
import * as Versions from "./versions/Versions.ts";
import * as Writing from "./writing/Writing.ts";

const layerRpcRoute = RpcServer.layerHttp({
  group: GloseRpcGroup,
  path: RPC_PATH,
  protocol: "http",
}).pipe(Layer.provide(Rpc.layer), Layer.provide(RpcSerialization.layerNdjson));

const layerHealthRoute = HttpRouter.add("GET", HEALTH_PATH, HttpServerResponse.text("ok"));

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

export const layerAppWith = (webPages: Layer.Layer<WebPages.WebPages>) =>
  Layer.mergeAll(Sessions.layer, Writing.layer).pipe(
    Layer.provideMerge(CardChecks.layer),
    Layer.provideMerge(
      Layer.mergeAll(
        layerChatGpt,
        Responses.layer,
        Catalog.layer,
        Videos.layer,
        Recall.layer,
        webPages,
        Layer.mergeAll(Versions.layer, Setup.layer).pipe(
          Layer.provide(Git.layer),
          Layer.provideMerge(GitHub.layer),
        ),
      ),
    ),
    Layer.provideMerge(Passages.layer),
    Layer.provideMerge(Layer.mergeAll(Sources.layer, Graph.layer, Notes.layer, Cards.layer)),
    Layer.provideMerge(Settings.layer),
  );

export const layerApp = layerAppWith(WebPages.layer);

const layerFetchNoRedirects = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" })),
);

export const layerServices = layerApp.pipe(
  Layer.provide([
    ChatGpt.layerJwks.pipe(Layer.provide(layerFetchNoRedirects)),
    FetchHttpClient.layer,
    NodeServices.layer,
  ]),
);

export const layerRoutes = Layer.mergeAll(
  layerRpcRoute,
  layerHealthRoute,
  CourseVideoRoutes.layer,
  layerSpaRoute,
);

export const layer = HttpRouter.serve(layerRoutes).pipe(
  Layer.merge(Versions.layerRunner),
  Layer.provide(ServerInfo.layer),
  Layer.provide(layerHttpServer),
  Layer.provide(layerServices),
  Layer.provide(ServerConfig.layer),
);

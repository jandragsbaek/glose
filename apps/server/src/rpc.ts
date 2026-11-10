import { GloseRpcGroup, RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";

import * as Sources from "./graph/Sources.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as Settings from "./settings/Settings.ts";

/** Thin transport: RpcServer decodes the payload, the handler calls one service method. */
export const layer = GloseRpcGroup.toLayer(
  Effect.gen(function* () {
    const info = yield* ServerInfo.ServerInfo;
    const settings = yield* Settings.Settings;
    const sources = yield* Sources.Sources;
    return GloseRpcGroup.of({
      [RPC_METHODS.serverInfo]: () => info.get,
      [RPC_METHODS.settingsGet]: () => settings.get,
      [RPC_METHODS.settingsSetLanguage]: ({ language }) => settings.setLanguage(language),
      [RPC_METHODS.setupComplete]: (input) => settings.completeSetup(input),
      [RPC_METHODS.sourcesList]: () => sources.list,
      [RPC_METHODS.sourcesGet]: ({ id }) => sources.get(id),
      [RPC_METHODS.sourcesCreate]: (details) => sources.create(details),
      [RPC_METHODS.sourcesSaveFreeText]: (input) => sources.saveFreeText(input),
    });
  }),
);

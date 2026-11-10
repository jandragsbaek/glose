import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

import { ServerInfo } from "./server.ts";
import {
  CompleteSetup,
  GraphFolderNotSet,
  GraphFolderUnavailable,
  Language,
  SettingsView,
  StorageError,
} from "./settings.ts";
import {
  SaveFreeText,
  Source,
  SourceDetails,
  SourceNameTaken,
  SourceNotFound,
  SourceRef,
} from "./source.ts";

export const RPC_METHODS = {
  serverInfo: "server.info",
  settingsGet: "settings.get",
  settingsSetLanguage: "settings.setLanguage",
  setupComplete: "setup.complete",
  sourcesList: "sources.list",
  sourcesGet: "sources.get",
  sourcesCreate: "sources.create",
  sourcesSaveFreeText: "sources.saveFreeText",
} as const;

export const RPC_PATH = "/rpc";

/** Plain HTTP, outside RPC: answers once the server accepts requests. */
export const HEALTH_PATH = "/health";

const GraphErrors = Schema.Union([GraphFolderNotSet, StorageError]);

export const GloseRpcGroup = RpcGroup.make(
  Rpc.make(RPC_METHODS.serverInfo, { success: ServerInfo }),
  Rpc.make(RPC_METHODS.settingsGet, { success: SettingsView, error: StorageError }),
  Rpc.make(RPC_METHODS.settingsSetLanguage, {
    payload: { language: Language },
    success: SettingsView,
    error: StorageError,
  }),
  Rpc.make(RPC_METHODS.setupComplete, {
    payload: CompleteSetup,
    success: SettingsView,
    error: Schema.Union([GraphFolderUnavailable, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sourcesList, { success: Schema.Array(Source), error: GraphErrors }),
  Rpc.make(RPC_METHODS.sourcesGet, {
    payload: SourceRef,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sourcesCreate, {
    payload: SourceDetails,
    success: Source,
    error: Schema.Union([SourceNameTaken, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sourcesSaveFreeText, {
    payload: SaveFreeText,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
);

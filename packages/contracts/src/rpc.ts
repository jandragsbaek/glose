import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

import { CatalogRecord, CatalogSearch, CatalogUnavailable } from "./catalog.ts";
import { ChatGptStatus, ConnectChatGpt, DisconnectResult } from "./chatgpt.ts";
import { GraphView } from "./graph.ts";
import { ServerInfo } from "./server.ts";
import {
  FindSession,
  SendMessage,
  Session,
  SessionBusy,
  SessionNotFound,
  SessionRef,
} from "./session.ts";
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
  graphRead: "graph.read",
  catalogSearch: "catalog.search",
  chatgptWatch: "chatgpt.watch",
  chatgptConnect: "chatgpt.connect",
  chatgptCancel: "chatgpt.cancel",
  chatgptDisconnect: "chatgpt.disconnect",
  chatgptDismissPlanNotice: "chatgpt.dismissPlanNotice",
  sessionsFind: "sessions.find",
  sessionsStart: "sessions.start",
  sessionsWatch: "sessions.watch",
  sessionsSend: "sessions.send",
  sessionsRetry: "sessions.retry",
  sessionsStop: "sessions.stop",
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
  Rpc.make(RPC_METHODS.graphRead, { success: GraphView, error: GraphErrors }),
  /** Works in the Catalog that match the search, best match first. */
  Rpc.make(RPC_METHODS.catalogSearch, {
    payload: CatalogSearch,
    success: Schema.Array(CatalogRecord),
    error: CatalogUnavailable,
  }),
  /** The current status, then every change to it. */
  Rpc.make(RPC_METHODS.chatgptWatch, { success: ChatGptStatus, stream: true }),
  /** Starts a sign-in in the browser; the status follows it. */
  Rpc.make(RPC_METHODS.chatgptConnect, { payload: ConnectChatGpt, error: StorageError }),
  Rpc.make(RPC_METHODS.chatgptCancel),
  Rpc.make(RPC_METHODS.chatgptDisconnect, { success: DisconnectResult, error: StorageError }),
  Rpc.make(RPC_METHODS.chatgptDismissPlanNotice, { error: StorageError }),
  /** The latest Session of a kind for a Source, or null when there is none. */
  Rpc.make(RPC_METHODS.sessionsFind, {
    payload: FindSession,
    success: Schema.NullOr(Session),
    error: GraphErrors,
  }),
  /** Starts a Session; the AI takes the first turn at once. */
  Rpc.make(RPC_METHODS.sessionsStart, {
    payload: FindSession,
    success: Session,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** The Session now, then every change to it, including the AI's answer as it arrives. */
  Rpc.make(RPC_METHODS.sessionsWatch, {
    payload: SessionRef,
    success: Session,
    error: Schema.Union([SessionNotFound, GraphFolderNotSet, StorageError]),
    stream: true,
  }),
  Rpc.make(RPC_METHODS.sessionsSend, {
    payload: SendMessage,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Runs the last turn again after a problem. */
  Rpc.make(RPC_METHODS.sessionsRetry, {
    payload: SessionRef,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Stops the AI's current turn; what it already said stays. */
  Rpc.make(RPC_METHODS.sessionsStop, { payload: SessionRef }),
);

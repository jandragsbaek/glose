import { GloseRpcGroup, RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";

import * as CardChecks from "./cards/CardChecks.ts";
import * as Cards from "./cards/Cards.ts";
import * as Catalog from "./catalog/Catalog.ts";
import * as ChatGpt from "./chatgpt/ChatGpt.ts";
import * as Graph from "./graph/Graph.ts";
import * as Sources from "./graph/Sources.ts";
import * as ServerInfo from "./info/ServerInfo.ts";
import * as Recall from "./recall/Recall.ts";
import * as Sessions from "./sessions/Sessions.ts";
import * as Settings from "./settings/Settings.ts";
import * as Versions from "./versions/Versions.ts";

/** Thin transport: RpcServer decodes the payload, the handler calls one service method. */
export const layer = GloseRpcGroup.toLayer(
  Effect.gen(function* () {
    const info = yield* ServerInfo.ServerInfo;
    const settings = yield* Settings.Settings;
    const sources = yield* Sources.Sources;
    const graph = yield* Graph.Graph;
    const catalog = yield* Catalog.Catalog;
    const chatGpt = yield* ChatGpt.ChatGpt;
    const sessions = yield* Sessions.Sessions;
    const cards = yield* Cards.Cards;
    const checks = yield* CardChecks.CardChecks;
    const recall = yield* Recall.Recall;
    const versions = yield* Versions.Versions;
    return GloseRpcGroup.of({
      [RPC_METHODS.serverInfo]: () => info.get,
      [RPC_METHODS.settingsGet]: () => settings.get,
      [RPC_METHODS.settingsSetLanguage]: ({ language }) => settings.setLanguage(language),
      [RPC_METHODS.setupComplete]: (input) => settings.completeSetup(input),
      [RPC_METHODS.sourcesList]: () => sources.list,
      [RPC_METHODS.sourcesGet]: ({ id }) => sources.get(id),
      [RPC_METHODS.sourcesCreate]: (details) => sources.create(details),
      [RPC_METHODS.sourcesSaveFreeText]: (input) => sources.saveFreeText(input),
      [RPC_METHODS.graphRead]: () => graph.read,
      [RPC_METHODS.catalogSearch]: ({ query }) => catalog.search(query),
      [RPC_METHODS.chatgptWatch]: () => chatGpt.status,
      [RPC_METHODS.chatgptConnect]: (input) => chatGpt.connect(input),
      [RPC_METHODS.chatgptCancel]: () => chatGpt.cancel,
      [RPC_METHODS.chatgptDisconnect]: () => chatGpt.disconnect,
      [RPC_METHODS.chatgptDismissPlanNotice]: () => chatGpt.dismissPlanNotice,
      [RPC_METHODS.sessionsFind]: (input) => sessions.find(input),
      [RPC_METHODS.sessionsStart]: (input) => sessions.start(input),
      [RPC_METHODS.sessionsWatch]: ({ id }) => sessions.watch(id),
      [RPC_METHODS.sessionsSend]: (input) => sessions.send(input),
      [RPC_METHODS.sessionsRetry]: ({ id }) => sessions.retry(id),
      [RPC_METHODS.sessionsStop]: ({ id }) => sessions.stop(id),
      [RPC_METHODS.sessionsSendPassage]: (input) => sessions.sendPassage(input),
      [RPC_METHODS.sessionsKeepProposal]: (input) => sessions.keepProposal(input),
      [RPC_METHODS.sessionsDropProposal]: (input) => sessions.dropProposal(input),
      [RPC_METHODS.sessionsKeepPoint]: (input) => sessions.keepPoint(input),
      [RPC_METHODS.sessionsDropPoint]: (input) => sessions.dropPoint(input),
      [RPC_METHODS.sessionsRestorePoint]: (input) => sessions.restorePoint(input),
      [RPC_METHODS.sessionsAddPoint]: (input) => sessions.addPoint(input),
      [RPC_METHODS.sessionsWritePoint]: (input) => sessions.writePoint(input),
      [RPC_METHODS.cardsList]: () => cards.list.pipe(Effect.flatMap(checks.score)),
      [RPC_METHODS.cardsJudge]: ({ files }) => checks.judgeFiles(files),
      [RPC_METHODS.cardsCreate]: (input) => cards.create({ ...input, ai: false }),
      [RPC_METHODS.cardsUpdate]: (input) => cards.update(input),
      [RPC_METHODS.cardsClearAiMark]: ({ file }) => cards.clearAiMark(file),
      [RPC_METHODS.cardsDelete]: ({ file }) => cards.remove(file),
      [RPC_METHODS.recallQueue]: () => recall.queue,
      [RPC_METHODS.recallReview]: (input) => recall.review(input),
      [RPC_METHODS.versionsWatch]: () => versions.status,
      [RPC_METHODS.versionsEndDay]: (input) => versions.endDay(input),
    });
  }),
);

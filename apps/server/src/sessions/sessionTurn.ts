import {
  linkKey,
  type Session,
  SessionBusy,
  type SessionEntry,
  type SessionProblem,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";
import * as FiberMap from "effect/FiberMap";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as Cards from "../cards/Cards.ts";
import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses, type ResponsesError } from "../chatgpt/Responses.ts";
import * as Graph from "../vault/Graph.ts";
import * as Sources from "../vault/Sources.ts";
import * as WebPages from "../research/WebPages.ts";
import { type InputItem, runTurn, type WebSearch } from "./agent.ts";
import * as CardExtraction from "./cardExtraction.ts";
import type { CardJudging } from "./cardJudging.ts";
import * as Extraction from "./extraction.ts";
import { addPoints, changeNumbered, type Live, patch } from "./liveSession.ts";
import * as Probe from "./probe.ts";
import * as Research from "./research.ts";
import * as ResearchLinks from "./researchLinks.ts";
import { pointsOf } from "./sessionEntries.ts";
import type { SessionStore } from "./sessionStore.ts";

const problemOf = (error: ResponsesError): SessionProblem => {
  switch (error.code) {
    case "subscription_sharing_usage_limit_exceeded":
      return "usage-limit";
    case "subscription_sharing_user_not_eligible":
      return "not-eligible";
    case "subscription_sharing_invalid_user":
      return "not-connected";
    case "subscription_sharing_usage_unavailable":
    case "subscription_sharing_user_unavailable":
      return "unavailable";
  }
  if (error.status === 429) return "usage-limit";
  if (error.status === 401) return "not-connected";
  if (error.status === null || error.status >= 500) return "unavailable";
  return "failed";
};

export const make = Effect.fn("Sessions.makeSessionTurn")(function* ({
  live,
  turns,
  save,
  readRecords,
  propose,
}: {
  readonly live: ReadonlyMap<string, Live>;
  readonly turns: FiberMap.FiberMap<string>;
  readonly save: SessionStore["save"];
  readonly readRecords: SessionStore["readRecords"];
  readonly propose: CardJudging["propose"];
}) {
  const sources = yield* Sources.Sources;
  const graph = yield* Graph.Graph;
  const cards = yield* Cards.Cards;
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;
  const webPages = yield* WebPages.WebPages;
  let summaries = true;

  const probeOf = (subject: string) =>
    readRecords.pipe(
      Effect.flatMap((records) => {
        const [latest] = records
          .filter(
            (record) => record.kind === "probe" && linkKey(record.subject) === linkKey(subject),
          )
          .sort((a, b) => b.created - a.created);
        if (latest === undefined) return Effect.succeed(null);
        const running = live.get(latest.id);
        return running === undefined
          ? Effect.succeed(latest.entries)
          : SubscriptionRef.get(running.view).pipe(Effect.map((view) => view.entries));
      }),
      Effect.orElseSucceed(() => null),
    );

  const appendEntries = (session: Live, entries: ReadonlyArray<SessionEntry>) =>
    SubscriptionRef.modify(session.view, (view) => {
      const before = view.entries.length;
      return [before, { ...view, entries: [...view.entries, ...entries] }];
    });

  const researchRules = (session: Live, entries: ReadonlyArray<SessionEntry>) => {
    const webSearch: WebSearch | null = entries.some((entry) => entry._tag === "WebSearchOff")
      ? null
      : {
          onRefused: patch(session, (view) => ({
            ...view,
            entries: [...view.entries, { _tag: "WebSearchOff" }],
          })).pipe(Effect.as([Research.webSearchOffMessage])),
        };
    const known = Research.knownAddresses(session.items);
    return {
      instructions: Research.INSTRUCTIONS,
      webSearch,
      maxRounds: Research.MAX_ROUNDS,
      onOutput: (output: ReadonlyArray<unknown>) => Research.addKnown(known, output),
      tools: Research.tools({
        known: (url) => Research.isKnown(known, url),
        remember: (url) => Research.addAddress(known, url),
        webPages,
        sources: sources.list.pipe(Effect.orElseSucceed(() => [])),
        articleText: (id) => sources.articleText(id).pipe(Effect.orElseSucceed(() => null)),
        pages: SubscriptionRef.get(session.view).pipe(
          Effect.map((view) => Research.pagesOf(view.entries)),
        ),
        propose: (proposed) =>
          SubscriptionRef.modify(session.view, (view) => {
            const before = Research.pagesOf(view.entries).length;
            const pages = proposed.map((page, index) => ({
              ...page,
              id: `w${before + index + 1}`,
              state: "open" as const,
            }));
            return [
              pages.map((page) => page.id),
              { ...view, entries: [...view.entries, { _tag: "FoundPages" as const, pages }] },
            ];
          }),
      }),
    };
  };

  const findLinks = Effect.fn("Sessions.findLinks")(function* (
    session: Live,
    token: Redacted.Redacted<string>,
    model: string,
  ) {
    const { entries } = yield* SubscriptionRef.get(session.view);
    const view = yield* graph.read.pipe(Effect.orElseSucceed(() => null));
    if (view === null || !view.nodes.some((node) => node.kind === "note")) return;
    yield* runTurn({
      token,
      model,
      instructions: ResearchLinks.LINK_INSTRUCTIONS,
      tools: ResearchLinks.linkTools({
        graph,
        proposeLinks: (links) =>
          appendEntries(session, [{ _tag: "ResearchLinks", links }]).pipe(Effect.asVoid),
      }),
      items: [ResearchLinks.linksKickoff(entries)],
      onDelta: () => Effect.void,
      onEntry: (entry) =>
        entry._tag === "ToolUse"
          ? patch(session, (view) => ({ ...view, entries: [...view.entries, entry] }))
          : Effect.void,
      onItems: () => Effect.void,
      summaries: false,
      onSummariesRefused: Effect.void,
    }).pipe(
      Effect.provideService(Responses, responses),
      Effect.catch((error) => Effect.logWarning("Finding Links for a new Note failed", error)),
    );
  });

  const rulesOf = (session: Live, { kind, subject, entries }: Session) => {
    switch (kind) {
      case "note-research":
        return researchRules(session, entries);
      case "extraction":
        return {
          instructions: Extraction.INSTRUCTIONS,
          tools: Extraction.tools({
            sources,
            graph,
            source: subject,
            points: SubscriptionRef.get(session.view).pipe(
              Effect.map((view) => pointsOf(view.entries)),
            ),
            propose: (proposed) =>
              addPoints(
                session,
                proposed.map((point) => ({ ...point, state: "open" as const, note: null })),
              ).pipe(Effect.map((points) => points.map(Extraction.numberOf))),
            addLinks: (number, links) =>
              changeNumbered(session, number, ["open", "kept"], (point) => {
                const known = new Set(point.links.map((link) => linkKey(link.note)));
                const fresh = links.filter((link) => !known.has(linkKey(link.note)));
                return {
                  ...point,
                  links: [...point.links, ...fresh].slice(0, Extraction.MAX_LINKS),
                };
              }),
            setDraft: (number, text) =>
              changeNumbered(session, number, ["open", "kept"], (point) => ({
                ...point,
                state: "kept",
                draft: text,
              })),
            probe: probeOf(subject),
            probeSummary: Probe.forExtraction,
            probeWords: Probe.userWords,
          }),
          webSearch: null,
        };
      case "probe":
        return {
          instructions: Probe.INSTRUCTIONS,
          tools: Probe.tools({
            sources,
            graph,
            source: subject,
            update: (change) =>
              SubscriptionRef.modify(session.view, (view) => {
                const [result, entries] = change(view.entries);
                return [result, { ...view, entries }];
              }),
          }),
          webSearch: null,
        };
      case "card-extraction":
        return {
          instructions: CardExtraction.INSTRUCTIONS,
          tools: CardExtraction.tools({ graph, cards, note: subject, propose: propose(session) }),
          webSearch: null,
        };
    }
  };

  const runSessionTurn = Effect.fn("Sessions.runTurn")(
    function* (session: Live) {
      const before = yield* SubscriptionRef.get(session.view);
      const rules = rulesOf(session, before);
      const token = yield* chatGpt.accessToken;
      const [model] = yield* responses.models(token);
      if (model === undefined) return yield* Effect.fail("no-model" as const);
      yield* patch(session, (view) => ({ ...view, model: model.slug }));
      yield* runTurn({
        token,
        model: model.slug,
        ...rules,
        items: session.items,
        onDelta: (delta) => patch(session, (view) => ({ ...view, draft: view.draft + delta })),
        onEntry: (entry) =>
          patch(session, (view) => ({
            ...view,
            entries: [...view.entries, entry],
            draft: entry._tag === "AiMessage" ? "" : view.draft,
          })),
        onItems: (items) =>
          Effect.suspend(() => {
            session.items = items;
            return save(session).pipe(Effect.ignore);
          }),
        summaries,
        onSummariesRefused: Effect.sync(() => {
          summaries = false;
        }),
      }).pipe(Effect.provideService(Responses, responses));
      const after = yield* SubscriptionRef.get(session.view);
      if (
        after.kind === "note-research" &&
        (Research.pagesOf(after.entries).length > Research.pagesOf(before.entries).length ||
          (Research.linksOf(after.entries).length === 0 &&
            before.entries.at(-1)?._tag === "ResearchStart"))
      ) {
        yield* findLinks(session, token, model.slug);
      }
    },
    (effect, session) =>
      effect.pipe(
        Effect.catch((error) => {
          const problem: SessionProblem =
            error === "no-model"
              ? "not-eligible"
              : error._tag === "ChatGptUnavailable"
                ? error.reason === "unavailable"
                  ? "unavailable"
                  : error.reason
                : problemOf(error);
          return Effect.logWarning("Session turn failed", error).pipe(
            Effect.andThen(patch(session, (view) => ({ ...view, problem }))),
          );
        }),
        Effect.ensuring(
          Effect.gen(function* () {
            const { draft } = yield* SubscriptionRef.get(session.view);
            if (draft !== "") {
              session.items = [
                ...session.items,
                {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: draft }],
                },
              ];
            }
            yield* patch(session, (view) => ({
              ...view,
              entries:
                draft === "" ? view.entries : [...view.entries, { _tag: "AiMessage", text: draft }],
              working: false,
              draft: "",
            }));
            yield* save(session);
          }).pipe(Effect.ignore),
        ),
      ),
  );

  const beginTurn = Effect.fn("Sessions.beginTurn")(function* (
    session: Live,
    entries: ReadonlyArray<SessionEntry>,
    items: ReadonlyArray<InputItem>,
  ) {
    const started = yield* SubscriptionRef.modify(session.view, (view) =>
      view.working
        ? [false, view]
        : [
            true,
            {
              ...view,
              working: true,
              problem: null,
              draft: "",
              entries: [...view.entries, ...entries],
            },
          ],
    );
    const { id } = yield* SubscriptionRef.get(session.view);
    if (!started) return yield* new SessionBusy({ id });
    const { kind } = yield* SubscriptionRef.get(session.view);
    const decisions =
      session.decisions.length === 0
        ? []
        : [
            kind === "extraction"
              ? Extraction.decisionsMessage(session.decisions)
              : kind === "note-research"
                ? Research.decisionsMessage(session.decisions)
                : CardExtraction.decisionsMessage(session.decisions),
          ];
    session.decisions = [];
    session.items = [...session.items, ...decisions, ...items];
    yield* save(session);
    yield* FiberMap.run(turns, id, runSessionTurn(session));
  });

  return { beginTurn };
});

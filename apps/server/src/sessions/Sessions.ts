import {
  NoteNotFound,
  type Card,
  type NoteNameTaken,
  openQuestion,
  type PointNotFound,
  type ProposalNotOpen,
  QuestionNotOpen,
  linkKey,
  type Session,
  SessionBusy,
  type SessionKind,
  type SessionNotFound,
  type SourceNotFound,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as NodeCrypto from "node:crypto";

import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import * as Graph from "../graph/Graph.ts";
import * as Sources from "../graph/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import * as CardDecisions from "./cardDecisions.ts";
import * as CardExtraction from "./cardExtraction.ts";
import * as CardJudging from "./cardJudging.ts";
import * as Extraction from "./extraction.ts";
import type { Live } from "./liveSession.ts";
import * as PointDecisions from "./pointDecisions.ts";
import * as Probe from "./probe.ts";
import { pointsOf } from "./sessionEntries.ts";
import { type GraphError, type SessionRecord, viewOf } from "./sessionRecord.ts";
import * as SessionStore from "./sessionStore.ts";
import * as SessionTurn from "./sessionTurn.ts";

export class Sessions extends Context.Service<
  Sessions,
  {
    readonly find: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
    }) => Effect.Effect<Session | null, GraphError>;
    readonly start: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
      readonly passage?: string;
    }) => Effect.Effect<Session, SourceNotFound | NoteNotFound | GraphError>;
    readonly watch: (id: string) => Stream.Stream<Session, SessionNotFound | GraphError>;
    readonly send: (input: {
      readonly id: string;
      readonly text: string;
      readonly about?: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly retry: (id: string) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly stop: (id: string) => Effect.Effect<void>;
    readonly sendPassage: (input: {
      readonly id: string;
      readonly passage: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly keepProposal: (input: {
      readonly id: string;
      readonly proposal: string;
      readonly question: string;
      readonly answer: string;
    }) => Effect.Effect<Card, SessionNotFound | ProposalNotOpen | GraphError>;
    readonly dropProposal: (input: {
      readonly id: string;
      readonly proposal: string;
    }) => Effect.Effect<void, SessionNotFound | ProposalNotOpen | GraphError>;
    readonly keepPoint: (
      input: PointDecisions.PointInput & { readonly title: string },
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    readonly dropPoint: (
      input: PointDecisions.PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    readonly restorePoint: (
      input: PointDecisions.PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    readonly addPoint: (input: {
      readonly id: string;
      readonly title: string;
    }) => Effect.Effect<void, SessionNotFound | GraphError>;
    readonly writePoint: (
      input: PointDecisions.PointInput & {
        readonly title: string;
        readonly text: string;
        readonly aiText: boolean;
        readonly page: string | null;
        readonly links: ReadonlyArray<string>;
      },
    ) => Effect.Effect<string, SessionNotFound | PointNotFound | NoteNameTaken | GraphError>;
    readonly answerProbe: (input: {
      readonly id: string;
      readonly question: number;
      readonly reasoning: string;
      readonly answer: string;
      readonly teachMe: boolean;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | QuestionNotOpen | GraphError>;
    readonly finishProbe: (
      id: string,
    ) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
  }
>()("glose/sessions/Sessions") {}

export const make = Effect.gen(function* () {
  const settings = yield* Settings.Settings;
  const sources = yield* Sources.Sources;
  const graph = yield* Graph.Graph;
  const chatGpt = yield* ChatGpt.ChatGpt;

  const live = new Map<string, Live>();
  const loading = yield* Semaphore.make(1);
  const deciding = yield* Semaphore.make(1);
  const turns = yield* FiberMap.make<string>();
  yield* chatGpt.beforeSignOut(FiberMap.clear(turns));

  const { save, readRecords, readRecord } = yield* SessionStore.make;
  const { propose, pendingProposals } = yield* CardJudging.make({ turns, save });
  const { beginTurn } = yield* SessionTurn.make({ live, turns, save, readRecords, propose });

  const adopt = Effect.fn("Sessions.adopt")(function* (record: SessionRecord) {
    const existing = live.get(record.id);
    if (existing) {
      yield* pendingProposals(existing, ["off", "failed"]);
      return existing;
    }
    const session: Live = {
      view: yield* SubscriptionRef.make(viewOf(record)),
      items: record.items,
      decisions: [...(record.decisions ?? [])],
    };
    live.set(record.id, session);
    yield* pendingProposals(session, ["pending", "off", "failed"]);
    return session;
  });

  const load = Effect.fn("Sessions.load")(
    function* (id: string) {
      const existing = live.get(id);
      if (existing) return existing;
      return yield* adopt(yield* readRecord(id));
    },
    (effect) => loading.withPermit(effect),
  );

  const cardDecisions = yield* CardDecisions.make({ load, save, deciding });
  const pointDecisions = yield* PointDecisions.make({ load, save, deciding });

  const subjectOf = Effect.fn("Sessions.subjectOf")(function* (kind: SessionKind, name: string) {
    switch (kind) {
      case "extraction":
      case "probe":
        return (yield* sources.get(name)).id;
      case "card-extraction": {
        const view = yield* graph.read;
        const node = view.nodes.find((other) => linkKey(other.id) === linkKey(name));
        if (node === undefined) return yield* new NoteNotFound({ id: name });
        return node.id;
      }
    }
  });

  return Sessions.of({
    find: Effect.fn("Sessions.find")(function* ({ kind, subject }) {
      const [latest] = (yield* readRecords)
        .filter((record) => record.kind === kind && linkKey(record.subject) === linkKey(subject))
        .sort((a, b) => b.created - a.created);
      if (latest === undefined) return null;
      return yield* SubscriptionRef.get((yield* adopt(latest)).view);
    }),

    start: Effect.fn("Sessions.start")(function* ({ kind, subject: asked, passage }) {
      const subject = yield* subjectOf(kind, asked);
      const { language } = (yield* settings.get).settings;
      const created = yield* Clock.currentTimeMillis;
      const stamp = new Date(created).toISOString().replace(/[:.]/g, "-");
      const record: SessionRecord = {
        version: 2,
        id: `${stamp}-${NodeCrypto.randomBytes(3).toString("hex")}`,
        kind,
        subject,
        model: null,
        created,
        entries: [],
        items: [],
      };
      const session = yield* adopt(record);
      const opening =
        kind === "extraction"
          ? { entries: [], items: [Extraction.kickoff(language ?? "en")] }
          : kind === "probe"
            ? {
                entries: [],
                items: [
                  Probe.kickoff(
                    language ?? "en",
                    (yield* sources.get(subject)).readingStart ?? "write",
                  ),
                ],
              }
            : {
                entries: passage === undefined ? [] : [{ _tag: "Passage" as const, text: passage }],
                items: [
                  CardExtraction.kickoff(subject, language ?? "en"),
                  ...(passage === undefined ? [] : [CardExtraction.passageMessage(passage)]),
                ],
              };
      yield* beginTurn(session, opening.entries, opening.items).pipe(
        Effect.catchTags({ SessionBusy: () => Effect.void }),
      );
      return yield* SubscriptionRef.get(session.view);
    }),

    watch: (id) =>
      Stream.unwrap(Effect.map(load(id), (session) => SubscriptionRef.changes(session.view))),

    send: Effect.fn("Sessions.send")(function* ({ id, text, about }) {
      const session = yield* load(id);
      const view = yield* SubscriptionRef.get(session.view);
      const point = pointsOf(view.entries).find((other) => other.id === about);
      yield* beginTurn(
        session,
        [{ _tag: "UserMessage", text, ...(point === undefined ? {} : { about: point.id }) }],
        [
          {
            type: "message",
            role: "user",
            content: point === undefined ? text : Extraction.aboutMessage(point, text),
          },
        ],
      );
    }),

    retry: Effect.fn("Sessions.retry")(function* (id) {
      yield* beginTurn(yield* load(id), [], []);
    }),

    stop: (id) => FiberMap.remove(turns, id),

    sendPassage: Effect.fn("Sessions.sendPassage")(function* ({ id, passage }) {
      yield* beginTurn(
        yield* load(id),
        [{ _tag: "Passage", text: passage }],
        [CardExtraction.passageMessage(passage)],
      );
    }),

    ...cardDecisions,

    ...pointDecisions,

    answerProbe: Effect.fn("Sessions.answerProbe")(
      function* ({ id, question, reasoning, answer, teachMe }) {
        const session = yield* load(id);
        const view = yield* SubscriptionRef.get(session.view);
        const open = view.kind === "probe" ? openQuestion(view.entries) : null;
        if (open === null || open.number !== question || (!teachMe && answer === "")) {
          return yield* new QuestionNotOpen({ id, question });
        }
        const entry = { _tag: "ProbeAnswer" as const, question, reasoning, answer, teachMe };
        yield* beginTurn(
          session,
          [entry],
          [{ type: "message", role: "user", content: Probe.answerMessage(entry) }],
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    finishProbe: Effect.fn("Sessions.finishProbe")(
      function* (id) {
        const session = yield* load(id);
        const at = yield* Clock.currentTimeMillis;
        const finished = yield* SubscriptionRef.modify(session.view, (view) => {
          if (view.working) return ["busy" as const, view];
          if (view.entries.some((entry) => entry._tag === "ProbeFinished")) {
            return ["already" as const, view];
          }
          return [
            "now" as const,
            {
              ...view,
              problem: null,
              entries: [...view.entries, { _tag: "ProbeFinished" as const, at }],
            },
          ];
        });
        if (finished === "busy") return yield* new SessionBusy({ id });
        if (finished === "now") yield* save(session);
      },
      (effect) => deciding.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Sessions, make);

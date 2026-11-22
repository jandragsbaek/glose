import {
  type BookPassageNotFound,
  isDraftId,
  NoteNotFound,
  parseArticle,
  PassageRefused,
  type Card,
  type Confidence,
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
import * as Graph from "../vault/Graph.ts";
import * as Sources from "../vault/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import * as PassagePoints from "./passagePoints.ts";
import * as CardDecisions from "./cardDecisions.ts";
import * as CardExtraction from "./cardExtraction.ts";
import * as CardJudging from "./cardJudging.ts";
import * as Extraction from "./extraction.ts";
import { type Live, patch } from "./liveSession.ts";
import * as PageDecisions from "./pageDecisions.ts";
import * as PointDecisions from "./pointDecisions.ts";
import * as Probe from "./probe.ts";
import * as ProbeAnswers from "./probeAnswers.ts";
import * as ReadingReset from "./readingReset.ts";
import { pointsOf } from "./sessionEntries.ts";
import { type VaultError, type SessionRecord, viewOf } from "./sessionRecord.ts";
import * as SessionStore from "./sessionStore.ts";
import * as SessionTurn from "./sessionTurn.ts";

export class Sessions extends Context.Service<
  Sessions,
  {
    readonly find: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
    }) => Effect.Effect<Session | null, VaultError>;
    readonly start: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
      readonly passage?: string;
    }) => Effect.Effect<Session, SourceNotFound | NoteNotFound | VaultError>;
    readonly watch: (id: string) => Stream.Stream<Session, SessionNotFound | VaultError>;
    readonly send: (input: {
      readonly id: string;
      readonly text: string;
      readonly about?: string;
      readonly judgment?: number;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | VaultError>;
    readonly retry: (id: string) => Effect.Effect<void, SessionNotFound | SessionBusy | VaultError>;
    readonly stop: (id: string) => Effect.Effect<void>;
    readonly sendPassage: (input: {
      readonly id: string;
      readonly passage: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | VaultError>;
    readonly keepProposal: (input: {
      readonly id: string;
      readonly proposal: string;
      readonly question: string;
      readonly answer: string;
    }) => Effect.Effect<Card, SessionNotFound | ProposalNotOpen | VaultError>;
    readonly dropProposal: (input: {
      readonly id: string;
      readonly proposal: string;
    }) => Effect.Effect<void, SessionNotFound | ProposalNotOpen | VaultError>;
    readonly keepPoint: (
      input: PointDecisions.PointInput & { readonly title: string },
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | VaultError>;
    readonly dropPoint: (
      input: PointDecisions.PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | VaultError>;
    readonly restorePoint: (
      input: PointDecisions.PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | VaultError>;
    readonly addPoint: (input: {
      readonly id: string;
      readonly title: string;
    }) => Effect.Effect<void, SessionNotFound | VaultError>;
    readonly writePoint: (
      input: PointDecisions.PointInput & {
        readonly title: string;
        readonly text: string;
        readonly aiText: boolean;
        readonly page: string | null;
        readonly links: ReadonlyArray<string>;
      },
    ) => Effect.Effect<string, SessionNotFound | PointNotFound | NoteNameTaken | VaultError>;
    readonly answerProbe: (input: {
      readonly id: string;
      readonly question: number;
      readonly reasoning: string;
      readonly answer: string;
      readonly teachMe: boolean;
      readonly choice?: ReadonlyArray<number>;
      readonly confidence?: Confidence;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | QuestionNotOpen | VaultError>;
    readonly askHint: (input: {
      readonly id: string;
      readonly question: number;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | QuestionNotOpen | VaultError>;
    readonly finishProbe: (
      id: string,
    ) => Effect.Effect<void, SessionNotFound | SessionBusy | VaultError>;
    readonly goDeeper: (input: {
      readonly source: string;
      readonly passage: string;
    }) => Effect.Effect<
      Session,
      SourceNotFound | PassageRefused | SessionNotFound | SessionBusy | VaultError
    >;
    readonly continueProbe: (
      id: string,
    ) => Effect.Effect<void, SessionNotFound | SessionBusy | VaultError>;
    readonly addPassagePoint: (input: {
      readonly source: string;
      readonly passage: string;
      readonly title: string;
    }) => Effect.Effect<void, SourceNotFound | PassageRefused | VaultError>;
    readonly setAsideSource: (source: string) => Effect.Effect<void, VaultError>;
    readonly forgetSource: (source: string) => Effect.Effect<void, VaultError>;
    readonly setAsideCount: (source: string) => Effect.Effect<number, VaultError>;
    readonly addBookPassagesPoint: (input: {
      readonly source: string;
      readonly passages: ReadonlyArray<string>;
      readonly title: string;
    }) => Effect.Effect<
      { readonly session: string; readonly point: string },
      SourceNotFound | BookPassageNotFound | VaultError
    >;
  } & PageDecisions.PageDecisions
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

  const store = yield* SessionStore.make;
  const { save, readRecords, readRecord } = store;
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
      case "note-research":
        return isDraftId(name) ? name : yield* new NoteNotFound({ id: name });
    }
  });

  const latestRecord = Effect.fn("Sessions.latestRecord")(function* (
    kind: SessionKind,
    subject: string,
  ) {
    const [latest] = (yield* readRecords)
      .filter((record) => record.kind === kind && linkKey(record.subject) === linkKey(subject))
      .sort((a, b) => b.created - a.created);
    return latest ?? null;
  });

  const newSession = Effect.fn("Sessions.newSession")(function* (
    kind: SessionKind,
    subject: string,
  ) {
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
    return yield* adopt(record);
  });

  const readingReset = ReadingReset.make({ live, turns, deciding, store });
  const probeAnswers = ProbeAnswers.make({ load, save, deciding, beginTurn });

  const pageDecisions = yield* PageDecisions.make({
    load,
    save,
    deciding,
    beginTurn,
    open: (subject) =>
      Effect.flatMap(latestRecord("note-research", subject), (existing) =>
        existing === null ? newSession("note-research", subject) : adopt(existing),
      ),
  });

  const passageOf = Effect.fn("Sessions.passageOf")(function* (source: string, id: string) {
    const article = parseArticle(yield* sources.articleText(source));
    const passage = article.passages.find((other) => other.id === id);
    if (passage === undefined) return yield* new PassageRefused({ reason: "not-found" });
    return passage;
  });

  const passagePoints = yield* PassagePoints.make({
    open: (source) =>
      Effect.flatMap(latestRecord("extraction", source), (existing) =>
        existing === null ? newSession("extraction", source) : adopt(existing),
      ),
    save,
    deciding,
    passageOf,
  });

  return Sessions.of({
    find: Effect.fn("Sessions.find")(function* ({ kind, subject }) {
      const latest = yield* latestRecord(kind, subject);
      if (latest === null) return null;
      return yield* SubscriptionRef.get((yield* adopt(latest)).view);
    }),

    start: Effect.fn("Sessions.start")(function* ({ kind, subject: asked, passage }) {
      const subject = yield* subjectOf(kind, asked);
      const { language } = (yield* settings.get).settings;
      if (kind === "extraction") {
        const waiting = yield* latestRecord(kind, subject);
        if (waiting !== null && !waiting.items.some(Extraction.isKickoff)) {
          const session = yield* adopt(waiting);
          yield* beginTurn(session, [], [Extraction.kickoff(language ?? "en")]).pipe(
            Effect.catchTags({ SessionBusy: () => Effect.void }),
          );
          yield* patch(session, (view) => ({
            ...view,
            started: session.items.some(Extraction.isKickoff),
          }));
          return yield* SubscriptionRef.get(session.view);
        }
      }
      if (kind === "note-research") return yield* new NoteNotFound({ id: subject });
      const session = yield* newSession(kind, subject);
      const source = kind === "card-extraction" ? null : yield* sources.get(subject);
      const opening =
        kind === "extraction"
          ? { entries: [], items: [Extraction.kickoff(language ?? "en")] }
          : kind === "probe"
            ? {
                entries: [],
                items: [
                  Probe.kickoff(
                    language ?? "en",
                    source?.readingStart ?? "write",
                    source?.kind ?? "book",
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
      if (kind === "extraction") yield* patch(session, (view) => ({ ...view, started: true }));
      return yield* SubscriptionRef.get(session.view);
    }),

    watch: (id) =>
      Stream.unwrap(Effect.map(load(id), (session) => SubscriptionRef.changes(session.view))),

    send: Effect.fn("Sessions.send")(function* ({ id, text, about, judgment }) {
      const session = yield* load(id);
      const view = yield* SubscriptionRef.get(session.view);
      const point = pointsOf(view.entries).find((other) => other.id === about);
      const judged =
        view.kind === "probe" &&
        judgment !== undefined &&
        view.entries.some((entry) => entry._tag === "ProbeJudgment" && entry.question === judgment)
          ? judgment
          : null;
      const open = view.kind === "probe" && judged === null ? openQuestion(view.entries) : null;
      const question = judged ?? open?.number ?? null;
      yield* beginTurn(
        session,
        [
          {
            _tag: "UserMessage",
            text,
            ...(point === undefined ? {} : { about: point.id }),
            ...(question === null ? {} : { question }),
          },
        ],
        [
          {
            type: "message",
            role: "user",
            content:
              point !== undefined
                ? Extraction.aboutMessage(point, text)
                : judged !== null
                  ? Probe.judgmentMessage(judged, text, openQuestion(view.entries)?.number ?? null)
                  : open !== null
                    ? Probe.openMessage(open.number, text)
                    : text,
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

    ...pageDecisions,

    ...probeAnswers,

    goDeeper: Effect.fn("Sessions.goDeeper")(function* ({ source: asked, passage: id }) {
      const source = yield* sources.get(asked);
      const passage = yield* passageOf(source.id, id);
      const { language } = (yield* settings.get).settings;
      const existing = yield* latestRecord("probe", source.id);
      const session =
        existing === null ? yield* newSession("probe", source.id) : yield* adopt(existing);
      const view = yield* SubscriptionRef.get(session.view);
      if (view.working) return yield* new SessionBusy({ id: view.id });
      const focus = { _tag: "ProbeFocus" as const, paragraph: passage.n, text: passage.text };
      if (openQuestion(view.entries) !== null) return yield* new SessionBusy({ id: view.id });
      yield* beginTurn(
        session,
        [focus],
        [
          ...(existing === null ? [Probe.readingKickoff(language ?? "en")] : []),
          {
            type: "message",
            role: "user",
            content: Probe.focusMessage({
              paragraph: passage.n,
              text: passage.text,
              words: passage.words,
            }),
          },
        ],
      );
      return yield* SubscriptionRef.get(session.view);
    }),

    continueProbe: Effect.fn("Sessions.continueProbe")(function* (id) {
      yield* beginTurn(
        yield* load(id),
        [{ _tag: "ProbeFocusDone", paragraph: 0 }],
        [Probe.continueMessage],
      );
    }),

    addPassagePoint: passagePoints.addPassagePoint,

    ...readingReset,

    addBookPassagesPoint: passagePoints.addBookPassagesPoint,
  });
});

export const layer = Layer.effect(Sessions, make);

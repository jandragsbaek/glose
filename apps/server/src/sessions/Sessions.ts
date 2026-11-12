import {
  type Card,
  type CardProposal,
  type CardText,
  type Check,
  GraphFolderNotSet,
  type JudgeState,
  linkKey,
  type NoteNameTaken,
  NoteNotFound,
  type Point,
  PointNotFound,
  type PointState,
  ProposalNotOpen,
  RULE_CHECKS,
  ruleChecks,
  scoreOf,
  type Session,
  SessionBusy,
  SessionEntry,
  type SessionKind,
  SessionKind as SessionKindSchema,
  SessionNotFound,
  type SessionProblem,
  type SourceNotFound,
  StorageError,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as NodeCrypto from "node:crypto";

import * as CardChecks from "../cards/CardChecks.ts";
import * as Cards from "../cards/Cards.ts";
import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses, type ResponsesError } from "../chatgpt/Responses.ts";
import { isFileName } from "../graph/fileName.ts";
import * as Graph from "../graph/Graph.ts";
import * as Notes from "../graph/Notes.ts";
import { GLOSE_DIR } from "../graph/GraphFolder.ts";
import * as Sources from "../graph/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { type InputItem, runTurn } from "./agent.ts";
import * as CardExtraction from "./cardExtraction.ts";
import * as Extraction from "./extraction.ts";

type GraphError = GraphFolderNotSet | StorageError;

export class Sessions extends Context.Service<
  Sessions,
  {
    readonly find: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
    }) => Effect.Effect<Session | null, GraphError>;
    /** Makes a Session and starts the AI's first turn in the background. */
    readonly start: (input: {
      readonly kind: SessionKind;
      readonly subject: string;
      readonly passage?: string;
    }) => Effect.Effect<Session, SourceNotFound | NoteNotFound | GraphError>;
    readonly watch: (id: string) => Stream.Stream<Session, SessionNotFound | GraphError>;
    readonly send: (input: {
      readonly id: string;
      readonly text: string;
      /** The Point the message is about. */
      readonly about?: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly retry: (id: string) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly stop: (id: string) => Effect.Effect<void>;
    /** Card Extraction from another passage of the Note. */
    readonly sendPassage: (input: {
      readonly id: string;
      readonly passage: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    /** Saves a proposed Card, as the user changed it, as an AI-written Card. */
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
    /** Keeps a proposed Point to write, with the user's words for it. */
    readonly keepPoint: (
      input: PointInput & { readonly title: string },
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    readonly dropPoint: (
      input: PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    readonly restorePoint: (
      input: PointInput,
    ) => Effect.Effect<void, SessionNotFound | PointNotFound | GraphError>;
    /** A Point in the user's own words, kept to write. */
    readonly addPoint: (input: {
      readonly id: string;
      readonly title: string;
    }) => Effect.Effect<void, SessionNotFound | GraphError>;
    /** Writes a kept Point as a Note file; answers with the Note's name. */
    readonly writePoint: (
      input: PointInput & {
        readonly title: string;
        readonly text: string;
        readonly page: string | null;
        readonly links: ReadonlyArray<string>;
        readonly useDraft: boolean;
      },
    ) => Effect.Effect<string, SessionNotFound | PointNotFound | NoteNameTaken | GraphError>;
  }
>()("glose/sessions/Sessions") {}

interface PointInput {
  readonly id: string;
  readonly point: string;
}

/**
 * A Session as kept in the Graph folder, in `.glose/sessions/<id>.json`: what the user saw
 * (`entries`) and the exact model input (`items`) that the next turn continues from.
 */
const SessionRecord = Schema.Struct({
  version: Schema.Literal(2),
  id: Schema.String,
  kind: SessionKindSchema,
  subject: Schema.String,
  model: Schema.NullOr(Schema.String),
  created: Schema.Number,
  entries: Schema.Array(SessionEntry),
  items: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
  /** Decisions on proposed Cards that the next turn has yet to tell the AI. */
  decisions: Schema.optionalKey(Schema.Array(Schema.String)),
});
type SessionRecord = typeof SessionRecord.Type;

const RecordJson = Schema.fromJsonString(SessionRecord);
const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));
const decodeRecordFields = Schema.decodeUnknownEffect(SessionRecord);
const encodeRecord = Schema.encodeEffect(RecordJson);

/** Version 1 named the Session's file `sourceId`, when only Sources had Sessions. */
const upgrade = (json: unknown): unknown => {
  if (typeof json !== "object" || json === null || !("version" in json)) return json;
  if (json.version !== 1 || !("sourceId" in json)) return json;
  const { sourceId, ...rest } = json;
  return { ...rest, version: 2, subject: sourceId };
};

const decodeRecord = (text: string) =>
  decodeJson(text).pipe(Effect.map(upgrade), Effect.flatMap(decodeRecordFields));

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

/** What happened to a turn, as the user will read it. */
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

interface Live {
  readonly view: SubscriptionRef.SubscriptionRef<Session>;
  /** The model input so far; it grows with each completed model call. */
  items: ReadonlyArray<InputItem>;
  /** What the user did with proposed Cards since the last turn; the next turn tells the AI. */
  decisions: Array<string>;
}

const proposalsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.flatMap((entry) => (entry._tag === "CardProposals" ? entry.proposals : []));

/** Changes one proposal in the Session's entries, wherever it is. */
const setProposal = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: Partial<CardProposal>,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "CardProposals" && entry.proposals.some((proposal) => proposal.id === id)
      ? {
          ...entry,
          proposals: entry.proposals.map((proposal) =>
            proposal.id === id ? { ...proposal, ...change } : proposal,
          ),
        }
      : entry,
  );

/** Changes one proposal in the Session's entries from what it is now. */
const mapProposal = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: (proposal: CardProposal) => CardProposal,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "CardProposals" && entry.proposals.some((proposal) => proposal.id === id)
      ? {
          ...entry,
          proposals: entry.proposals.map((proposal) =>
            proposal.id === id ? change(proposal) : proposal,
          ),
        }
      : entry,
  );

const pointsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.flatMap((entry) => (entry._tag === "Points" ? entry.points : []));

/** Changes one Point in the Session's entries, wherever it is. */
const mapPoint = (
  entries: ReadonlyArray<SessionEntry>,
  id: string,
  change: (point: Point) => Point,
): ReadonlyArray<SessionEntry> =>
  entries.map((entry) =>
    entry._tag === "Points" && entry.points.some((point) => point.id === id)
      ? { ...entry, points: entry.points.map((point) => (point.id === id ? change(point) : point)) }
      : entry,
  );

/** A Point in the AI's words: its number and title. */
const pointName = (point: Point) => `point ${Extraction.numberOf(point)} "${point.title}"`;

const isRuleCheck = (check: Check) => (RULE_CHECKS as ReadonlyArray<string>).includes(check.id);

/** The proposal's rule Checks with the AI's answer added, or with why it has none. */
const withJudged = (proposal: CardProposal, judged: CardChecks.Judged): CardProposal => {
  const rules = (proposal.score?.checks ?? []).filter(isRuleCheck);
  return {
    ...proposal,
    score:
      typeof judged === "string" ? scoreOf(rules, judged) : scoreOf([...rules, ...judged], "done"),
  };
};

const quoted = (card: CardText) => `"${card.question}" / "${card.answer}"`;

const viewOf = (record: SessionRecord): Session => ({
  id: record.id,
  kind: record.kind,
  subject: record.subject,
  model: record.model,
  created: record.created,
  entries: record.entries,
  working: false,
  draft: "",
  problem: null,
});

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const sources = yield* Sources.Sources;
  const graph = yield* Graph.Graph;
  const notes = yield* Notes.Notes;
  const cards = yield* Cards.Cards;
  const checks = yield* CardChecks.CardChecks;
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;

  const live = new Map<string, Live>();
  const loading = yield* Semaphore.make(1);
  const deciding = yield* Semaphore.make(1);
  // The Card Checks save beside a turn; two writes of one file must not share its temp file.
  const saving = yield* Semaphore.make(1);
  const turns = yield* FiberMap.make<string>();
  /** Runs of the AI Checks of proposals so far; each runs under its own key in `turns`. */
  let judgeRuns = 0;
  /** Turns ask for reasoning summaries until the route refuses them once. */
  let summaries = true;
  // Signing out stops every request on the user's plan, before the sign-in ends.
  yield* chatGpt.beforeSignOut(FiberMap.clear(turns));

  const sessionsFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { graphFolder } }) =>
      graphFolder === null
        ? Effect.fail(new GraphFolderNotSet())
        : Effect.succeed(path.join(graphFolder, GLOSE_DIR, "sessions")),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}.json`);

  const save = Effect.fn("Sessions.save")(
    function* (session: Live) {
      const view = yield* SubscriptionRef.get(session.view);
      const folder = yield* sessionsFolder;
      const record: SessionRecord = {
        version: 2,
        id: view.id,
        kind: view.kind,
        subject: view.subject,
        model: view.model,
        created: view.created,
        entries: view.entries,
        items: session.items,
        decisions: session.decisions,
      };
      yield* fs.makeDirectory(folder, { recursive: true }).pipe(Effect.mapError(storageError));
      yield* encodeRecord(record).pipe(
        Effect.flatMap((json) => writeFileAtomic(fs, fileOf(folder, view.id), json)),
        Effect.mapError(storageError),
      );
    },
    (effect) => saving.withPermit(effect),
  );

  const readRecords = Effect.gen(function* () {
    const folder = yield* sessionsFolder;
    if (!(yield* fs.exists(folder).pipe(Effect.mapError(storageError)))) return [];
    const names = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
    const records = yield* Effect.forEach(
      names.filter((name) => name.endsWith(".json")),
      (name) =>
        fs.readFileString(path.join(folder, name)).pipe(
          Effect.flatMap(decodeRecord),
          // A file Glose cannot read (hand-edited, from a newer Glose) is skipped, not fatal.
          Effect.option,
        ),
      { concurrency: 8 },
    );
    return records.flatMap((record) => Option.toArray(record));
  });

  /**
   * The one live copy of a Session, so every watcher sees the same turn. Opening it tries
   * again the AI Checks of open proposals that have none.
   */
  const adopt = Effect.fn("Sessions.adopt")(function* (record: SessionRecord) {
    const existing = live.get(record.id);
    if (existing) {
      // In a live Session, pending Checks are still running; only these wait for a retry.
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
      const notFound = new SessionNotFound({ id });
      if (!isFileName(id)) return yield* notFound;
      const file = fileOf(yield* sessionsFolder, id);
      if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return yield* notFound;
      const record = yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decodeRecord), Effect.mapError(storageError));
      return yield* adopt(record);
    },
    (effect) => loading.withPermit(effect),
  );

  const patch = (session: Live, change: (view: Session) => Session) =>
    SubscriptionRef.update(session.view, change);

  /**
   * Runs the AI Checks of open proposals in the background; signing out stops them with the
   * turns. A proposal the user changed meanwhile keeps the answer for the words it was kept as.
   */
  const judgeProposals = Effect.fn("Sessions.judgeProposals")(function* (
    session: Live,
    ids: ReadonlyArray<string>,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const targets = proposalsOf(view.entries).filter((proposal) => ids.includes(proposal.id));
    if (targets.length === 0) return;
    const mark = (judgedOf: (proposal: CardProposal, index: number) => CardChecks.Judged) =>
      patch(session, (now) => ({
        ...now,
        entries: targets.reduce(
          (entries, target, index) =>
            mapProposal(entries, target.id, (proposal) =>
              proposal.question === target.question && proposal.answer === target.answer
                ? withJudged(proposal, judgedOf(proposal, index))
                : proposal,
            ),
          now.entries,
        ),
      }));
    const judged = yield* checks
      .judge(targets.map(({ question, answer }) => ({ question, answer, from: view.subject })))
      .pipe(
        Effect.onInterrupt(() =>
          mark(() => "off").pipe(Effect.andThen(save(session)), Effect.ignore),
        ),
      );
    yield* mark((_, index) => judged[index] ?? "failed");
    yield* save(session).pipe(Effect.ignore);
  });

  const startJudging = Effect.fn("Sessions.startJudging")(function* (
    session: Live,
    ids: ReadonlyArray<string>,
  ) {
    const { id } = yield* SubscriptionRef.get(session.view);
    // A key per run: a new run never stops an older one that is still saving its answer.
    judgeRuns += 1;
    yield* FiberMap.run(turns, `${id}:checks:${judgeRuns}`, judgeProposals(session, ids));
  });

  /**
   * Proposed Cards join the Session as one entry, each with an id unique in it and its rule
   * Checks against the Note's Cards and each other. The AI Checks follow.
   */
  const propose = (session: Live) => (proposed: ReadonlyArray<CardText>) =>
    Effect.gen(function* () {
      const { subject } = yield* SubscriptionRef.get(session.view);
      const fromNote = (yield* cards.list.pipe(Effect.orElseSucceed(() => []))).filter(
        (card) => card.from !== null && linkKey(card.from) === linkKey(subject),
      );
      const ids = yield* SubscriptionRef.modify(session.view, (view) => {
        const before = proposalsOf(view.entries).length;
        const proposals = proposed.map((card, index): CardProposal => ({
          id: `p${before + index + 1}`,
          ...card,
          state: "open",
          card: null,
          score: scoreOf(
            ruleChecks(card, [...fromNote, ...proposed.filter((other) => other !== card)]),
            "pending",
          ),
        }));
        return [
          proposals.map((proposal) => proposal.id),
          { ...view, entries: [...view.entries, { _tag: "CardProposals" as const, proposals }] },
        ];
      });
      yield* startJudging(session, ids);
    });

  /**
   * Starts the AI Checks of open proposals in these states again: pending (left by a closed
   * Glose), off (stopped by a sign-out, or no ChatGPT) or failed.
   */
  const pendingProposals = Effect.fn("Sessions.pendingProposals")(function* (
    session: Live,
    retry: ReadonlyArray<JudgeState>,
  ) {
    // Marked pending in the same step, so opening the Session twice checks them once.
    const ids = yield* SubscriptionRef.modify(session.view, (view) => {
      const chosen = proposalsOf(view.entries)
        .filter(
          (proposal) =>
            proposal.state === "open" &&
            proposal.score !== undefined &&
            retry.includes(proposal.score.judge),
        )
        .map((proposal) => proposal.id);
      const entries = chosen.reduce(
        (all, chosenId) =>
          mapProposal(all, chosenId, (proposal) =>
            proposal.score === undefined
              ? proposal
              : { ...proposal, score: { ...proposal.score, judge: "pending" } },
          ),
        view.entries,
      );
      return [chosen, { ...view, entries }];
    });
    if (ids.length > 0) yield* startJudging(session, ids);
  });

  /** New Points join the Session as one entry, numbered on from the Points before them. */
  const addPoints = (session: Live, added: ReadonlyArray<Omit<Point, "id">>) =>
    SubscriptionRef.modify(session.view, (view) => {
      const before = pointsOf(view.entries).length;
      const points = added.map((point, index): Point => ({
        ...point,
        id: `p${before + index + 1}`,
      }));
      return [points, { ...view, entries: [...view.entries, { _tag: "Points" as const, points }] }];
    });

  /** Changes a Point the AI named by number, if it is in one of these states. */
  const changeNumbered = (
    session: Live,
    number: number,
    states: ReadonlyArray<PointState>,
    change: (point: Point) => Point,
  ) =>
    SubscriptionRef.modify(session.view, (view) => {
      const point = pointsOf(view.entries).find((other) => other.id === `p${number}`);
      if (point === undefined || !states.includes(point.state)) return [false, view];
      return [true, { ...view, entries: mapPoint(view.entries, point.id, change) }];
    });

  /** What the AI of each kind of Session is told, and may do. */
  const rulesOf = (session: Live, { kind, subject }: Session) => {
    switch (kind) {
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
                proposed.map((point) => ({
                  ...point,
                  draft: null,
                  state: "open" as const,
                  note: null,
                  page: null,
                })),
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
          }),
        };
      case "card-extraction":
        return {
          instructions: CardExtraction.INSTRUCTIONS,
          tools: CardExtraction.tools({ graph, cards, note: subject, propose: propose(session) }),
        };
    }
  };

  const runSessionTurn = Effect.fn("Sessions.runTurn")(
    function* (session: Live) {
      const rules = rulesOf(session, yield* SubscriptionRef.get(session.view));
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
        // A turn that ends early (stopped, or failed mid-answer) keeps what the AI already
        // said, in the transcript and in the model input the next turn continues from.
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

  /** Marks the Session busy and runs a turn in the background; refuses while one runs. */
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
              : CardExtraction.decisionsMessage(session.decisions),
          ];
    session.decisions = [];
    session.items = [...session.items, ...decisions, ...items];
    yield* save(session);
    yield* FiberMap.run(turns, id, runSessionTurn(session));
  });

  /**
   * The file a new Session works on, as the Graph folder names it. Extraction needs a Source;
   * Card Extraction any file in the Graph.
   */
  const subjectOf = Effect.fn("Sessions.subjectOf")(function* (kind: SessionKind, name: string) {
    switch (kind) {
      case "extraction":
        return (yield* sources.get(name)).id;
      case "card-extraction": {
        const view = yield* graph.read;
        const node = view.nodes.find((other) => linkKey(other.id) === linkKey(name));
        if (node === undefined) return yield* new NoteNotFound({ id: name });
        return node.id;
      }
    }
  });

  const openProposal = Effect.fn("Sessions.openProposal")(function* (
    session: Live,
    proposalId: string,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const proposal = proposalsOf(view.entries).find((other) => other.id === proposalId);
    if (proposal === undefined || proposal.state !== "open") {
      return yield* new ProposalNotOpen({ id: view.id, proposal: proposalId });
    }
    return { proposal, subject: view.subject };
  });

  const findPoint = Effect.fn("Sessions.findPoint")(function* (
    session: Live,
    pointId: string,
    states: ReadonlyArray<PointState>,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const point = pointsOf(view.entries).find((other) => other.id === pointId);
    if (point === undefined || !states.includes(point.state)) {
      return yield* new PointNotFound({ id: view.id, point: pointId });
    }
    return { point, view };
  });

  /** Changes a Point, notes what the user did for the next turn, and keeps the Session. */
  const decidePoint = Effect.fn("Sessions.decidePoint")(function* (
    session: Live,
    pointId: string,
    change: (point: Point) => Point,
    decision: string,
  ) {
    session.decisions.push(decision);
    yield* patch(session, (view) => ({
      ...view,
      entries: mapPoint(view.entries, pointId, change),
    }));
    yield* save(session);
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
      // A message about a Point that is not in the Session is a message about the Source.
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

    keepProposal: Effect.fn("Sessions.keepProposal")(
      function* ({ id, proposal: proposalId, question, answer }) {
        const session = yield* load(id);
        const { proposal, subject } = yield* openProposal(session, proposalId);
        // The AI wrote it, so it is AI text, edited or not, until the user rewrites it.
        const card = yield* cards.create({ from: subject, question, answer, ai: true });
        const kept = { question, answer };
        session.decisions.push(
          question === proposal.question && answer === proposal.answer
            ? `Kept ${quoted(proposal)}.`
            : `Kept ${quoted(proposal)}, changed by the user to ${quoted(kept)}.`,
        );
        yield* patch(session, (view) => ({
          ...view,
          entries: setProposal(view.entries, proposalId, {
            ...kept,
            state: "kept",
            card: card.file,
          }),
        }));
        yield* save(session);
        return card;
      },
      (effect) => deciding.withPermit(effect),
    ),

    dropProposal: Effect.fn("Sessions.dropProposal")(
      function* ({ id, proposal: proposalId }) {
        const session = yield* load(id);
        const { proposal } = yield* openProposal(session, proposalId);
        session.decisions.push(`Dropped ${quoted(proposal)}.`);
        yield* patch(session, (view) => ({
          ...view,
          entries: setProposal(view.entries, proposalId, { state: "dropped" }),
        }));
        yield* save(session);
      },
      (effect) => deciding.withPermit(effect),
    ),

    keepPoint: Effect.fn("Sessions.keepPoint")(
      function* ({ id, point: pointId, title }) {
        const session = yield* load(id);
        const { point } = yield* findPoint(session, pointId, ["open"]);
        yield* decidePoint(
          session,
          pointId,
          (now) => ({ ...now, title, state: "kept" }),
          title === point.title
            ? `Kept ${pointName(point)} to write as a Note.`
            : `Kept ${pointName(point)} to write as a Note, with the title changed to "${title}".`,
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    dropPoint: Effect.fn("Sessions.dropPoint")(
      function* ({ id, point: pointId }) {
        const session = yield* load(id);
        const { point } = yield* findPoint(session, pointId, ["open", "kept"]);
        yield* decidePoint(
          session,
          pointId,
          (now) => ({ ...now, state: "dropped" }),
          `Dropped ${pointName(point)}.`,
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    restorePoint: Effect.fn("Sessions.restorePoint")(
      function* ({ id, point: pointId }) {
        const session = yield* load(id);
        const { point } = yield* findPoint(session, pointId, ["dropped"]);
        yield* decidePoint(
          session,
          pointId,
          (now) => ({ ...now, state: "open" }),
          `Brought back ${pointName(point)}, to decide on again.`,
        );
      },
      (effect) => deciding.withPermit(effect),
    ),

    addPoint: Effect.fn("Sessions.addPoint")(
      function* ({ id, title }) {
        const session = yield* load(id);
        const [point] = yield* addPoints(session, [
          {
            title,
            origin: "user",
            quote: null,
            repeats: null,
            pullsAgainst: null,
            links: [],
            draft: null,
            state: "kept",
            note: null,
            page: null,
          },
        ]);
        if (point !== undefined) {
          session.decisions.push(`Added ${pointName(point)} in their own words, to write.`);
        }
        yield* save(session);
      },
      (effect) => deciding.withPermit(effect),
    ),

    writePoint: Effect.fn("Sessions.writePoint")(
      function* ({ id, point: pointId, title, text, page, links, useDraft }) {
        const session = yield* load(id);
        const { point, view } = yield* findPoint(session, pointId, ["kept"]);
        const { language } = (yield* settings.get).settings;
        // Only Links the AI proposed for this Point, under the names the Graph gives them.
        const asked = new Set(links.map(linkKey));
        const related = point.links
          .filter((link) => asked.has(linkKey(link.note)))
          .map((link) => link.note);
        const draft = useDraft ? point.draft : null;
        const note = yield* notes.create({
          title,
          source: view.subject,
          page,
          text,
          draft,
          // The AI wrote the title of every Point but the user's own, edited or not.
          aiTitle: point.origin !== "user",
          related,
          language: language ?? "en",
        });
        const added = new Set(related.map(linkKey));
        yield* decidePoint(
          session,
          pointId,
          (now) => ({
            ...now,
            title,
            state: "written",
            note,
            page,
            draft,
            links: now.links.map((link) => ({ ...link, added: added.has(linkKey(link.note)) })),
          }),
          [
            `Wrote ${pointName(point)} as the Note [[${note}]]${page === null ? "" : `, page ${page}`}.`,
            text === ""
              ? "None of its text is in their own words."
              : `In their own words: """${text}"""`,
            draft === null ? "" : "The Note keeps your draft, marked as AI text.",
            related.length === 0
              ? ""
              : `It links to ${related.map((name) => `[[${name}]]`).join(", ")}.`,
          ]
            .filter((line) => line !== "")
            .join(" "),
        );
        return note;
      },
      (effect) => deciding.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Sessions, make);

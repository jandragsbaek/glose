import {
  type Card,
  type CardProposal,
  type CardText,
  GraphFolderNotSet,
  linkKey,
  NoteNotFound,
  ProposalNotOpen,
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

import * as Cards from "../cards/Cards.ts";
import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses, type ResponsesError } from "../chatgpt/Responses.ts";
import { isFileName } from "../graph/fileName.ts";
import * as Graph from "../graph/Graph.ts";
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
  }
>()("glose/sessions/Sessions") {}

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
  const cards = yield* Cards.Cards;
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;

  const live = new Map<string, Live>();
  const loading = yield* Semaphore.make(1);
  const deciding = yield* Semaphore.make(1);
  const turns = yield* FiberMap.make<string>();
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

  const save = Effect.fn("Sessions.save")(function* (session: Live) {
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
    };
    yield* fs.makeDirectory(folder, { recursive: true }).pipe(Effect.mapError(storageError));
    yield* encodeRecord(record).pipe(
      Effect.flatMap((json) => writeFileAtomic(fs, fileOf(folder, view.id), json)),
      Effect.mapError(storageError),
    );
  });

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

  /** The one live copy of a Session, so every watcher sees the same turn. */
  const adopt = Effect.fn("Sessions.adopt")(function* (record: SessionRecord) {
    const existing = live.get(record.id);
    if (existing) return existing;
    const session: Live = {
      view: yield* SubscriptionRef.make(viewOf(record)),
      items: record.items,
      decisions: [],
    };
    live.set(record.id, session);
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

  /** Proposed Cards join the Session as one entry, each with an id unique in it. */
  const propose = (session: Live) => (proposed: ReadonlyArray<CardText>) =>
    patch(session, (view) => {
      const before = proposalsOf(view.entries).length;
      const proposals = proposed.map((card, index): CardProposal => ({
        id: `p${before + index + 1}`,
        ...card,
        state: "open",
        card: null,
      }));
      return { ...view, entries: [...view.entries, { _tag: "CardProposals", proposals }] };
    });

  /** What the AI of each kind of Session is told, and may do. */
  const rulesOf = (session: Live, { kind, subject }: Session) => {
    switch (kind) {
      case "extraction":
        return { instructions: Extraction.INSTRUCTIONS, tools: Extraction.tools(sources, subject) };
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
    const decisions =
      session.decisions.length === 0 ? [] : [CardExtraction.decisionsMessage(session.decisions)];
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

    send: Effect.fn("Sessions.send")(function* ({ id, text }) {
      const session = yield* load(id);
      yield* beginTurn(
        session,
        [{ _tag: "UserMessage", text }],
        [{ type: "message", role: "user", content: text }],
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
  });
});

export const layer = Layer.effect(Sessions, make);

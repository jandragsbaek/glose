import {
  GraphFolderNotSet,
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

import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses, type ResponsesError } from "../chatgpt/Responses.ts";
import { isFileName } from "../graph/fileName.ts";
import { GLOSE_DIR } from "../graph/GraphFolder.ts";
import * as Sources from "../graph/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { type InputItem, runTurn } from "./agent.ts";
import * as Extraction from "./extraction.ts";

type GraphError = GraphFolderNotSet | StorageError;

export class Sessions extends Context.Service<
  Sessions,
  {
    readonly find: (input: {
      readonly kind: SessionKind;
      readonly sourceId: string;
    }) => Effect.Effect<Session | null, GraphError>;
    /** Makes a Session and starts the AI's first turn in the background. */
    readonly start: (input: {
      readonly kind: SessionKind;
      readonly sourceId: string;
    }) => Effect.Effect<Session, SourceNotFound | GraphError>;
    readonly watch: (id: string) => Stream.Stream<Session, SessionNotFound | GraphError>;
    readonly send: (input: {
      readonly id: string;
      readonly text: string;
    }) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly retry: (id: string) => Effect.Effect<void, SessionNotFound | SessionBusy | GraphError>;
    readonly stop: (id: string) => Effect.Effect<void>;
  }
>()("glose/sessions/Sessions") {}

/**
 * A Session as kept in the Graph folder, in `.glose/sessions/<id>.json`: what the user saw
 * (`entries`) and the exact model input (`items`) that the next turn continues from.
 */
const SessionRecord = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  kind: SessionKindSchema,
  sourceId: Schema.String,
  model: Schema.NullOr(Schema.String),
  created: Schema.Number,
  entries: Schema.Array(SessionEntry),
  items: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
});
type SessionRecord = typeof SessionRecord.Type;

const RecordJson = Schema.fromJsonString(SessionRecord);
const decodeRecord = Schema.decodeUnknownEffect(RecordJson);
const encodeRecord = Schema.encodeEffect(RecordJson);

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
}

const viewOf = (record: SessionRecord): Session => ({
  id: record.id,
  kind: record.kind,
  sourceId: record.sourceId,
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
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;

  const live = new Map<string, Live>();
  const loading = yield* Semaphore.make(1);
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
      version: 1,
      id: view.id,
      kind: view.kind,
      sourceId: view.sourceId,
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

  const runSessionTurn = Effect.fn("Sessions.runTurn")(
    function* (session: Live) {
      const { sourceId } = yield* SubscriptionRef.get(session.view);
      const token = yield* chatGpt.accessToken;
      const [model] = yield* responses.models(token);
      if (model === undefined) return yield* Effect.fail("no-model" as const);
      yield* patch(session, (view) => ({ ...view, model: model.slug }));
      yield* runTurn({
        token,
        model: model.slug,
        instructions: Extraction.INSTRUCTIONS,
        tools: Extraction.tools(sources, sourceId),
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
    entry: SessionEntry | null,
    item: InputItem | null,
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
              entries: entry ? [...view.entries, entry] : view.entries,
            },
          ],
    );
    const { id } = yield* SubscriptionRef.get(session.view);
    if (!started) return yield* new SessionBusy({ id });
    if (item) session.items = [...session.items, item];
    yield* save(session);
    yield* FiberMap.run(turns, id, runSessionTurn(session));
  });

  return Sessions.of({
    find: Effect.fn("Sessions.find")(function* ({ kind, sourceId }) {
      const [latest] = (yield* readRecords)
        .filter((record) => record.kind === kind && record.sourceId === sourceId)
        .sort((a, b) => b.created - a.created);
      if (latest === undefined) return null;
      return yield* SubscriptionRef.get((yield* adopt(latest)).view);
    }),

    start: Effect.fn("Sessions.start")(function* ({ kind, sourceId }) {
      yield* sources.get(sourceId);
      const { language } = (yield* settings.get).settings;
      const created = yield* Clock.currentTimeMillis;
      const stamp = new Date(created).toISOString().replace(/[:.]/g, "-");
      const record: SessionRecord = {
        version: 1,
        id: `${stamp}-${NodeCrypto.randomBytes(3).toString("hex")}`,
        kind,
        sourceId,
        model: null,
        created,
        entries: [],
        items: [],
      };
      const session = yield* adopt(record);
      yield* beginTurn(session, null, Extraction.kickoff(language ?? "en")).pipe(
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
        { _tag: "UserMessage", text },
        { type: "message", role: "user", content: text },
      );
    }),

    retry: Effect.fn("Sessions.retry")(function* (id) {
      yield* beginTurn(yield* load(id), null, null);
    }),

    stop: (id) => FiberMap.remove(turns, id),
  });
});

export const layer = Layer.effect(Sessions, make);

import {
  type Card,
  CardNotFound,
  GraphFolderNotSet,
  type RecordReview,
  recallSettings,
  type ReviewQueue,
  StorageError,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";

import * as Cards from "../cards/Cards.ts";
import * as GraphFolder from "../graph/GraphFolder.ts";
import * as Settings from "../settings/Settings.ts";
import {
  LOG_EXTENSION,
  logFileName,
  parseReviews,
  renderReview,
  REVIEWS_FOLDER,
  type Review,
} from "./reviewLog.ts";
import {
  applyReview,
  buildQueue,
  makeScheduler,
  type Replay,
  replayReviews,
  type Scheduler,
} from "./schedule.ts";

type GraphError = GraphFolderNotSet | StorageError;

export class Recall extends Context.Service<
  Recall,
  {
    /** What is due now, from every computer's Reviews and the Graph's Recall settings. */
    readonly queue: Effect.Effect<ReviewQueue, GraphError>;
    /** Appends one Review to this computer's log. */
    readonly review: (input: RecordReview) => Effect.Effect<void, CardNotFound | GraphError>;
  }
>()("glose/recall/Recall") {}

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

interface LogFile {
  /** The file's modification time and size when it was read. */
  readonly stamp: string;
  readonly reviews: ReadonlyArray<Review>;
}

/**
 * The replayed state, and what it was built from. The log is the record; this cache lives only in
 * memory, since a cache file in a shared Graph folder would conflict between computers.
 */
interface Cache {
  readonly folder: string;
  readonly settingsKey: string;
  readonly scheduler: Scheduler;
  /** Every log file's stamp when the replay was made. */
  logKey: string;
  readonly replay: Replay;
}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const cards = yield* Cards.Cards;
  const graphFolders = GraphFolder.make(fs, path);

  /** Log files by path; only a file whose stamp changed is read again. */
  const logs = new Map<string, LogFile>();
  let cache: Cache | null = null;
  const lock = yield* Semaphore.make(1);

  const graphFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { graphFolder: folder } }) =>
      folder === null ? Effect.fail(new GraphFolderNotSet()) : Effect.succeed(folder),
    ),
  );

  const reviewsFolder = (folder: string) =>
    path.join(folder, GraphFolder.GLOSE_DIR, ...REVIEWS_FOLDER);

  const stampOf = (info: FileSystem.File.Info) =>
    `${Option.getOrElse(info.mtime, () => new Date(0)).getTime()}:${info.size}`;

  /** Every log file of every computer, read again where it changed. */
  const readLogs = Effect.fn("Recall.readLogs")(function* (folder: string) {
    const root = reviewsFolder(folder);
    const files: Array<string> = [];
    if (yield* fs.exists(root)) {
      for (const computer of yield* fs.readDirectory(root)) {
        if (computer.startsWith(".")) continue;
        const dir = path.join(root, computer);
        if ((yield* fs.stat(dir)).type !== "Directory") continue;
        for (const entry of yield* fs.readDirectory(dir)) {
          if (entry.endsWith(LOG_EXTENSION) && !entry.startsWith(".")) {
            files.push(path.join(dir, entry));
          }
        }
      }
    }
    files.sort();
    const present = new Set(files);
    for (const file of logs.keys()) if (!present.has(file)) logs.delete(file);
    yield* Effect.forEach(
      files,
      (file) =>
        Effect.gen(function* () {
          const stamp = stampOf(yield* fs.stat(file));
          if (logs.get(file)?.stamp === stamp) return;
          logs.set(file, { stamp, reviews: parseReviews(yield* fs.readFileString(file)) });
        }),
      { concurrency: 16, discard: true },
    );
    return files.map((file) => `${file}=${logs.get(file)?.stamp ?? ""}`).join("\n");
  });

  /** The replay for the Graph's log and settings now; replayed again only when either changed. */
  const current = Effect.fn("Recall.current")(function* (folder: string) {
    const recall = recallSettings((yield* graphFolders.settings(folder)).recall);
    const settingsKey = JSON.stringify(recall);
    const logKey = yield* readLogs(folder).pipe(Effect.mapError(storageError));
    if (cache?.folder === folder && cache.settingsKey === settingsKey && cache.logKey === logKey) {
      return { cache, recall };
    }
    const scheduler =
      cache?.settingsKey === settingsKey
        ? cache.scheduler
        : yield* Effect.tryPromise({ try: () => makeScheduler(recall), catch: storageError });
    const reviews = [...logs.values()].flatMap((log) => log.reviews);
    const next: Cache = {
      folder,
      settingsKey,
      scheduler,
      logKey,
      replay: replayReviews(scheduler, reviews),
    };
    cache = next;
    return { cache: next, recall };
  });

  return Recall.of({
    queue: Effect.gen(function* () {
      const folder = yield* graphFolder;
      const { cache: replayed, recall } = yield* current(folder);
      const now = yield* Clock.currentTimeMillis;
      const queueOf = (all: ReadonlyArray<Card>) =>
        buildQueue({
          scheduler: replayed.scheduler,
          replay: replayed.replay,
          settings: recall,
          cards: all,
          now,
        });
      const queue = queueOf(yield* cards.list);
      // FSRS fuzzes intervals by the Card id, so a Card written by hand gets its id before the
      // user sees when it would come back; the Review then keeps exactly those dates.
      if (queue.next === null || queue.next.card.id !== null) return queue;
      yield* cards
        .ensureId(queue.next.card.file)
        .pipe(Effect.catchTags({ CardNotFound: () => Effect.void }));
      return queueOf(yield* cards.list);
    }).pipe((effect) => lock.withPermit(effect), Effect.withSpan("Recall.queue")),

    review: Effect.fn("Recall.review")(
      function* ({ file, rating, answerMs }) {
        const folder = yield* graphFolder;
        const card = yield* cards.ensureId(file);
        const id = card.id;
        if (id === null) return yield* Effect.die(`Card ${file} has no id after ensureId.`);
        const { cache: before } = yield* current(folder);
        const at = yield* Clock.currentTimeMillis;
        const review: Review = { card: id, at, rating, answerMs };

        const dir = path.join(reviewsFolder(folder), yield* settings.computerId);
        const log = path.join(dir, logFileName(at));
        yield* Effect.gen(function* () {
          yield* fs.makeDirectory(dir, { recursive: true });
          // A line cut off by a crash must not swallow the next one.
          const text = (yield* fs.exists(log)) ? yield* fs.readFileString(log) : "";
          const lead = text === "" || text.endsWith("\n") ? "" : "\n";
          yield* fs.writeFileString(log, `${lead}${renderReview(review)}`, { flag: "a" });
        }).pipe(Effect.mapError(storageError));

        // Apply the Review to the replay as it stands, which is quick. If another log file changed
        // meanwhile (a sync), or the Review comes before the Card's last one, the next queue
        // replays the whole log instead.
        const logKey = yield* readLogs(folder).pipe(Effect.mapError(storageError));
        const others = (key: string) =>
          key
            .split("\n")
            .filter((line) => !line.startsWith(`${log}=`))
            .join("\n");
        const last = logs.get(log)?.reviews.at(-1);
        if (
          cache === before &&
          others(before.logKey) === others(logKey) &&
          last?.card === id &&
          last.at === at &&
          applyReview(before.scheduler, before.replay, review)
        ) {
          before.logKey = logKey;
        }
      },
      (effect) => lock.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Recall, make);

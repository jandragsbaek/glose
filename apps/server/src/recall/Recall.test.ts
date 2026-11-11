import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import * as Cards from "../cards/Cards.ts";
import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/graph.ts";
import * as Recall from "./Recall.ts";

const NOTE = "Retrieval practice strengthens memory";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Noon on 11 November 2026, local time, so a Review day (from 04:00) holds the whole test. */
const NOON = new Date(2026, 10, 11, 12, 0).getTime();

/** A Graph folder after setup at noon, with the real services over it. */
const withGraph = <A, E>(
  test: (graph: {
    readonly folder: string;
    readonly cards: Cards.Cards["Service"];
    readonly recall: Recall.Recall["Service"];
    readonly computerId: string;
    readonly write: (relative: string, text: string) => Effect.Effect<void, unknown>;
    readonly read: (relative: string) => Effect.Effect<string, unknown>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    yield* TestClock.setTime(NOON);
    return yield* Effect.gen(function* () {
      const settings = yield* Settings.Settings;
      yield* settings.completeSetup({ language: "en", graphFolder: folder, action: "create" });
      return yield* test({
        folder,
        cards: yield* Cards.Cards,
        recall: yield* Recall.Recall,
        computerId: yield* settings.computerId,
        write: (relative, text) =>
          fs
            .makeDirectory(path.dirname(path.join(folder, relative)), { recursive: true })
            .pipe(Effect.andThen(fs.writeFileString(path.join(folder, relative), text))),
        read: (relative) => fs.readFileString(path.join(folder, relative)),
      });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

const makeCard = (cards: Cards.Cards["Service"], question: string) =>
  cards.create({ from: NOTE, question, answer: "An answer.", ai: false });

it.layer(NodeServices.layer)("Recall", (it) => {
  it.effect("takes a new Card through its learning steps and keeps each Review in a log", () =>
    withGraph(({ cards, recall, computerId, read }) =>
      Effect.gen(function* () {
        const card = yield* makeCard(cards, "What strengthens memory?");

        const first = yield* recall.queue;
        assert.deepStrictEqual(first.counts, { new: 1, learning: 0, review: 0 });
        assert.strictEqual(first.next?.card.id, card.id);
        assert.strictEqual(first.next?.state, "new");
        // Anki's default steps for a new Card: 1 minute, then 10.
        assert.strictEqual(first.next?.due.again, NOON + MINUTE);
        assert.strictEqual(first.next?.due.good, NOON + 10 * MINUTE);

        yield* recall.review({ file: card.file, rating: "good", answerMs: 4200 });
        assert.strictEqual(
          yield* read(`.glose/recall/reviews/${computerId}/2026-11.jsonl`),
          `${JSON.stringify({
            card: card.id,
            at: new Date(NOON).toISOString(),
            rating: "good",
            answerMs: 4200,
          })}\n`,
        );

        // Nothing else is due, and the 10-minute step is within Anki's 20-minute learn ahead
        // limit, so the Card comes back at once.
        const again = yield* recall.queue;
        assert.deepStrictEqual(again.counts, { new: 0, learning: 1, review: 0 });
        assert.strictEqual(again.next?.card.id, card.id);
        assert.strictEqual(again.next?.state, "learning");
        assert.isAbove(again.next?.due.good ?? 0, NOON + DAY);

        yield* recall.review({ file: card.file, rating: "good", answerMs: 3000 });
        const done = yield* recall.queue;
        assert.strictEqual(done.next, null);
        assert.deepStrictEqual(done.counts, { new: 0, learning: 0, review: 0 });
        assert.strictEqual(done.nextLearningDue, null);
      }),
    ),
  );

  it.effect("replays the Reviews of every computer that shares the Graph", () =>
    withGraph(({ cards, recall, write }) =>
      Effect.gen(function* () {
        const card = yield* makeCard(cards, "What strengthens memory?");
        const line = (at: number, rating: string) =>
          JSON.stringify({ card: card.id, at: new Date(at).toISOString(), rating, answerMs: 1 });
        // Another computer reviewed the Card a week ago; one line was cut off by a sync.
        yield* write(
          ".glose/recall/reviews/other-computer/2026-11.jsonl",
          [line(NOON - 7 * DAY, "good"), '{"card":"c-0', line(NOON - 7 * DAY + 10 * MINUTE, "good")]
            .join("\n")
            .concat("\n"),
        );

        const queue = yield* recall.queue;
        assert.strictEqual(queue.next?.card.id, card.id);
        assert.strictEqual(queue.next?.state, "review");
        assert.deepStrictEqual(queue.counts, { new: 0, learning: 0, review: 1 });
      }),
    ),
  );

  it.effect("gives a Card written by hand its id before showing when it would come back", () =>
    withGraph(({ recall, computerId, write, read }) =>
      Effect.gen(function* () {
        yield* write(
          "Cards/By hand.md",
          "---\nglose: card\n---\n\nWho wrote it?\n\n---\n\nI did.\n",
        );

        // FSRS fuzzes by the Card id, so the id must exist before the dates are shown.
        const queue = yield* recall.queue;
        const id = /^id: (c-[0-9a-f]{8})$/m.exec(yield* read("Cards/By hand.md"))?.[1];
        assert.isDefined(id);
        assert.strictEqual(queue.next?.card.id, id);

        yield* recall.review({ file: "By hand", rating: "again", answerMs: 900 });
        const log = yield* read(`.glose/recall/reviews/${computerId}/2026-11.jsonl`);
        assert.strictEqual(JSON.parse(log).card, id);
      }),
    ),
  );

  it.effect("schedules by the Graph's Recall settings, with Anki's defaults for the rest", () =>
    withGraph(({ cards, recall, write }) =>
      Effect.gen(function* () {
        yield* write(
          ".glose/settings.json",
          JSON.stringify({ recall: { newCardsPerDay: 1, learningSteps: ["1h"] } }),
        );
        const one = yield* makeCard(cards, "One?");
        yield* makeCard(cards, "Two?");

        assert.deepStrictEqual((yield* recall.queue).counts, { new: 1, learning: 0, review: 0 });
        // With one step, Good would graduate the Card at once; Again holds it at the step.
        yield* recall.review({ file: one.file, rating: "again", answerMs: 1000 });
        const waiting = yield* recall.queue;
        assert.strictEqual(waiting.next, null);
        assert.deepStrictEqual(waiting.counts, { new: 0, learning: 1, review: 0 });
        assert.strictEqual(waiting.nextLearningDue, NOON + 60 * MINUTE);
        assert.strictEqual(waiting.nextDayStarts, new Date(2026, 10, 12, 4, 0).getTime());

        // At 04:00 the next day starts, with a new allowance of new Cards. The step is due, and
        // comes first.
        yield* TestClock.setTime(new Date(2026, 10, 12, 4, 0).getTime());
        const tomorrow = yield* recall.queue;
        assert.deepStrictEqual(tomorrow.counts, { new: 1, learning: 1, review: 0 });
        assert.strictEqual(tomorrow.next?.card.id, one.id);
      }),
    ),
  );
});

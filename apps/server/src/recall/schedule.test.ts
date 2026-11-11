import { type Card, DEFAULT_RECALL_SETTINGS } from "@glose/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { buildQueue, makeScheduler, replayReviews } from "./schedule.ts";

const DAY = 24 * 60 * 60_000;
const NOON = new Date(2026, 10, 11, 12, 0).getTime();

const card = (id: string): Card => ({
  file: id,
  id,
  from: null,
  question: `${id}?`,
  answer: "",
  ai: false,
});

it.effect("puts due Cards past learning before new ones, oldest first, up to the daily limit", () =>
  Effect.gen(function* () {
    const settings = { ...DEFAULT_RECALL_SETTINGS, maximumReviewsPerDay: 1 };
    const scheduler = yield* Effect.promise(() => makeScheduler(settings));
    // Easy on a new Card gives it days at once; these two have been due for a while.
    const replay = replayReviews(scheduler, [
      { card: "late", at: NOON - 60 * DAY, rating: "easy", answerMs: 1 },
      { card: "later", at: NOON - 90 * DAY, rating: "easy", answerMs: 1 },
    ]);

    const queue = buildQueue({
      scheduler,
      replay,
      settings,
      cards: [card("fresh"), card("late"), card("later")],
      now: NOON,
    });

    assert.strictEqual(queue.next?.card.id, "later");
    assert.strictEqual(queue.next?.state, "review");
    assert.deepStrictEqual(queue.counts, { new: 1, learning: 0, review: 1 });
  }),
);

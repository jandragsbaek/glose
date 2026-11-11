import * as Schema from "effect/Schema";

import { Card } from "./card.ts";

/**
 * How the user answered a due Card in a Review, as Anki asks it. FSRS takes the rating to set
 * when the Card comes back.
 */
export const Rating = Schema.Literals(["again", "hard", "good", "easy"]);
export type Rating = typeof Rating.Type;

/** A learning step: a number and a unit, `m` minutes, `h` hours or `d` days, such as `10m`. */
export const LearningStep = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^(?:\d+(?:\.\d+)?)[mhd]$/)),
);

const Count = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)));

/**
 * How Recall schedules Cards with FSRS. They travel with the Graph, in `.glose/settings.json`,
 * because the Reviews that they schedule travel with it too. Every field has Anki's default.
 */
export const RecallSettings = Schema.Struct({
  /** The chance to recall a Card when it comes back. Higher means more Reviews. */
  desiredRetention: Schema.Number.pipe(
    Schema.check(Schema.isBetween({ minimum: 0.7, maximum: 0.99 })),
  ),
  /** Steps of a new Card before FSRS gives it days. */
  learningSteps: Schema.Array(LearningStep),
  /** Steps of a Card the user forgot (Again) before FSRS gives it days again. */
  relearningSteps: Schema.Array(LearningStep),
  /** The longest time, in days, before a Card comes back. */
  maximumInterval: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  /** New Cards to start each day. */
  newCardsPerDay: Count,
  /** Reviews of Cards past learning each day. */
  maximumReviewsPerDay: Count,
  /** The hour, local time, at which a new day of Reviews starts. */
  nextDayStartsAt: Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 }))),
  /** FSRS-6 parameters fitted to the user's Reviews; null uses FSRS-6's defaults. */
  weights: Schema.NullOr(Schema.Array(Schema.Finite)),
});
export type RecallSettings = typeof RecallSettings.Type;

/** Anki's defaults for a new deck (Anki 26.09, FSRS on). */
export const DEFAULT_RECALL_SETTINGS: RecallSettings = {
  desiredRetention: 0.9,
  learningSteps: ["1m", "10m"],
  relearningSteps: ["10m"],
  maximumInterval: 36_500,
  newCardsPerDay: 20,
  maximumReviewsPerDay: 200,
  nextDayStartsAt: 4,
  weights: null,
};

/**
 * Recall settings as the Graph's settings file holds them: only the fields the user changed.
 * A missing field takes its default, so a later Glose can improve a default the user never set.
 */
export const RecallSettingsFile = RecallSettings.mapFields((fields) => ({
  desiredRetention: Schema.optionalKey(fields.desiredRetention),
  learningSteps: Schema.optionalKey(fields.learningSteps),
  relearningSteps: Schema.optionalKey(fields.relearningSteps),
  maximumInterval: Schema.optionalKey(fields.maximumInterval),
  newCardsPerDay: Schema.optionalKey(fields.newCardsPerDay),
  maximumReviewsPerDay: Schema.optionalKey(fields.maximumReviewsPerDay),
  nextDayStartsAt: Schema.optionalKey(fields.nextDayStartsAt),
  weights: Schema.optionalKey(fields.weights),
}));
export type RecallSettingsFile = typeof RecallSettingsFile.Type;

export const recallSettings = (file: RecallSettingsFile | undefined): RecallSettings => ({
  ...DEFAULT_RECALL_SETTINGS,
  ...file,
});

/** When the Card comes back after each rating, in epoch milliseconds. */
export const RatingDue = Schema.Struct({
  again: Schema.Number,
  hard: Schema.Number,
  good: Schema.Number,
  easy: Schema.Number,
});
export type RatingDue = typeof RatingDue.Type;

/** Where a Card is in FSRS: never reviewed, in its (re)learning steps, or scheduled in days. */
export const ReviewState = Schema.Literals(["new", "learning", "review"]);
export type ReviewState = typeof ReviewState.Type;

export const ReviewCard = Schema.Struct({
  card: Card,
  state: ReviewState,
  /** What each rating would do, so the user sees it before choosing. */
  due: RatingDue,
  /** How many Reviews the Card has had; it changes only when a Review is kept. */
  reviews: Count,
});
export type ReviewCard = typeof ReviewCard.Type;

/** What is left to review today, and the Card to review next. */
export const ReviewQueue = Schema.Struct({
  /** When the queue was made, in epoch milliseconds; the due times count from it. */
  now: Schema.Number,
  /** Null when nothing is due now. */
  next: Schema.NullOr(ReviewCard),
  /** Cards still to review today, by state, as Anki counts them. */
  counts: Schema.Struct({ new: Count, learning: Count, review: Count }),
  /** When a Card in its learning steps comes back later today; null when none does. */
  nextLearningDue: Schema.NullOr(Schema.Number),
  /** When the next Review day starts, with new limits and the Cards due that day. */
  nextDayStarts: Schema.Number,
});
export type ReviewQueue = typeof ReviewQueue.Type;

export const RecordReview = Schema.Struct({
  /** The Card's file; a Card without an id gets one before its first Review is kept. */
  file: Schema.String,
  rating: Rating,
  /** From showing the question to choosing the rating. */
  answerMs: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
});
export type RecordReview = typeof RecordReview.Type;

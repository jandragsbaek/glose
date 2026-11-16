import * as Schema from "effect/Schema";

import { Card } from "./card.ts";

export const Rating = Schema.Literals(["again", "hard", "good", "easy"]);
export type Rating = typeof Rating.Type;

export const LearningStep = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^(?:\d+(?:\.\d+)?)[mhd]$/)),
);

const Count = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)));

export const RecallSettings = Schema.Struct({
  desiredRetention: Schema.Number.pipe(
    Schema.check(Schema.isBetween({ minimum: 0.7, maximum: 0.99 })),
  ),
  learningSteps: Schema.Array(LearningStep),
  relearningSteps: Schema.Array(LearningStep),
  maximumInterval: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  newCardsPerDay: Count,
  maximumReviewsPerDay: Count,
  nextDayStartsAt: Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 }))),
  weights: Schema.NullOr(Schema.Array(Schema.Finite)),
});
export type RecallSettings = typeof RecallSettings.Type;

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

export const RatingDue = Schema.Struct({
  again: Schema.Number,
  hard: Schema.Number,
  good: Schema.Number,
  easy: Schema.Number,
});
export type RatingDue = typeof RatingDue.Type;

export const ReviewState = Schema.Literals(["new", "learning", "review"]);
export type ReviewState = typeof ReviewState.Type;

export const ReviewCard = Schema.Struct({
  card: Card,
  state: ReviewState,
  due: RatingDue,
  reviews: Count,
});
export type ReviewCard = typeof ReviewCard.Type;

export const ReviewQueue = Schema.Struct({
  now: Schema.Number,
  next: Schema.NullOr(ReviewCard),
  counts: Schema.Struct({ new: Count, learning: Count, review: Count }),
  nextLearningDue: Schema.NullOr(Schema.Number),
  nextDayStarts: Schema.Number,
});
export type ReviewQueue = typeof ReviewQueue.Type;

export const RecordReview = Schema.Struct({
  file: Schema.String,
  rating: Rating,
  answerMs: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
});
export type RecordReview = typeof RecordReview.Type;

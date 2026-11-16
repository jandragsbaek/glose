import { Rating } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const REVIEWS_FOLDER = ["recall", "reviews"] as const;

export const LOG_EXTENSION = ".jsonl";

export interface Review {
  readonly card: string;
  readonly at: number;
  readonly rating: Rating;
  readonly answerMs: number;
}

const ReviewLine = Schema.Struct({
  card: Schema.String,
  at: Schema.String,
  rating: Rating,
  answerMs: Schema.Int,
});
const decodeLine = Schema.decodeUnknownOption(Schema.fromJsonString(ReviewLine));

export const logFileName = (at: number) =>
  `${new Date(at).toISOString().slice(0, 7)}${LOG_EXTENSION}`;

export const renderReview = (review: Review) =>
  `${JSON.stringify({
    card: review.card,
    at: new Date(review.at).toISOString(),
    rating: review.rating,
    answerMs: review.answerMs,
  })}\n`;

export const parseReviews = (text: string): ReadonlyArray<Review> =>
  text.split("\n").flatMap((line) => {
    if (line.trim() === "") return [];
    const parsed = Option.getOrNull(decodeLine(line));
    const at = parsed === null ? Number.NaN : Date.parse(parsed.at);
    return parsed === null || Number.isNaN(at) ? [] : [{ ...parsed, at }];
  });

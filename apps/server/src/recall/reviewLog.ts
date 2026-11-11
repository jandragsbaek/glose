import { Rating } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/**
 * The Review log is the record of Recall: `.glose/recall/reviews/<computer id>/<yyyy-mm>.jsonl`
 * in the Graph folder, one JSON line per Review. Each computer appends only to its own folder,
 * so a Graph shared through Dropbox or git has no conflicts, and git sees only added lines.
 */
export const REVIEWS_FOLDER = ["recall", "reviews"] as const;

export const LOG_EXTENSION = ".jsonl";

export interface Review {
  /** The Card's id, which stays when its file is renamed. */
  readonly card: string;
  /** Epoch milliseconds. */
  readonly at: number;
  readonly rating: Rating;
  readonly answerMs: number;
}

/** One line as the file holds it; the time is ISO 8601, so the file reads well in any editor. */
const ReviewLine = Schema.Struct({
  card: Schema.String,
  at: Schema.String,
  rating: Rating,
  answerMs: Schema.Int,
});
const decodeLine = Schema.decodeUnknownOption(Schema.fromJsonString(ReviewLine));

/** The file a Review goes in: one per month, in UTC, so a file stays small. */
export const logFileName = (at: number) =>
  `${new Date(at).toISOString().slice(0, 7)}${LOG_EXTENSION}`;

export const renderReview = (review: Review) =>
  `${JSON.stringify({
    card: review.card,
    at: new Date(review.at).toISOString(),
    rating: review.rating,
    answerMs: review.answerMs,
  })}\n`;

/**
 * Every Review in a log file. A line Glose cannot read (cut off by a crash or a sync, or edited by
 * hand) is skipped: one bad line must not lose the rest of the record.
 */
export const parseReviews = (text: string): ReadonlyArray<Review> =>
  text.split("\n").flatMap((line) => {
    if (line.trim() === "") return [];
    const parsed = Option.getOrNull(decodeLine(line));
    const at = parsed === null ? Number.NaN : Date.parse(parsed.at);
    return parsed === null || Number.isNaN(at) ? [] : [{ ...parsed, at }];
  });

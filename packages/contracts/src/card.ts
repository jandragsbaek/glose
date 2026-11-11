import * as Schema from "effect/Schema";

import { CardScore } from "./cardScore.ts";

/** Folder in the Graph folder that holds one Markdown file per Card. */
export const CARDS_FOLDER = "Cards";

const Question = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

/** What the user reads in a Review: a question, then its answer. */
export const CardText = Schema.Struct({
  question: Question,
  answer: Schema.Trim,
});
export type CardText = typeof CardText.Type;

/**
 * A Card file, `Cards/<question>.md`: frontmatter `glose: card`, `id`, `from` (a wikilink to the
 * Note it is made from) and `ai: true` while it is AI text; then the question, a `---` line, and
 * the answer.
 */
export const Card = Schema.Struct({
  /** The file name in the Cards folder, without `.md`. Glose edits a Card through it. */
  file: Schema.String,
  /**
   * Fixed for the life of the Card, so a renamed file keeps its Reviews. Null for a Card
   * written by hand without one; Glose adds it when it next writes the file.
   */
  id: Schema.NullOr(Schema.String),
  /** The file the Card is made from, as its wikilink names it; null when it names none. */
  from: Schema.NullOr(Schema.String),
  ...CardText.fields,
  /** The Card is AI text: `ai: true` in its frontmatter, or an AI callout in it. */
  ai: Schema.Boolean,
});
export type Card = typeof Card.Type;

/** A Card with its Checks against the research on good Cards, as Recall lists it. */
export const ScoredCard = Schema.Struct({ ...Card.fields, score: CardScore });
export type ScoredCard = typeof ScoredCard.Type;

export const CardRef = Schema.Struct({ file: Schema.String });

/** Cards whose AI Checks are `pending`; at most a page of Recall at a time. */
export const JudgeCards = Schema.Struct({
  files: Schema.Array(Schema.String).pipe(Schema.check(Schema.isMaxLength(50))),
});

/** A Card the user writes in Glose. */
export const CreateCard = Schema.Struct({
  /** The Graph file the Card is made from. */
  from: Schema.String,
  ...CardText.fields,
});

export const UpdateCard = Schema.Struct({ file: Schema.String, ...CardText.fields });

export class CardNotFound extends Schema.TaggedError<CardNotFound>()("CardNotFound", {
  file: Schema.String,
}) {}

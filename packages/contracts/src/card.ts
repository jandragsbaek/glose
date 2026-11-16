import * as Schema from "effect/Schema";

import { CardScore } from "./cardScore.ts";

export const CARDS_FOLDER = "Cards";

const Question = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const CardText = Schema.Struct({
  question: Question,
  answer: Schema.Trim,
});
export type CardText = typeof CardText.Type;

export const Card = Schema.Struct({
  file: Schema.String,
  id: Schema.NullOr(Schema.String),
  from: Schema.NullOr(Schema.String),
  ...CardText.fields,
  ai: Schema.Boolean,
});
export type Card = typeof Card.Type;

export const ScoredCard = Schema.Struct({ ...Card.fields, score: CardScore });
export type ScoredCard = typeof ScoredCard.Type;

export const CardRef = Schema.Struct({ file: Schema.String });

export const JudgeCards = Schema.Struct({
  files: Schema.Array(Schema.String).pipe(Schema.check(Schema.isMaxLength(50))),
});

export const CreateCard = Schema.Struct({
  from: Schema.String,
  ...CardText.fields,
});

export const UpdateCard = Schema.Struct({ file: Schema.String, ...CardText.fields });

export class CardNotFound extends Schema.TaggedError<CardNotFound>()("CardNotFound", {
  file: Schema.String,
}) {}

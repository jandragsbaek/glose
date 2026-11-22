import * as Schema from "effect/Schema";

import { toFileName } from "./fileName.ts";

export const PASSAGES_FOLDER = "Passages";

const Words = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const BookPassage = Schema.Struct({
  id: Schema.String,
  source: Schema.String,
  page: Schema.NullOr(Schema.String),
  words: Schema.String,
  yourWords: Schema.String,
  created: Schema.NullOr(Schema.String),
  usedBy: Schema.Array(Schema.String),
});
export type BookPassage = typeof BookPassage.Type;

export const PassagesOfSource = Schema.Struct({ source: Schema.String });

export const BookPassageRef = Schema.Struct({ id: Schema.String });

export const CreateBookPassage = Schema.Struct({
  source: Schema.String,
  page: Schema.NullOr(Words),
  words: Words,
  yourWords: Schema.Trim,
});
export type CreateBookPassage = typeof CreateBookPassage.Type;

export const UpdateBookPassage = Schema.Struct({
  id: Schema.String,
  page: Schema.NullOr(Words),
  words: Words,
  yourWords: Schema.Trim,
});
export type UpdateBookPassage = typeof UpdateBookPassage.Type;

export class BookPassageNotFound extends Schema.TaggedError<BookPassageNotFound>()(
  "BookPassageNotFound",
  { id: Schema.String },
) {}

export class BookPassageInUse extends Schema.TaggedError<BookPassageInUse>()("BookPassageInUse", {
  id: Schema.String,
  notes: Schema.Array(Schema.String),
}) {}

export const isPageNumber = (page: string): boolean =>
  /^\d/.test(page.trim()) || /^[ivxlcdm]+$/i.test(page.trim());

export const pageOrder = (page: string | null): number | null => {
  if (page === null) return null;
  const found = /\d+/.exec(page);
  return found === null ? null : Number(found[0]);
};

const FIRST_WORDS = 6;

export const passageFileTitle = (
  source: string,
  page: string | null,
  words: string,
  more = 0,
): string => {
  const location = page === null ? "" : isPageNumber(page) ? `p. ${page}` : page;
  const opening = words
    .replace(/[[\]|#^]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "")
    .slice(0, FIRST_WORDS + more)
    .join(" ");
  return toFileName([source, location, opening].filter((part) => part !== "").join(" "));
};

export const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

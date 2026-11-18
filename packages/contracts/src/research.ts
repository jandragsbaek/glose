import * as Schema from "effect/Schema";

import { type FoundPage, ResearchAsk } from "./session.ts";

const Words = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const DRAFT_PREFIX = "new-";

const DRAFT_ID = /^new-[a-z0-9]{6,32}$/;

export const isDraftId = (id: string): boolean => DRAFT_ID.test(id);

export const StartResearch = Schema.Struct({
  draft: Schema.String.pipe(Schema.check(Schema.isPattern(DRAFT_ID))),
  ask: ResearchAsk,
  title: Schema.Trim,
  text: Schema.Trim,
  question: Schema.Trim,
  notes: Schema.Array(Schema.String),
});
export type StartResearch = typeof StartResearch.Type;

export const PageDecision = Schema.Struct({ id: Schema.String, page: Schema.String });

export const NoteQuote = Schema.Struct({
  page: Schema.String,
  paragraph: Schema.Int,
  text: Schema.String,
});
export type NoteQuote = typeof NoteQuote.Type;

export const CreateNote = Schema.Struct({
  title: Words,
  text: Schema.Trim,
  session: Schema.NullOr(Schema.String),
  restsOn: Schema.NullOr(Schema.String),
  quotes: Schema.Array(NoteQuote),
  links: Schema.Array(Schema.String),
});
export type CreateNote = typeof CreateNote.Type;

export const PageProblem = Schema.Literals(["not-kept", "unreadable", "quote-gone"]);
export type PageProblem = typeof PageProblem.Type;

export class PageRefused extends Schema.TaggedError<PageRefused>()("PageRefused", {
  page: Schema.String,
  reason: PageProblem,
}) {}

export const splitName = (
  name: string | null,
): { readonly family: string; readonly given: string | null } | null => {
  const clean = name?.replace(/\s+/g, " ").trim() ?? "";
  if (clean === "") return null;
  const comma = /^([^,]+),\s*(.+)$/.exec(clean);
  if (comma !== null) return { family: comma[1]!.trim(), given: comma[2]!.trim() };
  const parts = clean.split(" ");
  const family = parts.pop()!;
  return { family, given: parts.length === 0 ? null : parts.join(" ") };
};

export const yearOf = (text: string | null): number | null => {
  const year = /\b(1\d{3}|20\d{2})\b/.exec(text ?? "")?.[1];
  return year === undefined ? null : Number(year);
};

const hostName = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const pageAuthorship = (
  page: Pick<FoundPage, "author" | "site" | "url" | "published">,
): {
  readonly familyName: string;
  readonly givenName: string | null;
  readonly firstPublished: number | null;
  readonly site: string;
} => {
  const person = splitName(page.author);
  const site = page.site?.trim() || hostName(page.url);
  return {
    familyName: person?.family ?? site,
    givenName: person?.given ?? null,
    firstPublished: yearOf(page.published),
    site,
  };
};

import type { ArticleType } from "@glose/contracts";

import type { detailsFromMarkdown } from "./importText.ts";

export const ARTICLE_FIELDS = [
  "familyName",
  "givenName",
  "otherAuthors",
  "title",
  "published",
  "container",
  "volume",
  "issue",
  "pages",
  "doi",
  "url",
  "accessed",
] as const;
export type ArticleField = (typeof ARTICLE_FIELDS)[number];
export type ArticleValues = Record<ArticleField, string>;

export const EMPTY_ARTICLE: ArticleValues = {
  familyName: "",
  givenName: "",
  otherAuthors: "",
  title: "",
  published: "",
  container: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
  accessed: "",
};

export const TYPES = ["paper", "web", "press"] as const satisfies ReadonlyArray<ArticleType>;

export const FIELDS_OF: Record<ArticleType, ReadonlyArray<ArticleField>> = {
  paper: ["volume", "issue", "pages", "doi", "url"],
  web: ["url", "accessed"],
  press: ["pages", "url"],
};

export const SHOWN_OF: Record<ArticleType, ReadonlyArray<ArticleField>> = {
  paper: ["doi"],
  web: ["url"],
  press: ["url"],
};

export const folded = (type: ArticleType): ReadonlyArray<ArticleField> =>
  FIELDS_OF[type].filter((name) => !SHOWN_OF[type].includes(name));

export const articleValuesOf = (
  details: ReturnType<typeof detailsFromMarkdown>,
): Partial<ArticleValues> => ({
  ...(details.family === null ? {} : { familyName: details.family }),
  ...(details.given === null ? {} : { givenName: details.given }),
  ...(details.otherAuthors.length === 0 ? {} : { otherAuthors: details.otherAuthors.join("\n") }),
  ...(details.title === null ? {} : { title: details.title }),
  ...(details.published === null ? {} : { published: details.published }),
  ...(details.container === null ? {} : { container: details.container }),
  ...(details.url === null ? {} : { url: details.url }),
  ...(details.doi === null ? {} : { doi: details.doi }),
});

export const fillFromFile = (
  current: ArticleValues,
  filledBefore: ReadonlyArray<ArticleField>,
  found: Partial<ArticleValues>,
): { readonly values: ArticleValues; readonly filled: ReadonlyArray<ArticleField> } => {
  const filled = ARTICLE_FIELDS.filter(
    (key) => found[key] !== undefined && (current[key].trim() === "" || filledBefore.includes(key)),
  );
  const stale = filledBefore.filter((key) => found[key] === undefined);
  return {
    values: {
      ...current,
      ...Object.fromEntries(stale.map((key) => [key, ""])),
      ...Object.fromEntries(filled.map((key) => [key, found[key] ?? ""])),
    },
    filled,
  };
};

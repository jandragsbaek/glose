import type { Article } from "@glose/contracts";

const DANISH = new Set([
  "og",
  "det",
  "er",
  "ikke",
  "at",
  "til",
  "af",
  "på",
  "med",
  "som",
  "jeg",
  "den",
  "har",
  "for",
  "de",
  "en",
  "et",
  "kan",
]);
const ENGLISH = new Set([
  "the",
  "and",
  "is",
  "of",
  "to",
  "in",
  "that",
  "it",
  "for",
  "with",
  "as",
  "are",
  "this",
  "be",
  "on",
  "not",
  "can",
]);

export const textLanguage = (article: Pick<Article, "units">): "da" | "en" | undefined => {
  let danish = 0;
  let english = 0;
  for (const unit of article.units.slice(0, 40)) {
    for (const word of unit.plain.toLocaleLowerCase("und").split(/[^\p{L}]+/u)) {
      if (DANISH.has(word)) danish += 1;
      if (ENGLISH.has(word)) english += 1;
    }
  }
  if (danish + english < 12) return undefined;
  if (danish > english * 1.5) return "da";
  if (english > danish * 1.5) return "en";
  return undefined;
};

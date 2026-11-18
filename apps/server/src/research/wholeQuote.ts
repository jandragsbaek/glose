import type { Article } from "@glose/contracts";

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

const WORD_PART = "\\p{L}\\p{M}\\p{N}\\p{Pd}_\\u00AD";
const QUOTE_START = `(?<![${WORD_PART}])(?<!['’](?=[\\p{L}\\p{N}]))`;
const QUOTE_END = `(?![${WORD_PART}])(?!(?<=[\\p{L}\\p{N}])['’])(?!\\.*['’][\\p{Script=Latin}\\p{N}])`;

export const findWholeQuote = (
  article: Pick<Article, "units">,
  quote: string,
): { readonly n: number; readonly text: string } | null => {
  const words = quote
    .trim()
    .replace(/^["'“”‘’«»„…\s]+|["'“”‘’«»„…\s]+$/g, "")
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return null;
  const pattern = new RegExp(
    `${QUOTE_START}${words.map((word) => word.replace(ESCAPE, "\\$&")).join("\\s+")}${QUOTE_END}`,
    "iu",
  );
  for (const unit of article.units) {
    const match = pattern.exec(unit.plain);
    if (match !== null) return { n: unit.n, text: match[0] };
  }
  return null;
};

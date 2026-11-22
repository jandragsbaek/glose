import { type BookPassage, isPageNumber, oneLine, pageOrder } from "@glose/contracts";

export const BAND = 20;

export interface PageBand {
  readonly key: string;
  readonly pages: readonly [number, number] | null;
  readonly passages: ReadonlyArray<BookPassage>;
}

const bandKey = (page: string | null): string => {
  const order = page !== null && isPageNumber(page) ? pageOrder(page) : null;
  return order === null ? "other" : String(Math.floor(order / BAND));
};

export const bandsOf = (passages: ReadonlyArray<BookPassage>): ReadonlyArray<PageBand> => {
  const bands = new Map<string, Array<BookPassage>>();
  for (const passage of passages) {
    const key = bandKey(passage.page);
    bands.set(key, [...(bands.get(key) ?? []), passage]);
  }
  return Array.from(bands, ([key, inBand]) => {
    if (key === "other") return { key, pages: null, passages: inBand };
    const start = Number(key) * BAND;
    return { key, pages: [Math.max(start, 1), start + BAND - 1] as const, passages: inBand };
  });
};

export const furthestPage = (passages: ReadonlyArray<BookPassage>): string | null =>
  passages.reduce<{ readonly page: string; readonly order: number } | null>((best, passage) => {
    if (passage.page === null || !isPageNumber(passage.page)) return best;
    const order = pageOrder(passage.page);
    if (order === null) return best;
    return best === null || order > best.order ? { page: passage.page, order } : best;
  }, null)?.page ?? null;

const LOCATION_TAIL =
  /(?:^|\n|\(|[-–—]\s*)\s*((?:Kindle\s+)?(?:Location|Loc\.?|Page|Side|Placering)\s+[0-9][0-9–-]*)\)?\s*\.?\s*$/i;

export const pastedLocation = (
  text: string,
): { readonly location: string; readonly words: string } | null => {
  const found = LOCATION_TAIL.exec(text);
  if (found === null || found[1] === undefined) return null;
  const words = text.slice(0, found.index).trim();
  if (words === "") return null;
  const location = found[1]
    .replace(/^Kindle\s+/i, "")
    .replace(/^Location\b/i, "Loc")
    .replace(/^Loc\.\s*/i, "Loc ")
    .replace(/^(?:Page|Side)\s+/i, "")
    .trim();
  return { location, words };
};

export const hasBrokenLines = (text: string): boolean => /[^\n]\n(?!\n)[^\n]/.test(text.trim());

export const joinLines = (text: string): string =>
  text
    .trim()
    .split(/\n[ \t]*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
        .replace(/\s*\n\s*/g, " ")
        .trim(),
    )
    .join("\n\n");

export const keptBefore = (
  passages: ReadonlyArray<BookPassage>,
  words: string,
): BookPassage | null => {
  const key = oneLine(words).toLocaleLowerCase();
  if (key === "") return null;
  return passages.find((passage) => oneLine(passage.words).toLocaleLowerCase() === key) ?? null;
};

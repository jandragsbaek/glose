import { type PlainNotes, timestampSeconds, timestampText } from "@glose/contracts";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const quotePattern = (quote: string, flags: string): RegExp | null => {
  const words = quote
    .trim()
    .replace(/^["'“”‘’«»„…\s]+|["'“”‘’«»„…\s]+$/g, "")
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return null;
  return new RegExp(words.map(escape).join("\\s+"), flags);
};

export const findQuote = (freeText: string, quote: string): string | null =>
  quotePattern(quote, "iu")?.exec(freeText)?.[0] ?? null;

const EDGE_STAMPS = /^(?:\s*\[[0-9:]+\])+\s*|\s*(?:\[[0-9:]+\]\s*)+$/g;

const timeOf = (text: string | null) => {
  const seconds = text === null ? null : timestampSeconds(text.replace(/^\[|\]$/g, ""));
  return seconds === null ? null : timestampText(seconds);
};

export const findInNotes = (
  { text: notes, stamps }: PlainNotes,
  quote: string,
  timestamp: string | null,
): { readonly text: string; readonly page: string | null } | null => {
  const pattern = quotePattern(quote.replace(EDGE_STAMPS, ""), "giu");
  if (pattern === null) return null;
  const found = Array.from(notes.matchAll(pattern)).flatMap((match) => {
    const start = match.index;
    const end = start + match[0].length;
    if (stamps.some((stamp) => stamp.start < end && stamp.end > start)) return [];
    const page = stamps.filter((stamp) => stamp.end <= start).at(-1)?.label ?? null;
    return [{ text: match[0], page }];
  });
  const [first] = found;
  if (first === undefined) return null;
  const named = timeOf(timestamp);
  const chosen = found.find((match) => named !== null && match.page === named);
  if (chosen !== undefined) return chosen;
  return found.every((match) => match.page === first.page) ? first : { ...first, page: null };
};

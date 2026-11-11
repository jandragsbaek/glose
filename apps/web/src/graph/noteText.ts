import { MARKDOWN_CODE, parseWikilink, WIKILINK } from "@glose/contracts";

/** Every part keeps `at`, its offset in the text around it, which keys it when rendered. */
export type Inline =
  | { readonly kind: "text"; readonly at: number; readonly text: string }
  | { readonly kind: "link"; readonly at: number; readonly target: string; readonly label: string };

export interface ListItem {
  readonly at: number;
  readonly inlines: ReadonlyArray<Inline>;
}

export type Block =
  | { readonly kind: "paragraph"; readonly at: number; readonly inlines: ReadonlyArray<Inline> }
  | { readonly kind: "list"; readonly at: number; readonly items: ReadonlyArray<ListItem> };

const codeRanges = (text: string, fencedOnly: boolean) =>
  Array.from(text.matchAll(MARKDOWN_CODE), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    fenced: /^(?:```|~~~)/.test(match[0]),
  })).filter((range) => range.fenced || !fencedOnly);

const codeAt = (ranges: ReturnType<typeof codeRanges>, at: number) =>
  ranges.find((range) => at >= range.start && at < range.end);

/** Text with its wikilinks; a wikilink inside code stays text, as the server makes no Link. */
const inlines = (text: string): ReadonlyArray<Inline> => {
  const code = codeRanges(text, false);
  const out: Array<Inline> = [];
  let last = 0;
  for (const match of text.matchAll(WIKILINK)) {
    const start = match.index;
    if (codeAt(code, start) !== undefined) continue;
    if (start > last) out.push({ kind: "text", at: last, text: text.slice(last, start) });
    out.push({ kind: "link", at: start, ...parseWikilink(match[1] ?? "") });
    last = start + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", at: last, text: text.slice(last) });
  return out;
};

const LIST_ITEM = /^\s*[-*+]\s+/;
const BLOCK = /\S(?:[\s\S]*?\S)?(?=\r?\n[ \t]*\r?\n|\s*$)/g;

/**
 * The few Markdown forms a Note in the side panel needs: paragraphs, bullet lists and
 * wikilinks. Anything else shows as the text it is.
 */
export const parseNoteText = (markdown: string): ReadonlyArray<Block> => {
  const fences = codeRanges(markdown, true);
  return Array.from(markdown.matchAll(BLOCK), (match): Block => {
    const lines = match[0].split(/\r?\n/);
    // A block that opens inside fenced code is text up to the fence's end, and Markdown after.
    const fence = codeAt(fences, match.index);
    if (fence !== undefined) {
      const cut = fence.end - match.index;
      const after = inlines(match[0].slice(cut)).map((part) => ({ ...part, at: part.at + cut }));
      return {
        kind: "paragraph",
        at: match.index,
        inlines: [{ kind: "text", at: 0, text: match[0].slice(0, cut) }, ...after],
      };
    }
    if (lines.every((line) => LIST_ITEM.test(line))) {
      let offset = 0;
      const items = lines.map((line) => {
        const item = { at: offset, inlines: inlines(line.replace(LIST_ITEM, "")) };
        offset += line.length + 1;
        return item;
      });
      return { kind: "list", at: match.index, items };
    }
    return {
      kind: "paragraph",
      at: match.index,
      inlines: inlines(lines.map((line) => line.trim()).join(" ")),
    };
  });
};

import { AI_CALLOUT, MARKDOWN_CODE, parseWikilink, WIKILINK } from "@glose/contracts";

/** Every piece keeps `at`, its offset in the text around it, which keys it when rendered. */
export type Inline =
  | { readonly kind: "text"; readonly at: number; readonly text: string }
  | { readonly kind: "link"; readonly at: number; readonly target: string; readonly label: string };

export interface ListItem {
  readonly at: number;
  readonly inlines: ReadonlyArray<Inline>;
}

export interface Heading {
  readonly kind: "heading";
  readonly at: number;
  /** 1 to 6, the number of `#`. */
  readonly level: number;
  readonly inlines: ReadonlyArray<Inline>;
}

/**
 * How much the AI wrote: paragraphs (`[!ai]`), a whole Part (`[!ai-part]`, with the heading
 * above it), or the whole Note (`ai: true` and no callout).
 */
export type AiScope = "paragraphs" | "part" | "note";

export type Block =
  | { readonly kind: "paragraph"; readonly at: number; readonly inlines: ReadonlyArray<Inline> }
  | { readonly kind: "list"; readonly at: number; readonly items: ReadonlyArray<ListItem> }
  | Heading
  | {
      readonly kind: "ai";
      readonly at: number;
      readonly scope: AiScope;
      /** A Part's heading, which the AI wrote too. */
      readonly heading: Heading | null;
      readonly blocks: ReadonlyArray<Block>;
    };

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
const HEADING = /^[ \t]{0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const BLOCK = /\S(?:[\s\S]*?\S)?(?=\r?\n[ \t]*\r?\n|\s*$)/g;
const QUOTE_MARKER = /^[ \t]*>[ \t]?/;

const plainBlock = (lines: ReadonlyArray<string>, at: number): Block => {
  if (lines.every((line) => LIST_ITEM.test(line))) {
    let offset = 0;
    const items = lines.map((line) => {
      const item = { at: offset, inlines: inlines(line.replace(LIST_ITEM, "")) };
      offset += line.length + 1;
      return item;
    });
    return { kind: "list", at, items };
  }
  return { kind: "paragraph", at, inlines: inlines(lines.map((line) => line.trim()).join(" ")) };
};

/** A callout's title, if any, is AI text too. */
const aiBlock = (lines: ReadonlyArray<string>, at: number): Block => {
  const [header = "", ...rest] = lines;
  const [, part, title = ""] = AI_CALLOUT.exec(header) ?? [];
  const text = rest.map((line) => line.replace(QUOTE_MARKER, "")).join("\n");
  return {
    kind: "ai",
    at,
    scope: part === undefined ? "paragraphs" : "part",
    heading: null,
    blocks: parseBlocks(title === "" ? text : `${title}\n\n${text}`),
  };
};

type Fences = ReturnType<typeof codeRanges>;

/**
 * Headings and callouts may start on any line of a block, as they may in Markdown, but not
 * inside fenced code. A callout runs to the next blank line or heading, as in Obsidian; lines
 * without `>` continue it, as a quote's lazy lines do.
 */
const splitBlock = (text: string, at: number, fences: Fences): ReadonlyArray<Block> => {
  // Split on `\n` alone, so the offsets count a Windows `\r\n` as the two characters it is.
  const raw = text.split("\n");
  const all = raw.map((line) => line.replace(/\r$/, ""));
  const starts: Array<number> = [];
  let offset = at;
  for (const line of raw) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const markdownAt = (index: number) => codeAt(fences, starts[index] ?? at) === undefined;
  const headingAt = (index: number) => markdownAt(index) && HEADING.exec(all[index] ?? "");

  const blocks: Array<Block> = [];
  let lines: Array<string> = [];
  let linesAt = at;
  const flush = () => {
    if (lines.length > 0) blocks.push(plainBlock(lines, linesAt));
    lines = [];
  };
  for (let index = 0; index < all.length; index += 1) {
    const line = all[index] ?? "";
    const lineAt = starts[index] ?? at;
    const heading = headingAt(index);
    if (markdownAt(index) && AI_CALLOUT.test(line)) {
      flush();
      let end = index + 1;
      while (end < all.length && !headingAt(end)) end += 1;
      blocks.push(aiBlock(all.slice(index, end), lineAt));
      index = end - 1;
    } else if (heading) {
      flush();
      const level = heading[1]?.length ?? 1;
      blocks.push({ kind: "heading", at: lineAt, level, inlines: inlines(heading[2] ?? "") });
    } else {
      if (lines.length === 0) linesAt = lineAt;
      lines.push(line);
    }
  }
  flush();
  return blocks;
};

/** A Part's heading belongs to its AI text: the `[!ai-part]` callout right under it. */
const joinPartHeadings = (blocks: ReadonlyArray<Block>): ReadonlyArray<Block> =>
  blocks.flatMap((block, index): ReadonlyArray<Block> => {
    const next = blocks[index + 1];
    if (block.kind === "heading" && next?.kind === "ai" && next.scope === "part") return [];
    const before = blocks[index - 1];
    return block.kind === "ai" && block.scope === "part" && before?.kind === "heading"
      ? [{ ...block, at: before.at, heading: before }]
      : [block];
  });

const parseBlocks = (markdown: string): ReadonlyArray<Block> => {
  const fences = codeRanges(markdown, true);
  const blocks = Array.from(markdown.matchAll(BLOCK)).flatMap((match): ReadonlyArray<Block> => {
    // A block that opens inside fenced code is text to the end of the fence's last line, and
    // Markdown after.
    const fence = codeAt(fences, match.index);
    if (fence === undefined) return splitBlock(match[0], match.index, fences);
    const lineEnd = match[0].indexOf("\n", fence.end - match.index);
    const cut = lineEnd === -1 ? match[0].length : lineEnd;
    const after =
      lineEnd === -1 ? [] : splitBlock(match[0].slice(cut + 1), match.index + cut + 1, fences);
    return [
      {
        kind: "paragraph",
        at: match.index,
        inlines: [{ kind: "text", at: 0, text: match[0].slice(0, cut).trimEnd() }],
      },
      ...after,
    ];
  });
  return joinPartHeadings(blocks);
};

/**
 * The few Markdown forms a Note in the side panel needs: paragraphs, bullet lists, headings,
 * wikilinks and AI text. Anything else shows as the text it is. A Note marked `ai: true` that
 * marks no paragraph or Part is AI text as a whole.
 */
export const parseNoteText = (markdown: string, aiText = false): ReadonlyArray<Block> => {
  const blocks = parseBlocks(markdown);
  return aiText && !blocks.some((block) => block.kind === "ai") && blocks.length > 0
    ? [{ kind: "ai", at: 0, scope: "note", heading: null, blocks }]
    : blocks;
};

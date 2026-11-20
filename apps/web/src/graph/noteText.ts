import { AI_CALLOUT, parseWikilink, WIKILINK } from "@glose/contracts";

export type Inline =
  | { readonly kind: "text"; readonly at: number; readonly text: string }
  | { readonly kind: "link"; readonly at: number; readonly target: string; readonly label: string }
  | { readonly kind: "note"; readonly at: number; readonly label: string }
  | { readonly kind: "code"; readonly at: number; readonly text: string };

export interface ListItem {
  readonly at: number;
  readonly inlines: ReadonlyArray<Inline>;
}

export interface Heading {
  readonly kind: "heading";
  readonly at: number;
  readonly level: number;
  readonly inlines: ReadonlyArray<Inline>;
}

export type AiScope = "paragraphs" | "part" | "note";

export interface CodeBlock {
  readonly kind: "code";
  readonly at: number;
  readonly lang: string;
  readonly text: string;
}

export type Block =
  | { readonly kind: "paragraph"; readonly at: number; readonly inlines: ReadonlyArray<Inline> }
  | { readonly kind: "list"; readonly at: number; readonly items: ReadonlyArray<ListItem> }
  | Heading
  | CodeBlock
  | {
      readonly kind: "ai";
      readonly at: number;
      readonly scope: AiScope;
      readonly heading: Heading | null;
      readonly blocks: ReadonlyArray<Block>;
    };

interface Fence {
  readonly start: number;
  readonly end: number;
  readonly lang: string;
  readonly text: string;
}

const FENCE_OPEN = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

const fencesOf = (markdown: string): ReadonlyArray<Fence> => {
  const fences: Array<Fence> = [];
  let open: { start: number; indent: number; marker: string; lang: string } | null = null;
  let lines: Array<string> = [];
  let offset = 0;
  for (const raw of markdown.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (open === null) {
      const match = FENCE_OPEN.exec(line);
      const marker = match?.[2] ?? "";
      const info = (match?.[3] ?? "").trim();
      if (match && !(marker.startsWith("`") && info.includes("`"))) {
        const lang = (info.split(/\s+/)[0] ?? "").replace(/^\{?\.?/, "").replace(/\}$/, "");
        open = { start: offset, indent: match[1]?.length ?? 0, marker, lang: lang.toLowerCase() };
        lines = [];
      }
    } else {
      const close = FENCE_CLOSE.exec(line)?.[1];
      if (
        close !== undefined &&
        close[0] === open.marker[0] &&
        close.length >= open.marker.length
      ) {
        fences.push({ ...open, end: offset + raw.length, text: lines.join("\n") });
        open = null;
      } else {
        lines.push(line.replace(new RegExp(`^ {0,${open.indent}}`), ""));
      }
    }
    offset += raw.length + 1;
  }
  if (open !== null) fences.push({ ...open, end: markdown.length, text: lines.join("\n") });
  return fences;
};

interface Span {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

const codeSpans = (text: string): ReadonlyArray<Span> => {
  const runs = Array.from(text.matchAll(/`+/g));
  const spans: Array<Span> = [];
  for (let index = 0; index < runs.length; index += 1) {
    const open = runs[index]!;
    const closeAt = runs.findIndex(
      (run, other) => other > index && run[0].length === open[0].length,
    );
    if (closeAt === -1) continue;
    const close = runs[closeAt]!;
    const inner = text.slice(open.index + open[0].length, close.index).replace(/\r?\n/g, " ");
    const strip = inner.startsWith(" ") && inner.endsWith(" ") && inner.trim() !== "";
    spans.push({
      start: open.index,
      end: close.index + close[0].length,
      text: strip ? inner.slice(1, -1) : inner,
    });
    index = closeAt;
  }
  return spans;
};

const FOOTNOTE = /(?<!\\)\[\^q(\d{1,4})\](:[ \t]?)?/g;

const withNotes = (
  part: Extract<Inline, { kind: "text" }>,
  paragraph: boolean,
): ReadonlyArray<Inline> => {
  const out: Array<Inline> = [];
  let last = 0;
  for (const match of part.text.matchAll(FOOTNOTE)) {
    const definition = paragraph && part.at === 0 && match.index === 0 && match[2] !== undefined;
    const length = definition ? match[0].length : match[0].length - (match[2]?.length ?? 0);
    if (match.index > last) {
      out.push({ kind: "text", at: part.at + last, text: part.text.slice(last, match.index) });
    }
    out.push({ kind: "note", at: part.at + match.index, label: match[1]! });
    last = match.index + length;
  }
  if (last < part.text.length) {
    out.push({ kind: "text", at: part.at + last, text: part.text.slice(last) });
  }
  return out;
};

const wikilinked = (text: string, at: number): ReadonlyArray<Inline> => {
  const out: Array<Inline> = [];
  let last = 0;
  for (const match of text.matchAll(WIKILINK)) {
    const start = match.index;
    if (start > last) out.push({ kind: "text", at: at + last, text: text.slice(last, start) });
    out.push({ kind: "link", at: at + start, ...parseWikilink(match[1] ?? "") });
    last = start + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", at: at + last, text: text.slice(last) });
  return out;
};

const outsideLinks = (text: string, spans: ReadonlyArray<Span>): ReadonlyArray<Span> => {
  const links = Array.from(text.matchAll(WIKILINK)).filter(
    (link) => !spans.some((span) => link.index >= span.start && link.index < span.end),
  );
  return spans.filter(
    (span) =>
      !links.some((link) => span.start < link.index + link[0].length && span.end > link.index),
  );
};

const inlines = (text: string, paragraph = false): ReadonlyArray<Inline> => {
  const out: Array<Inline> = [];
  const prose = (from: number, to: number) => {
    if (to <= from) return;
    for (const part of wikilinked(text.slice(from, to), from)) {
      out.push(...(part.kind === "text" ? withNotes(part, paragraph) : [part]));
    }
  };
  let last = 0;
  for (const span of outsideLinks(text, codeSpans(text))) {
    prose(last, span.start);
    out.push({ kind: "code", at: span.start, text: span.text });
    last = span.end;
  }
  prose(last, text.length);
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
  return {
    kind: "paragraph",
    at,
    inlines: inlines(lines.map((line) => line.trim()).join(" "), true),
  };
};

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

const splitBlock = (text: string, at: number): ReadonlyArray<Block> => {
  const raw = text.split("\n");
  const all = raw.map((line) => line.replace(/\r$/, ""));
  const starts: Array<number> = [];
  let offset = at;
  for (const line of raw) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const headingAt = (index: number) => HEADING.exec(all[index] ?? "");

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
    if (AI_CALLOUT.test(line)) {
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
  const blocks: Array<Block> = [];
  const prose = (from: number, to: number) => {
    for (const match of markdown.slice(from, to).matchAll(BLOCK)) {
      blocks.push(...splitBlock(match[0], from + match.index));
    }
  };
  let last = 0;
  for (const fence of fencesOf(markdown)) {
    prose(last, fence.start);
    blocks.push({ kind: "code", at: fence.start, lang: fence.lang, text: fence.text });
    last = fence.end;
  }
  prose(last, markdown.length);
  return joinPartHeadings(blocks);
};

export const parseNoteText = (markdown: string, aiText = false): ReadonlyArray<Block> => {
  const blocks = parseBlocks(markdown);
  return aiText && !blocks.some((block) => block.kind === "ai") && blocks.length > 0
    ? [{ kind: "ai", at: 0, scope: "note", heading: null, blocks }]
    : blocks;
};

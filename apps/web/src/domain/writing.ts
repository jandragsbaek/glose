import {
  type GraphNode,
  linkKey,
  REFERENCE,
  type ReferenceLookup,
  referenceLookup,
  type ResolvedReference,
  type Source,
} from "@glose/contracts";

import { emphasisSpans, REFERENCE_MASK, textBlocks } from "./emphasis.ts";
import { wordCount } from "./source.ts";

export const proseWords = (body: string): number => wordCount(body.replace(REFERENCE, " "));

export type ProofInline =
  | {
      readonly kind: "text";
      readonly at: number;
      readonly text: string;
      readonly strong: boolean;
      readonly em: boolean;
    }
  | { readonly kind: "reference"; readonly at: number; readonly reference: ResolvedReference };

export type ProofBlock =
  | {
      readonly kind: "paragraph" | "quote";
      readonly at: number;
      readonly inlines: ReadonlyArray<ProofInline>;
      readonly references: ReadonlyArray<ResolvedReference>;
    }
  | {
      readonly kind: "heading";
      readonly at: number;
      readonly level: number;
      readonly inlines: ReadonlyArray<ProofInline>;
      readonly references: ReadonlyArray<ResolvedReference>;
    }
  | {
      readonly kind: "list";
      readonly at: number;
      readonly ordered: boolean;
      readonly items: ReadonlyArray<ReadonlyArray<ProofInline>>;
      readonly references: ReadonlyArray<ResolvedReference>;
    };

const inlines = (
  body: string,
  start: number,
  end: number,
  references: ReadonlyArray<ResolvedReference>,
  prefix: RegExp | null = null,
): ReadonlyArray<ProofInline> => {
  const inside = references.filter((reference) => reference.start >= start && reference.end <= end);
  const chars = body.slice(start, end).split("");
  const length = end - start;
  const hidden = new Uint8Array(length);
  for (const reference of inside) {
    for (let i = reference.start - start; i < reference.end - start; i++) {
      chars[i] = REFERENCE_MASK;
    }
  }
  if (prefix !== null) {
    let lineStart = 0;
    for (const line of body.slice(start, end).split("\n")) {
      const marker = prefix.exec(line)?.[0].length ?? 0;
      for (let i = lineStart; i < lineStart + marker; i++) {
        hidden[i] = 1;
        chars[i] = " ";
      }
      lineStart += line.length + 1;
    }
  }
  const strong = new Uint8Array(length);
  const em = new Uint8Array(length);
  for (const span of emphasisSpans(chars.join(""))) {
    for (let i = 0; i < span.size; i++) {
      hidden[span.open + i] = 1;
      hidden[span.close + i] = 1;
    }
    const depth = span.kind === "strong" ? strong : em;
    for (let i = span.open + span.size; i < span.close; i++) depth[i] = 1;
  }
  const out: Array<ProofInline> = [];
  let text = "";
  let textAt = start;
  let style = { strong: false, em: false };
  const flush = () => {
    if (text !== "") out.push({ kind: "text", at: textAt, text, ...style });
    text = "";
  };
  for (let i = 0; i < length; i++) {
    const reference = inside.find((item) => item.start - start === i);
    if (reference !== undefined) {
      text = text.replace(/[ \t]+$/, "");
      flush();
      out.push({ kind: "reference", at: reference.start, reference });
      i = reference.end - start - 1;
      continue;
    }
    if (hidden[i] === 1) continue;
    const next = { strong: strong[i] === 1, em: em[i] === 1 };
    if (next.strong !== style.strong || next.em !== style.em) {
      flush();
      style = next;
    }
    if (text === "") textAt = start + i;
    const char = body[start + i] ?? "";
    text += char === "\n" ? " " : char;
  }
  flush();
  return out;
};

const HEADING = /^(#{1,6})\s+/;
const QUOTE = /^>\s?/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/;

export const proofBlocks = (
  body: string,
  references: ReadonlyArray<ResolvedReference>,
): ReadonlyArray<ProofBlock> => {
  const blocks: Array<ProofBlock> = [];
  for (const { start, end } of textBlocks(body)) {
    const raw = body.slice(start, end);
    const inside = references.filter(
      (reference) => reference.start >= start && reference.end <= end,
    );
    const heading = HEADING.exec(raw);
    if (heading) {
      const offset = heading[0].length;
      blocks.push({
        kind: "heading",
        at: start,
        level: heading[1]?.length ?? 1,
        inlines: inlines(body, start + offset, end, inside),
        references: inside,
      });
    } else if (raw.split("\n").every((line) => QUOTE.test(line))) {
      blocks.push({
        kind: "quote",
        at: start,
        inlines: inlines(body, start, end, inside, QUOTE),
        references: inside,
      });
    } else if (raw.split("\n").every((line) => BULLET.test(line))) {
      let lineStart = start;
      const items: Array<ReadonlyArray<ProofInline>> = [];
      for (const line of raw.split("\n")) {
        const marker = BULLET.exec(line)?.[0].length ?? 0;
        items.push(inlines(body, lineStart + marker, lineStart + line.length, inside));
        lineStart += line.length + 1;
      }
      blocks.push({
        kind: "list",
        at: start,
        ordered: /^\s*\d/.test(raw),
        items,
        references: inside,
      });
    } else {
      blocks.push({
        kind: "paragraph",
        at: start,
        inlines: inlines(body, start, end, inside),
        references: inside,
      });
    }
  }
  return blocks;
};

export const citationParts = (
  citation: string,
): ReadonlyArray<{ readonly text: string; readonly italic: boolean }> =>
  citation
    .split(/(\*[^*]+\*)/)
    .filter((part) => part !== "")
    .map((part) =>
      /^\*[^*]+\*$/.test(part)
        ? { text: part.slice(1, -1), italic: true }
        : { text: part, italic: false },
    );

export const insertionAfter = (body: string, excerpt: string): number | null => {
  const at = body.indexOf(excerpt);
  if (at < 0) return null;
  if (/[.!?]$/.test(excerpt)) return at + excerpt.length;
  const rest = body.slice(at + excerpt.length);
  const sentence = /^[^.!?\n]*[.!?]?/.exec(rest)?.[0] ?? "";
  return at + excerpt.length + sentence.length;
};

const HEADING_LINE = /^(#{1,6})[ \t]+/;

export const headingOf = (
  line: string,
): { readonly level: number; readonly marker: number } | null => {
  const match = HEADING_LINE.exec(line);
  return match === null ? null : { level: match[1]?.length ?? 1, marker: match[0].length };
};

export const hugWord = (body: string, at: number): number =>
  at > 1 && body[at - 1] === " " && /\S/.test(body[at - 2] ?? "") ? at - 1 : at;

export interface SlipEntry {
  readonly node: GraphNode;
  readonly key: string;
  readonly source: Source | null;
  readonly title: string;
  readonly titleAbout: string;
  readonly all: string;
}

export interface SlipIndex {
  readonly entries: ReadonlyArray<SlipEntry>;
  readonly sourceOf: (node: GraphNode) => Source | null;
}

const slipIndexes = new WeakMap<
  ReadonlyArray<GraphNode>,
  { readonly sources: ReadonlyArray<Source>; readonly index: SlipIndex }
>();

export const slipIndex = (
  nodes: ReadonlyArray<GraphNode>,
  sources: ReadonlyArray<Source>,
): SlipIndex => {
  const kept = slipIndexes.get(nodes);
  if (kept !== undefined && kept.sources === sources) return kept.index;
  const sourceByKey = new Map(sources.map((source) => [linkKey(source.id), source]));
  const sourceOf = (node: GraphNode) =>
    node.kind === "source"
      ? (sourceByKey.get(linkKey(node.id)) ?? null)
      : node.sourceId === null
        ? null
        : (sourceByKey.get(linkKey(node.sourceId)) ?? null);
  const entries = nodes.map((node): SlipEntry => {
    const source = sourceOf(node);
    const about =
      source === null ? "" : `${source.givenName ?? ""} ${source.familyName} ${source.title}`;
    const title = `${node.id} ${node.title}`.toLocaleLowerCase();
    const titleAbout = `${title} ${about.toLocaleLowerCase()}`;
    return {
      node,
      key: linkKey(node.id),
      source,
      title,
      titleAbout,
      all: `${titleAbout} ${node.body.toLocaleLowerCase()}`,
    };
  });
  const index = { entries, sourceOf };
  slipIndexes.set(nodes, { sources, index });
  return index;
};

export const rankOf = (words: ReadonlyArray<string>, entry: SlipEntry): number | null => {
  if (words.every((word) => entry.title.includes(word))) return 0;
  if (words.every((word) => entry.titleAbout.includes(word))) return 1;
  if (words.every((word) => entry.all.includes(word))) return 2;
  return null;
};

export const byText = new Intl.Collator().compare;

const referenceLookups = new WeakMap<
  ReadonlyArray<GraphNode>,
  { readonly sources: ReadonlyArray<Source>; readonly lookup: ReferenceLookup }
>();

export const graphReferences = (
  nodes: ReadonlyArray<GraphNode>,
  sources: ReadonlyArray<Source>,
): ReferenceLookup => {
  const kept = referenceLookups.get(nodes);
  if (kept !== undefined && kept.sources === sources) return kept.lookup;
  const lookup = referenceLookup(nodes, sources);
  referenceLookups.set(nodes, { sources, lookup });
  return lookup;
};

export const noteExcerpt = (body: string, words: ReadonlyArray<string> = [], max = 140): string => {
  const text = body
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/\[!ai(?:-part)?\][-+]?/gi, "")
    .replace(/\[\[([^[\]|]+)\|([^[\]]+)\]\]/g, "$2")
    .replace(/\[\[([^[\]]+)\]\]/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*>`]/g, "")
    .replace(/(^|[^\p{L}\p{N}])_+|_+(?=[^\p{L}\p{N}]|$)/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = text.match(/[^.!?]+[.!?]*(?=\s|$)/g) ?? [text];
  const lower = words.map((word) => word.toLocaleLowerCase());
  const sentence =
    (lower.length === 0
      ? undefined
      : (sentences.find((item) => lower.every((word) => item.toLocaleLowerCase().includes(word))) ??
        sentences.find((item) => lower.some((word) => item.toLocaleLowerCase().includes(word))))) ??
    sentences[0] ??
    text;
  const trimmed = sentence.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
};

export const referenceLead = (body: string, start: number): number => {
  let lead = start;
  while (lead > 0 && (body[lead - 1] === " " || body[lead - 1] === "\t")) lead -= 1;
  return lead > 0 && body[lead - 1] !== "\n" ? lead : start;
};

export const sentenceAround = (body: string, from: number, to: number) => {
  const before = body.slice(0, from);
  const start = Math.max(
    before.lastIndexOf("\n") + 1,
    ...[...before.matchAll(/[.!?]["”’)]*\s+/gu)].map((match) => match.index + match[0].length),
  );
  const after = body.slice(to);
  const end = after.search(/[.!?]|\n/u);
  return body.slice(start, end < 0 ? body.length : to + end + 1).trim();
};

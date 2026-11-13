import { REFERENCE, type ResolvedReference } from "@glose/contracts";

import { wordCount } from "./source.ts";

/** The words of the prose; a Reference is a pointer, not words. */
export const proseWords = (body: string): number => wordCount(body.replace(REFERENCE, " "));

/** One piece of a line of prose in Proof. */
export type ProofInline =
  | { readonly kind: "text"; readonly at: number; readonly text: string }
  | { readonly kind: "em" | "strong"; readonly at: number; readonly text: string }
  | { readonly kind: "reference"; readonly at: number; readonly reference: ResolvedReference };

export type ProofBlock =
  | {
      readonly kind: "paragraph" | "quote";
      readonly at: number;
      readonly inlines: ReadonlyArray<ProofInline>;
      /** The References in this block, in order (side notes go beside it). */
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

const EMPHASIS = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_/g;

/** Text with `*em*`, `**strong**` and `_em_`; other Markdown shows as written. */
const emphasis = (text: string, at: number): ReadonlyArray<ProofInline> => {
  const out: Array<ProofInline> = [];
  let last = 0;
  for (const match of text.matchAll(EMPHASIS)) {
    if (match.index > last) {
      out.push({ kind: "text", at: at + last, text: text.slice(last, match.index) });
    }
    out.push(
      match[1] === undefined
        ? { kind: "em", at: at + match.index, text: match[2] ?? match[3] ?? "" }
        : { kind: "strong", at: at + match.index, text: match[1] },
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", at: at + last, text: text.slice(last) });
  return out;
};

/** A stretch of the prose, `[start, end)`, with its References in place. */
const inlines = (
  body: string,
  start: number,
  end: number,
  references: ReadonlyArray<ResolvedReference>,
  strip: (line: string) => string = (line) => line,
): ReadonlyArray<ProofInline> => {
  const out: Array<ProofInline> = [];
  let cursor = start;
  const text = (from: number, to: number) => {
    if (to <= from) return;
    const raw = body
      .slice(from, to)
      .split("\n")
      .map((line, index) => (index === 0 && from !== start ? line : strip(line)))
      .join(" ");
    out.push(...emphasis(raw, from));
  };
  for (const reference of references) {
    if (reference.start < start || reference.end > end) continue;
    text(cursor, reference.start);
    out.push({ kind: "reference", at: reference.start, reference });
    cursor = reference.end;
  }
  text(cursor, end);
  return out;
};

const HEADING = /^(#{1,6})\s+/;
const QUOTE = /^>\s?/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/;

/**
 * The prose as readers see it: paragraphs, headings, quotes and lists, each with the References
 * it holds. A blank line ends a block, as in Markdown.
 */
export const proofBlocks = (
  body: string,
  references: ReadonlyArray<ResolvedReference>,
): ReadonlyArray<ProofBlock> => {
  const blocks: Array<ProofBlock> = [];
  for (const match of body.matchAll(/[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g)) {
    const raw = match[0];
    if (raw.trim() === "") continue;
    const start = match.index;
    const end = start + raw.length;
    const inside = references.filter(
      (reference) => reference.start >= start && reference.end <= end,
    );
    const heading = HEADING.exec(raw);
    if (heading && !raw.includes("\n")) {
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
        inlines: inlines(body, start, end, inside, (line) => line.replace(QUOTE, "")).map(
          (part, index) =>
            index === 0 && part.kind === "text"
              ? { ...part, text: part.text.replace(QUOTE, "") }
              : part,
        ),
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

/** `*Deep Work*` in a Citation as text and italic parts. */
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

/** Where to put a Reference after a passage: after the sentence's last word, before a space. */
export const insertionAfter = (body: string, excerpt: string): number | null => {
  const at = body.indexOf(excerpt);
  if (at < 0) return null;
  const rest = body.slice(at + excerpt.length);
  const sentence = /^[^.!?\n]*[.!?]?/.exec(rest)?.[0] ?? "";
  return at + excerpt.length + sentence.length;
};

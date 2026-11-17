import { findReferences } from "@glose/contracts";

export interface EmphasisSpan {
  readonly kind: "strong" | "em";
  readonly open: number;
  readonly close: number;
  readonly size: 1 | 2;
}

export const REFERENCE_MASK = "￼";

const isSpace = (char: string) => char === "" || /\s/u.test(char);

const isPunctuation = (char: string) => char !== REFERENCE_MASK && /[\p{P}\p{S}]/u.test(char);

interface Opener {
  readonly char: string;
  readonly pos: number;
  remaining: number;
}

export const emphasisSpans = (text: string): ReadonlyArray<EmphasisSpan> => {
  const spans: Array<EmphasisSpan> = [];
  const openers: Array<Opener> = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i] ?? "";
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char === "`") {
      let ticks = 1;
      while (text[i + ticks] === "`") ticks += 1;
      const fence = "`".repeat(ticks);
      const close = text.indexOf(fence, i + ticks);
      i = close < 0 ? i + ticks : close + ticks;
      continue;
    }
    if (char !== "*" && char !== "_") {
      if (char === "\n" && text[i + 1] === "\n") openers.length = 0;
      i += 1;
      continue;
    }
    let n = 1;
    while (text[i + n] === char) n += 1;
    const before = text[i - 1] ?? "";
    const after = text[i + n] ?? "";
    const left =
      !isSpace(after) && (!isPunctuation(after) || isSpace(before) || isPunctuation(before));
    const right =
      !isSpace(before) && (!isPunctuation(before) || isSpace(after) || isPunctuation(after));
    const canOpen = char === "*" ? left : left && (!right || isPunctuation(before));
    const canClose = char === "*" ? right : right && (!left || isPunctuation(after));
    let remaining = n;
    if (canClose) {
      while (remaining > 0) {
        const at = openers.findLastIndex((opener) => opener.char === char);
        const opener = openers[at];
        if (opener === undefined) break;
        const size: 1 | 2 = remaining >= 2 && opener.remaining >= 2 ? 2 : 1;
        spans.push({
          kind: size === 2 ? "strong" : "em",
          open: opener.pos + opener.remaining - size,
          close: i + (n - remaining),
          size,
        });
        opener.remaining -= size;
        remaining -= size;
        openers.length = opener.remaining === 0 ? at : at + 1;
      }
    }
    if (remaining > 0 && canOpen) {
      openers.push({ char, pos: i + (n - remaining), remaining });
    }
    i += n;
  }
  return spans;
};

export const maskReferences = (text: string): string => {
  let out = text;
  for (const token of findReferences(text)) {
    out =
      out.slice(0, token.start) +
      REFERENCE_MASK.repeat(token.end - token.start) +
      out.slice(token.end);
  }
  return out;
};

const HEADING_LINE = /^#{1,6}[ \t]+/;

export const textBlocks = (
  body: string,
): ReadonlyArray<{ readonly start: number; readonly end: number; readonly heading: boolean }> => {
  const blocks: Array<{ start: number; end: number; heading: boolean }> = [];
  let open: { start: number; end: number } | null = null;
  let at = 0;
  for (const line of body.split("\n")) {
    const end = at + line.length;
    if (line.trim() === "" || HEADING_LINE.test(line)) {
      if (open !== null) blocks.push({ ...open, heading: false });
      open = null;
      if (line.trim() !== "") blocks.push({ start: at, end, heading: true });
    } else if (open === null) {
      open = { start: at, end };
    } else {
      open.end = end;
    }
    at = end + 1;
  }
  if (open !== null) blocks.push({ ...open, heading: false });
  return blocks;
};

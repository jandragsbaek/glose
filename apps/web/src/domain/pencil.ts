import { findReferences } from "@glose/contracts";

import { emphasisSpans, textBlocks } from "./emphasis.ts";
import {
  IRREGULAR_DA,
  IRREGULAR_EN,
  NOT_PASSIVE_EN,
  pencilWordsFor,
  type PencilWords,
} from "./pencilWords.ts";
import { sentenceAround } from "./writing.ts";

export const PENCIL_GROUPS = ["habits", "cliches", "repetition", "mechanics"] as const;
export type PencilGroup = (typeof PENCIL_GROUPS)[number];

export type PencilRule =
  | "crutch"
  | "filter"
  | "redundant"
  | "adverb"
  | "passive"
  | "there-is"
  | "same-start"
  | "cliche"
  | "doubled"
  | "open-quote"
  | "open-bracket"
  | "open-emphasis";

export const GROUP_OF: Readonly<Record<PencilRule, PencilGroup>> = {
  crutch: "habits",
  filter: "habits",
  redundant: "habits",
  adverb: "habits",
  passive: "habits",
  "there-is": "habits",
  "same-start": "habits",
  cliche: "cliches",
  doubled: "mechanics",
  "open-quote": "mechanics",
  "open-bracket": "mechanics",
  "open-emphasis": "mechanics",
};

export interface PencilMark {
  readonly from: number;
  readonly to: number;
  readonly rule: PencilRule;
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

const RANK: ReadonlyArray<PencilRule> = [
  "doubled",
  "cliche",
  "redundant",
  "adverb",
  "filter",
  "passive",
  "there-is",
  "same-start",
  "crutch",
  "open-quote",
  "open-bracket",
  "open-emphasis",
];

const LETTER = "\\p{L}\\p{N}";
const BEFORE = `(?<![${LETTER}'’-])`;
const AFTER = `(?![${LETTER}'’-])`;
const GAP = "[\\s*_]+";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const phraseSource = (phrase: string) =>
  phrase.replaceAll("’", "'").split(/\s+/u).map(escape).join(GAP);

const phrasesPattern = (phrases: ReadonlyArray<string>): RegExp | null => {
  if (phrases.length === 0) return null;
  const sorted = [...new Set(phrases.map(phraseSource))].sort((a, b) => b.length - a.length);
  return new RegExp(`${BEFORE}(?:${sorted.join("|")})${AFTER}`, "giu");
};

interface Patterns {
  readonly words: PencilWords;
  readonly crutch: RegExp | null;
  readonly filter: RegExp | null;
  readonly redundant: RegExp | null;
  readonly cliche: RegExp | null;
  readonly thereIs: RegExp | null;
  readonly adverb: RegExp | null;
  readonly passive: RegExp | null;
}

const patternCache = new Map<string, Patterns | null>();

const patternsFor = (language: string): Patterns | null => {
  const base = language.toLowerCase().split("-")[0] ?? "";
  const cached = patternCache.get(base);
  if (cached !== undefined) return cached;
  const words = pencilWordsFor(base);
  let made: Patterns | null = null;
  if (words !== null) {
    const english = base === "en";
    made = {
      words,
      crutch: phrasesPattern(words.crutch),
      filter: phrasesPattern(words.filter),
      redundant: phrasesPattern(words.redundant),
      cliche: phrasesPattern(words.cliches),
      thereIs: phrasesPattern(words.expletive),
      adverb: english
        ? new RegExp(
            `${BEFORE}(?:${words.intensifiers.map(escape).join("|")})${GAP}\\p{L}{3,}ly${AFTER}`,
            "giu",
          )
        : null,
      passive: english
        ? new RegExp(
            `${BEFORE}(?:am|is|are|was|were|be|been|being|get|gets|got|getting)${GAP}(?:\\p{L}+ly${GAP})?(\\p{L}{3,}ed|${IRREGULAR_EN.join("|")})${AFTER}`,
            "giu",
          )
        : base === "da"
          ? new RegExp(
              `${BEFORE}(?:blev|bliver|blevet|blive)${GAP}(?:\\p{L}+${GAP})?(\\p{L}{3,}et|${IRREGULAR_DA.join("|")})${AFTER}`,
              "giu",
            )
          : null,
    };
  }
  patternCache.set(base, made);
  return made;
};

const blank = (text: string, from: number, to: number) =>
  text.slice(0, from) + text.slice(from, to).replace(/[^\n]/g, " ") + text.slice(to);

export const pencilText = (body: string): string => {
  let text = body;
  for (const token of findReferences(body)) text = blank(text, token.start, token.end);
  for (const match of body.matchAll(/<!--[\s\S]*?(?:-->|$)/gu)) {
    text = blank(text, match.index, match.index + match[0].length);
  }
  let fence: number | null = null;
  let at = 0;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      if (fence === null) fence = at;
      else {
        text = blank(text, fence, at + line.length);
        fence = null;
      }
    }
    at += line.length + 1;
  }
  if (fence !== null) text = blank(text, fence, body.length);
  for (const match of text.matchAll(/(`+)[^`\n]*?\1/gu)) {
    text = blank(text, match.index, match.index + match[0].length);
  }
  return text.replaceAll("’", "'");
};

const SENTENCE_START = /(?:^|[.!?…]["'”»)\]*_]*\s+)(?=["'“„»(*_]*[\p{L}])/gu;

const sentenceStarts = (text: string, from: number, to: number): ReadonlyArray<number> => {
  const part = text.slice(from, to);
  const starts: Array<number> = [];
  for (const match of part.matchAll(SENTENCE_START)) {
    let at = match.index + match[0].length;
    while (at < part.length && /["'“„»(*_]/u.test(part[at] ?? "")) at += 1;
    starts.push(from + at);
  }
  return starts;
};

const firstWord = (text: string, at: number): Span | null => {
  const match = /^[\p{L}\p{N}'-]+/u.exec(text.slice(at));
  return match === null ? null : { from: at, to: at + match[0].length };
};

const scan = (
  text: string,
  from: number,
  to: number,
  pattern: RegExp | null,
  rule: PencilRule,
  out: Array<PencilMark>,
  keep: (match: RegExpExecArray) => boolean = () => true,
) => {
  if (pattern === null) return;
  const part = text.slice(from, to);
  pattern.lastIndex = 0;
  for (let match = pattern.exec(part); match !== null; match = pattern.exec(part)) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    if (keep(match)) {
      out.push({ from: from + match.index, to: from + match.index + match[0].length, rule });
    }
  }
};

const QUOTE_PAIRS = (base: string): ReadonlyArray<readonly [string, string]> =>
  base === "da"
    ? [
        ["„", "“"],
        ["»", "«"],
      ]
    : base === "de"
      ? [
          ["„", "“"],
          ["»", "«"],
        ]
      : [
          ["“", "”"],
          ["«", "»"],
        ];

const mechanics = (
  text: string,
  from: number,
  to: number,
  base: string,
  doubledOk: ReadonlySet<string>,
  out: Array<PencilMark>,
) => {
  const part = text.slice(from, to);
  for (const match of part.matchAll(
    /(?<![\p{L}\p{N}])(\p{L}+)(?=[\s*_]+(\p{L}+)(?![\p{L}\p{N}]))/gu,
  )) {
    const [, one = "", two = ""] = match;
    const word = one.toLocaleLowerCase();
    if (word !== two.toLocaleLowerCase() || doubledOk.has(word)) continue;
    const rest = part.slice(match.index + one.length);
    const gap = /^[\s*_]+/u.exec(rest)?.[0] ?? "";
    if (gap.includes("\n\n")) continue;
    const at = from + match.index + one.length + gap.length;
    out.push({ from: at, to: at + two.length, rule: "doubled" });
  }

  const pairs: Array<readonly [string, string]> = [...QUOTE_PAIRS(base), ["(", ")"]];
  for (const [open, close] of pairs) {
    const stack: Array<number> = [];
    for (let i = 0; i < part.length; i++) {
      const char = part[i];
      if (char === open) stack.push(i);
      else if (char === close) stack.pop();
    }
    for (const at of stack) {
      out.push({
        from: from + at,
        to: from + at + 1,
        rule: open === "(" ? "open-bracket" : "open-quote",
      });
    }
  }
  const straight = [...part.matchAll(/"/gu)];
  if (straight.length % 2 === 1) {
    const last = straight.at(-1);
    if (last !== undefined) {
      out.push({ from: from + last.index, to: from + last.index + 1, rule: "open-quote" });
    }
  }

  const paired = new Set<number>();
  for (const span of emphasisSpans(part)) {
    for (let k = 0; k < span.size; k++) {
      paired.add(span.open + k);
      paired.add(span.close + k);
    }
  }
  for (const match of part.matchAll(/\*+/gu)) {
    const at = match.index;
    const before = part[at - 1] ?? "\n";
    const after = part[at + match[0].length] ?? "\n";
    if (/\s/u.test(before) && /\s/u.test(after)) continue;
    if ((before === "\n" || at === 0) && after === " ") continue;
    const loose = [...Array(match[0].length).keys()].filter((k) => !paired.has(at + k));
    if (loose.length > 0) {
      out.push({ from: from + at, to: from + at + match[0].length, rule: "open-emphasis" });
    }
  }
};

const sameStarts = (text: string, starts: ReadonlyArray<number>, out: Array<PencilMark>) => {
  let run: Array<Span> = [];
  const flush = () => {
    if (run.length >= 3) for (const word of run) out.push({ ...word, rule: "same-start" });
    run = [];
  };
  for (const start of starts) {
    const word = firstWord(text, start);
    if (word === null) {
      flush();
      continue;
    }
    const head = run[0];
    if (
      head !== undefined &&
      text.slice(head.from, head.to).toLocaleLowerCase() !==
        text.slice(word.from, word.to).toLocaleLowerCase()
    ) {
      flush();
    }
    run.push(word);
  }
  flush();
};

const resolve = (marks: ReadonlyArray<PencilMark>): ReadonlyArray<PencilMark> => {
  const kept: Array<PencilMark> = [];
  const ranked = [...marks].sort(
    (a, b) => RANK.indexOf(a.rule) - RANK.indexOf(b.rule) || b.to - b.from - (a.to - a.from),
  );
  for (const mark of ranked) {
    if (kept.some((other) => other.from < mark.to && mark.from < other.to)) continue;
    kept.push(mark);
  }
  return kept.sort((a, b) => a.from - b.from || a.to - b.to);
};

const DOUBLED_OK = new Set(["had", "that", "der", "det", "at"]);

export const pencilMarks = (
  body: string,
  language: string,
  on: ReadonlySet<PencilGroup> = new Set(PENCIL_GROUPS),
): ReadonlyArray<PencilMark> => {
  const base = language.toLowerCase().split("-")[0] ?? "";
  const patterns = patternsFor(base);
  const text = pencilText(body);
  const out: Array<PencilMark> = [];
  const openings: Array<number> = [];
  const doubledOk = new Set(patterns?.words.doubledOk ?? DOUBLED_OK);
  for (const block of textBlocks(text)) {
    if (text.slice(block.start, block.end).trim() === "") continue;
    mechanics(text, block.start, block.end, base, doubledOk, out);
    if (patterns === null) continue;
    const { start: from, end: to } = block;
    scan(text, from, to, patterns.cliche, "cliche", out);
    scan(text, from, to, patterns.redundant, "redundant", out);
    scan(text, from, to, patterns.adverb, "adverb", out);
    scan(text, from, to, patterns.filter, "filter", out);
    scan(text, from, to, patterns.crutch, "crutch", out);
    scan(
      text,
      from,
      to,
      patterns.passive,
      "passive",
      out,
      (match) =>
        !NOT_PASSIVE_EN.has((match[1] ?? "").toLocaleLowerCase()) && !/eed$/iu.test(match[1] ?? ""),
    );
    if (block.heading) continue;
    const starts = sentenceStarts(text, from, to);
    if (patterns.thereIs !== null) {
      for (const start of starts) {
        const pattern = new RegExp(`^${patterns.thereIs.source}`, "iu");
        const match = pattern.exec(text.slice(start, to));
        if (match !== null) {
          out.push({ from: start, to: start + match[0].length, rule: "there-is" });
        }
      }
    }
    sameStarts(text, starts, out);
    const opening = starts[0];
    if (opening !== undefined) openings.push(opening);
  }
  if (patterns !== null) {
    const before = out.length;
    sameStarts(text, openings, out);
    const added = out.splice(before);
    for (const mark of added) {
      if (!out.some((other) => other.rule === mark.rule && other.from === mark.from)) {
        out.push(mark);
      }
    }
  }
  return resolve(out.filter((mark) => on.has(GROUP_OF[mark.rule])));
};

const EN_SUFFIX = /(?:'s|ing|ies|(?<=[sxz]|ch|sh)es|ed|ly|s)$/u;
const DA_SUFFIX = /(?:erne|ene|ere|er|en|et|e|s)$/u;

const stem = (word: string, base: string) => {
  const lower = word.toLocaleLowerCase().replaceAll("’", "'");
  const suffix = base === "en" ? EN_SUFFIX : base === "da" ? DA_SUFFIX : null;
  const match = suffix?.exec(lower);
  const cut =
    match === null || match === undefined || lower.length - match[0].length < 3
      ? lower
      : lower.slice(0, match.index);
  return base === "en" ? cut.replace(/e$/u, "") : cut;
};

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const echoesAt = (body: string, caret: number, language: string): ReadonlyArray<Span> => {
  const base = language.toLowerCase().split("-")[0] ?? "";
  const words = pencilWordsFor(base);
  const stop = new Set(words?.stopwords ?? []);
  const text = pencilText(body);
  const block = textBlocks(text).find((b) => b.start <= caret && caret <= b.end);
  if (block === undefined) return [];
  const part = text.slice(block.start, block.end);
  const found = [...part.matchAll(WORD)].map((match) => ({
    from: block.start + match.index,
    to: block.start + match.index + match[0].length,
    word: match[0],
  }));
  const here = found.find((w) => w.from <= caret && caret <= w.to);
  if (here === undefined) return [];
  const min = words === null ? 4 : 3;
  if ([...here.word].length < min || stop.has(here.word.toLocaleLowerCase())) return [];
  const key = stem(here.word, base);
  const same = found.filter((w) => stem(w.word, base) === key);
  return same.length < 2 ? [] : same.map(({ from, to }) => ({ from, to }));
};

export const keptKey = (body: string, mark: PencilMark): string =>
  [
    mark.rule,
    body.slice(mark.from, mark.to).toLocaleLowerCase().replace(/\s+/gu, " "),
    sentenceAround(body, mark.from, mark.to).replace(/\s+/gu, " "),
  ].join("|");

export const blockAt = (body: string, pos: number): Span | null => {
  const block = textBlocks(body).find((b) => b.start <= pos && pos <= b.end);
  return block === undefined ? null : { from: block.start, to: block.end };
};

export const pencilKnows = (language: string) => patternsFor(language) !== null;

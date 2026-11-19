import * as Schema from "effect/Schema";

import { findReferences, type TryGroup } from "./writing.ts";

export const AI_TRY_WORDS = 6;

export const MAX_SUGGESTED_WORDS = 5;

export const tryWordCount = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;

export const tryTextOk = (text: string) =>
  text.trim() !== "" &&
  text === text.trim() &&
  !/[\r\n]/u.test(text) &&
  !text.includes("[[") &&
  !text.includes("<!--") &&
  !text.includes("-->");

const WORD_CHAR = /[\p{L}\p{N}]/u;

const JOINER = /['’_-]/u;

export const joinsBefore = (body: string, at: number) =>
  WORD_CHAR.test(body[at - 1] ?? "") ||
  (JOINER.test(body[at - 1] ?? "") &&
    WORD_CHAR.test(body[at - 2] ?? "") &&
    WORD_CHAR.test(body[at] ?? ""));

export const joinsAfter = (body: string, at: number) =>
  WORD_CHAR.test(body[at] ?? "") ||
  (JOINER.test(body[at] ?? "") &&
    WORD_CHAR.test(body[at + 1] ?? "") &&
    WORD_CHAR.test(body[at - 1] ?? ""));

export const wordAround = (body: string, at: number) => {
  let from = at;
  let to = at;
  while (from > 0 && joinsBefore(body, from)) from -= 1;
  while (to < body.length && joinsAfter(body, to)) to += 1;
  return to > from ? { from, to } : null;
};

const standsAlone = (body: string, start: number, end: number) =>
  !joinsBefore(body, start) && !joinsAfter(body, end);

const LIST_MARK = /^(?:[-*+]|\d{1,9}[.)]|\[[ xX]\])(?=[ \t])/u;

const markersOnly = (lead: string) => {
  let at = 0;
  for (;;) {
    while (lead[at] === " " || lead[at] === "\t") at += 1;
    if (lead[at] === ">" || lead[at] === "#") {
      at += 1;
      continue;
    }
    const list = LIST_MARK.exec(lead.slice(at, at + 12));
    if (list === null) break;
    at += list[0].length;
  }
  return /^[*_]*$/u.test(lead.slice(at));
};
const LINE_TAIL = /^[*_]*[ \t]*(?:\n|$)/u;

const wholeParagraph = (body: string, start: number, end: number) =>
  markersOnly(body.slice(body.lastIndexOf("\n", start - 1) + 1, start)) &&
  LINE_TAIL.test(body.slice(end));

export const tryPlacer = (body: string) => {
  const references = findReferences(body);
  return (start: number, end: number) =>
    end > start &&
    tryTextOk(body.slice(start, end)) &&
    standsAlone(body, start, end) &&
    !wholeParagraph(body, start, end) &&
    !references.some((token) => start < token.end && token.start < end);
};

export const tryPlaceOk = (body: string, start: number, end: number) => tryPlacer(body)(start, end);

export const shownTry = (group: Pick<TryGroup, "tries" | "showing">) =>
  group.tries[group.showing] ?? "";

export const keepsTries = (group: Pick<TryGroup, "tries" | "showing" | "ai">) =>
  group.tries.length >= 2 || group.ai.includes(shownTry(group));

const normalize = (group: TryGroup): TryGroup | null => {
  const shown = group.tries[group.showing];
  if (shown === undefined || !tryTextOk(shown)) return null;
  const tries = [...new Set(group.tries.filter(tryTextOk))];
  const clean = {
    at: group.at,
    showing: tries.indexOf(shown),
    tries,
    ai: [...new Set(group.ai)].filter((text) => tries.includes(text)),
  };
  return keepsTries(clean) ? clean : null;
};

const nearest = (
  body: string,
  text: string,
  at: number,
  free: (start: number, end: number) => boolean,
) => {
  let best: number | null = null;
  for (let index = body.indexOf(text); index >= 0; index = body.indexOf(text, index + 1)) {
    if (!free(index, index + text.length)) continue;
    if (best === null || Math.abs(index - at) < Math.abs(best - at)) best = index;
  }
  return best;
};

export const anchorTries = (
  body: string,
  groups: ReadonlyArray<TryGroup>,
): ReadonlyArray<TryGroup> => {
  const clean = groups.flatMap((group) => {
    const normal = normalize(group);
    return normal === null ? [] : [normal];
  });
  const kept: Array<TryGroup> = [];
  const placeOk = tryPlacer(body);
  const free = (start: number, end: number) =>
    placeOk(start, end) &&
    !kept.some((other) => start < other.at + shownTry(other).length && other.at < end);
  for (const group of clean) {
    const end = group.at + shownTry(group).length;
    if (body.slice(group.at, end) === shownTry(group) && free(group.at, end)) kept.push(group);
  }
  for (const group of clean) {
    if (kept.includes(group)) continue;
    const at = nearest(body, shownTry(group), group.at, free);
    if (at !== null) kept.push({ ...group, at });
  }
  return kept.sort((a, b) => a.at - b.at);
};

export const AskTryWords = Schema.Struct({
  language: Schema.String,
  sentence: Schema.String,
  text: Schema.String,
  tries: Schema.Array(Schema.String),
});
export type AskTryWords = typeof AskTryWords.Type;

export const TryWords = Schema.Struct({ words: Schema.Array(Schema.String) });
export type TryWords = typeof TryWords.Type;

export class TryWordsUnavailable extends Schema.TaggedError<TryWordsUnavailable>()(
  "TryWordsUnavailable",
  { reason: Schema.Literals(["off", "failed", "too-long"]) },
) {}

const QUOTES = /^["'“”‘’«»„]+|["'“”‘’«»„]+$/gu;

const SENTENCE_END = /[.!?…]$/u;
const TWO_SENTENCES = /[.!?…]["”’)]*\s+\S/u;

const UPPER = /^\p{Lu}/u;

const isSentence = (text: string, chosen: string) =>
  TWO_SENTENCES.test(text) ||
  (SENTENCE_END.test(text) && !SENTENCE_END.test(chosen)) ||
  (UPPER.test(text) && !UPPER.test(chosen)) ||
  tryWordCount(text) > tryWordCount(chosen) + 1;

export const keepTryWords = (
  words: ReadonlyArray<string>,
  chosen: string,
  tries: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const seen = new Set([chosen, ...tries].map((text) => text.toLocaleLowerCase()));
  const kept: Array<string> = [];
  for (const word of words) {
    const text = word.replace(QUOTES, "").trim();
    const key = text.toLocaleLowerCase();
    if (!tryTextOk(text) || tryWordCount(text) > AI_TRY_WORDS || seen.has(key)) continue;
    if (isSentence(text, chosen)) continue;
    seen.add(key);
    kept.push(text);
    if (kept.length === MAX_SUGGESTED_WORDS) break;
  }
  return kept;
};

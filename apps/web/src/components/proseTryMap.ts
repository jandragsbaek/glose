import type { EditorState, Transaction } from "@codemirror/state";
import { joinsAfter, joinsBefore, shownTry, tryTextOk } from "@glose/contracts";

import { emphasisSpans, maskReferences } from "../domain/emphasis.ts";

export interface LiveTry {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly tries: ReadonlyArray<string>;
  readonly showing: number;
  readonly ai: ReadonlyArray<string>;
}

const covering = (group: LiveTry, transaction: Transaction) => {
  const found: Array<{ fromA: number; toA: number; fromB: number; toB: number }> = [];
  transaction.changes.iterChanges((fromA, toA, fromB, toB) => {
    if (fromA <= group.from && toA >= group.to && toA > fromA)
      found.push({ fromA, toA, fromB, toB });
  });
  return found[0] ?? null;
};

const MARK = /[*_]/u;

const placesOf = (text: string, find: RegExp) =>
  [...text.matchAll(find)].map((match) => ({
    at: match.index,
    end: match.index + match[0].length,
  }));

const MARKS = /[*_]/gu;

const unmarked = (text: string) => text.replace(MARKS, "");

const looseTry = (shown: string) =>
  new RegExp(
    [...unmarked(shown)]
      .map((char) => char.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .join("[*_]{0,3}"),
    "gu",
  );

const relocate = (
  group: LiveTry,
  change: { fromA: number; toA: number; fromB: number; toB: number },
  transaction: Transaction,
): LiveTry | null => {
  const find = looseTry(shownTry(group));
  const before = placesOf(transaction.startState.doc.sliceString(change.fromA, change.toA), find);
  const inserted = transaction.newDoc.sliceString(change.fromB, change.toB);
  const after = placesOf(inserted, find);
  const near = group.from - change.fromA;
  const nth = before.findIndex((place) => place.at === near);
  const nearest = after.reduce<(typeof after)[number] | null>(
    (best, place) =>
      best === null || Math.abs(place.at - near) < Math.abs(best.at - near) ? place : best,
    null,
  );
  const place = nth >= 0 && before.length === after.length ? (after[nth] ?? null) : nearest;
  if (place === null) return null;
  let { at, end } = place;
  if (inserted.slice(at, end) !== shownTry(group)) {
    while (at > 0 && MARK.test(inserted[at - 1] ?? "")) at -= 1;
    while (end < inserted.length && MARK.test(inserted[end] ?? "")) end += 1;
  }
  return { ...group, from: change.fromB + at, to: change.fromB + end };
};

const touches = (group: LiveTry, transaction: Transaction) => {
  let touched = false;
  transaction.changes.iterChanges((fromA, toA) => {
    if (fromA <= group.to && toA >= group.from) touched = true;
  });
  return touched;
};

export const mapGroup = (
  group: LiveTry,
  transaction: Transaction,
  growing: boolean,
): LiveTry | null => {
  const change = covering(group, transaction);
  if (change !== null && change.fromA === group.from && change.toA === group.to) {
    return change.toB > change.fromB ? { ...group, from: change.fromB, to: change.toB } : null;
  }
  if (change !== null) return relocate(group, change, transaction);
  const from = transaction.changes.mapPos(group.from, 1);
  const to = transaction.changes.mapPos(group.to, growing ? 1 : -1);
  const editing = transaction.isUserEvent("input") || transaction.isUserEvent("delete");
  if (!editing && touches(group, transaction)) {
    const moved = relocate(
      group,
      {
        fromA: group.from,
        toA: group.to,
        fromB: transaction.changes.mapPos(group.from, -1),
        toB: transaction.changes.mapPos(group.to, 1),
      },
      transaction,
    );
    if (moved !== null) return moved;
  }
  return to <= from ? null : { ...group, from, to };
};

export const wholeWord = (group: LiveTry, state: EditorState): LiveTry => {
  const window = (at: number) => state.sliceDoc(Math.max(0, at - 2), at + 2);
  let { from, to } = group;
  while (from > 0 && joinsBefore(window(from), Math.min(from, 2))) from -= 1;
  while (to < state.doc.length && joinsAfter(window(to), Math.min(to, 2))) to += 1;
  return from === group.from && to === group.to ? group : { ...group, from, to };
};

export const settle = (group: LiveTry, state: EditorState): LiveTry => {
  const text = state.sliceDoc(group.from, group.to);
  const kept = text.trimEnd().length;
  return kept === text.length || kept === 0 ? group : { ...group, to: group.from + kept };
};

export const typedOver = (group: LiveTry, transaction: Transaction) => {
  const change = covering(group, transaction);
  return change !== null && change.fromA === group.from && change.toA === group.to;
};

export const readBack = (group: LiveTry, state: EditorState, growing: boolean): LiveTry | null => {
  const raw = state.sliceDoc(group.from, group.to);
  const text = growing ? raw.trimEnd() : raw;
  const shown = group.tries[group.showing];
  if (text === shown) return group;
  if (!tryTextOk(text)) return null;
  const tries = group.tries.flatMap((each, index) =>
    index === group.showing ? [text] : each === text ? [] : [each],
  );
  const restyled = shown !== undefined && unmarked(shown) === unmarked(text);
  return {
    ...group,
    tries,
    showing: tries.indexOf(text),
    ai: group.ai
      .map((each) => (restyled && each === shown ? text : each))
      .filter((each) => (each !== shown || restyled) && tries.includes(each)),
  };
};

const runAt = (line: string, at: number) => {
  let start = at;
  let end = at;
  while (start > 0 && line[start - 1] === line[at]) start -= 1;
  while (end < line.length && line[end] === line[at]) end += 1;
  return { start, end };
};

const keepsEmphasis = (para: string, from: number, to: number, text: string) => {
  const line = para.slice(0, from) + text + para.slice(to);
  const end = from + text.length;
  const moved = (at: number) => (at < from ? at : at + end - to);
  const outsideBefore = (at: number, size: number) => at + size <= from || at >= to;
  const outsideAfter = (at: number, size: number) => at + size <= from || at >= end;
  const touches = (at: number, size: number, run: { start: number; end: number }) =>
    at < run.end && at + size > run.start;
  const inside = (at: number) => at >= from && at < end;
  const before = emphasisSpans(para).filter(
    (span) => outsideBefore(span.open, span.size) || outsideBefore(span.close, span.size),
  );
  const after = emphasisSpans(line).filter(
    (span) => outsideAfter(span.open, span.size) || outsideAfter(span.close, span.size),
  );
  if (before.length !== after.length) return false;
  const used = new Set<number>();
  return before.every((span) => {
    const open = outsideBefore(span.open, span.size) ? runAt(line, moved(span.open)) : null;
    const close = outsideBefore(span.close, span.size) ? runAt(line, moved(span.close)) : null;
    const match = after.findIndex(
      (each, index) =>
        !used.has(index) &&
        each.size === span.size &&
        (open === null ? inside(each.open) : touches(each.open, each.size, open)) &&
        (close === null ? inside(each.close) : touches(each.close, each.size, close)),
    );
    used.add(match);
    return match >= 0;
  });
};

export const flipText = (para: string, from: number, to: number, target: string): string | null =>
  keepsEmphasis(para, from, to, target) ? target : null;

export const withMarks = (state: EditorState, groupFrom: number, groupTo: number) => {
  const line = state.doc.lineAt(groupFrom);
  const from = groupFrom - line.from;
  const to = groupTo - line.from;
  let start = from;
  let end = to;
  for (const span of emphasisSpans(maskReferences(line.text))) {
    const openInside = span.open >= from && span.open + span.size <= to;
    const closeInside = span.close >= from && span.close + span.size <= to;
    if (span.open + span.size === from && closeInside) start = Math.min(start, span.open);
    if (span.close === to && openInside) end = Math.max(end, span.close + span.size);
  }
  return { from: line.from + start, to: line.from + end };
};

export const takeMarks = (group: LiveTry, state: EditorState): LiveTry => {
  const { from, to } = withMarks(state, group.from, group.to);
  return from === group.from && to === group.to ? group : { ...group, from, to };
};

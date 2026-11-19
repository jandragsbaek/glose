import {
  type ChangeSpec,
  EditorSelection,
  type EditorState,
  type Range,
  type StateCommand,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import {
  type EmphasisSpan,
  emphasisSpans,
  maskReferences,
  textBlocks,
} from "../domain/emphasis.ts";
import { hasAnyText, hasStyle, restyle } from "../domain/restyle.ts";
import { headingOf } from "../domain/writing.ts";

export type Emphasis = EmphasisSpan["kind"];
export type BlockStyle = 0 | 2 | 3;

const hidden = Decoration.replace({});
const marker = Decoration.mark({ class: "prose-mark" });
const STYLE: Record<Emphasis, Decoration> = {
  strong: Decoration.mark({ class: "prose-strong" }),
  em: Decoration.mark({ class: "prose-em" }),
};
const headingLine = (level: number) =>
  Decoration.line({ class: level <= 2 ? "prose-h2" : "prose-h3" });

const touches = (state: EditorState, from: number, to: number) =>
  state.selection.ranges.some((range) => range.from <= to && range.to >= from);

const docSpans = (state: EditorState): ReadonlyArray<EmphasisSpan> => {
  const body = state.doc.toString();
  const masked = maskReferences(body);
  return textBlocks(body).flatMap((block) => {
    const text = masked.slice(block.start, block.end);
    const offset = block.heading ? (headingOf(text)?.marker ?? 0) : 0;
    return emphasisSpans(text.slice(offset)).map((span) => ({
      ...span,
      open: span.open + block.start + offset,
      close: span.close + block.start + offset,
    }));
  });
};

const build = (view: EditorView): DecorationSet => {
  const { state } = view;
  const ranges: Array<Range<Decoration>> = [];
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = state.doc.lineAt(pos);
      const heading = headingOf(line.text);
      if (heading !== null) {
        ranges.push(headingLine(heading.level).range(line.from));
        const shown = touches(state, line.from, line.to);
        ranges.push((shown ? marker : hidden).range(line.from, line.from + heading.marker));
      }
      pos = line.to + 1;
    }
  }
  for (const span of docSpans(state)) {
    const end = span.close + span.size;
    const shown = touches(state, span.open, end);
    ranges.push((shown ? marker : hidden).range(span.open, span.open + span.size));
    ranges.push(STYLE[span.kind].range(span.open + span.size, span.close));
    ranges.push((shown ? marker : hidden).range(span.close, end));
  }
  return Decoration.set(ranges, true);
};

export const formattingMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const wordAt = (state: EditorState, pos: number) => {
  const word = state.wordAt(pos);
  return word === null ? { from: pos, to: pos } : word;
};

const blocksIn = (state: EditorState, from: number, to: number) => {
  const body = state.doc.toString();
  return textBlocks(body)
    .filter((block) => block.end >= from && block.start <= to)
    .map((block) => {
      const start =
        block.start +
        (block.heading ? (headingOf(body.slice(block.start, block.end))?.marker ?? 0) : 0);
      return { start, text: body.slice(start, block.end) };
    });
};

const MARK_CHAR = /[*_]/u;

export const markChanges = (start: number, before: string, after: string): Array<ChangeSpec> => {
  const changes: Array<ChangeSpec> = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      i += 1;
      j += 1;
    } else if (j < after.length && MARK_CHAR.test(after[j] ?? "")) {
      changes.push({ from: start + i, insert: after[j] ?? "" });
      j += 1;
    } else if (i < before.length && MARK_CHAR.test(before[i] ?? "")) {
      changes.push({ from: start + i, to: start + i + 1 });
      i += 1;
    } else {
      return [{ from: start, to: start + before.length, insert: after }];
    }
  }
  return changes;
};

export const toggleEmphasis =
  (kind: Emphasis): StateCommand =>
  ({ state, dispatch }) => {
    const range = state.selection.main;
    const target = range.empty ? wordAt(state, range.head) : range;
    const blocks = blocksIn(state, target.from, target.to);
    const all = blocks.map((block) => block.text).join("\n\n");
    const on = !blocks.every(
      (block) =>
        !hasAnyText(block.text, target.from - block.start, target.to - block.start) ||
        hasStyle(block.text, target.from - block.start, target.to - block.start, kind),
    );
    const changes: Array<ChangeSpec> = [];
    let shift = 0;
    let anchor: number | null = null;
    let head: number | null = null;
    for (const block of blocks) {
      const result = restyle(
        block.text,
        target.from - block.start,
        target.to - block.start,
        kind,
        on,
      );
      if (result === null) continue;
      changes.push(...markChanges(block.start, block.text, result.text));
      anchor ??= block.start + shift + result.from;
      head = block.start + shift + result.to;
      shift += result.text.length - block.text.length;
    }
    if (anchor === null || head === null || all === "") {
      const mark = kind === "strong" ? "**" : "*";
      if (
        range.empty &&
        state.sliceDoc(range.head - mark.length, range.head + mark.length) === mark + mark
      ) {
        dispatch(
          state.update({
            changes: { from: range.head - mark.length, to: range.head + mark.length },
            userEvent: "input.format",
          }),
        );
        return true;
      }
      dispatch(
        state.update({
          changes: { from: range.head, insert: mark + mark },
          selection: EditorSelection.cursor(range.head + mark.length),
          userEvent: "input.format",
        }),
      );
      return true;
    }
    dispatch(
      state.update({
        changes,
        selection: EditorSelection.range(anchor, head),
        scrollIntoView: true,
        userEvent: "input.format",
      }),
    );
    return true;
  };

export const setBlockStyle =
  (level: BlockStyle): StateCommand =>
  ({ state, dispatch }) => {
    const lines = new Set<number>();
    for (const range of state.selection.ranges) {
      const last =
        !range.empty && state.doc.lineAt(range.to).from === range.to ? range.to - 1 : range.to;
      for (let pos = range.from; pos <= last;) {
        const line = state.doc.lineAt(pos);
        lines.add(line.number);
        pos = line.to + 1;
      }
    }
    const filledLines = [...lines].filter((number) => state.doc.line(number).text.trim() !== "");
    const numbers =
      filledLines.length > 0 ? filledLines : [state.doc.lineAt(state.selection.main.head).number];
    const already = numbers.every(
      (number) => headingOf(state.doc.line(number).text)?.level === level,
    );
    const target = already ? 0 : level;
    const changes: Array<ChangeSpec> = [];
    const filled = (number: number) =>
      number >= 1 &&
      number <= state.doc.lines &&
      !lines.has(number) &&
      state.doc.line(number).text.trim() !== "";
    for (const number of numbers) {
      const line = state.doc.line(number);
      const prefix = target === 0 ? "" : `${"#".repeat(target)} `;
      changes.push({
        from: line.from,
        to: line.from + (headingOf(line.text)?.marker ?? 0),
        insert: target !== 0 && filled(number - 1) ? `\n${prefix}` : prefix,
      });
      if (target !== 0 && filled(number + 1)) changes.push({ from: line.to, insert: "\n" });
    }
    const set = state.changes(changes);
    const main = state.selection.main;
    const line = state.doc.lineAt(main.head);
    const inPrefix = main.empty && main.head <= line.from + (headingOf(line.text)?.marker ?? 0);
    dispatch(
      state.update({
        changes: set,
        selection: inPrefix ? EditorSelection.cursor(set.mapPos(main.head, 1)) : undefined,
        scrollIntoView: true,
        userEvent: "input.format",
      }),
    );
    return true;
  };

export const activeStyles = (state: EditorState) => {
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  const { from, to } = range.empty ? wordAt(state, range.head) : range;
  const blocks = blocksIn(state, from, to).filter((block) =>
    hasAnyText(block.text, from - block.start, to - block.start),
  );
  const has = (kind: Emphasis) =>
    blocks.length > 0 &&
    blocks.every((block) => hasStyle(block.text, from - block.start, to - block.start, kind));
  const levels = new Set<number>();
  const last =
    !range.empty && state.doc.lineAt(range.to).from === range.to ? range.to - 1 : range.to;
  for (let pos = range.from; pos <= last;) {
    const at = state.doc.lineAt(pos);
    if (at.text.trim() !== "") levels.add(headingOf(at.text)?.level ?? 0);
    pos = at.to + 1;
  }
  const [only] = levels;
  return {
    level:
      levels.size === 1 ? (only ?? 0) : levels.size === 0 ? (headingOf(line.text)?.level ?? 0) : 0,
    strong: has("strong"),
    em: has("em"),
  };
};

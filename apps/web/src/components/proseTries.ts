import { invertedEffects, isolateHistory } from "@codemirror/commands";
import {
  Annotation,
  type ChangeDesc,
  EditorSelection,
  type EditorState,
  Prec,
  StateEffect,
  StateField,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { Decoration, EditorView, hoverTooltip, keymap, ViewPlugin } from "@codemirror/view";
import {
  keepsTries,
  type TryGroup,
  tryPlaceOk,
  tryPlacer,
  tryTextOk,
  wordAround,
} from "@glose/contracts";

import { maskReferences, textBlocks } from "../domain/emphasis.ts";
import {
  flipText,
  type LiveTry,
  mapGroup,
  readBack,
  settle,
  takeMarks,
  typedOver,
  withMarks,
  wholeWord,
} from "./proseTryMap.ts";

export type { LiveTry } from "./proseTryMap.ts";

export interface TriesState {
  readonly groups: ReadonlyArray<LiveTry>;
  readonly open: string | null;
  readonly growing: string | null;
}

export interface TriesEditor {
  readonly state: EditorState;
  dispatch(spec: TransactionSpec): void;
}

let nextId = 0;
const newId = () => `try-${++nextId}`;

export const fromSaved = (saved: ReadonlyArray<TryGroup>): ReadonlyArray<LiveTry> =>
  saved.map((group) => ({
    id: newId(),
    from: group.at,
    to: group.at + (group.tries[group.showing]?.length ?? 0),
    tries: group.tries,
    showing: group.showing,
    ai: group.ai,
  }));

export const toSaved = (groups: ReadonlyArray<LiveTry>): ReadonlyArray<TryGroup> =>
  groups.filter(keepsTries).map((group) => ({
    at: group.from,
    showing: group.showing,
    tries: group.tries,
    ai: group.ai,
  }));

const mapLive = (group: LiveTry, changes: ChangeDesc): LiveTry => ({
  ...group,
  from: changes.mapPos(group.from, 1),
  to: changes.mapPos(group.to, -1),
});

const putTry = StateEffect.define<LiveTry>({ map: mapLive });
const dropTry = StateEffect.define<string>();
const openTry = StateEffect.define<string | null>();

export interface FlipNote {
  readonly text: string;
  readonly n: number;
  readonly of: number;
}

export const flipped = Annotation.define<FlipNote>();

export const refusedFlip = Annotation.define<true>();

export const triesField = StateField.define<TriesState>({
  create: () => ({ groups: [], open: null, growing: null }),
  update: (value, transaction) => {
    const ours = transaction.effects.some(
      (effect) => effect.is(putTry) || effect.is(dropTry) || effect.is(openTry),
    );
    if (!transaction.docChanged && !ours) {
      if (value.growing === null || transaction.selection === undefined) return value;
      const groups = value.groups.map((group) =>
        group.id === value.growing ? settle(group, transaction.state) : group,
      );
      return { ...value, groups, growing: null };
    }
    const typing = transaction.isUserEvent("input.type");
    let growing: string | null = null;
    let groups = transaction.docChanged
      ? value.groups.flatMap((group) => {
          const grows = typing && group.id === value.growing;
          if (typing && (grows || typedOver(group, transaction))) growing = group.id;
          const mapped = mapGroup(group, transaction, grows);
          return mapped === null ? [] : [mapped];
        })
      : value.groups;
    let open = value.open;
    for (const effect of transaction.effects) {
      if (effect.is(putTry)) {
        const at = groups.findIndex((group) => group.id === effect.value.id);
        groups =
          at < 0
            ? [...groups, effect.value]
            : groups.map((group, index) => (index === at ? effect.value : group));
      } else if (effect.is(dropTry)) {
        groups = groups.filter((group) => group.id !== effect.value);
      } else if (effect.is(openTry)) {
        open = effect.value;
      }
    }
    if (transaction.docChanged) {
      groups = groups.flatMap((group) => {
        const grows = group.id === growing;
        const whole = grows ? group : wholeWord(group, transaction.state);
        const placed = transaction.isUserEvent("input.format")
          ? takeMarks(whole, transaction.state)
          : whole;
        const ended = group.id === value.growing && !grows;
        const read = readBack(
          ended ? settle(placed, transaction.state) : placed,
          transaction.state,
          grows,
        );
        return read === null ? [] : [read];
      });
    }
    if (transaction.docChanged && groups.length > 0) {
      const placeOk = tryPlacer(transaction.newDoc.toString());
      groups = groups.filter((group) => group.id === growing || placeOk(group.from, group.to));
    }
    if (open !== null && !groups.some((group) => group.id === open)) open = null;
    groups = groups
      .filter((group) => keepsTries(group) || group.id === open)
      .sort((a, b) => a.from - b.from)
      .filter((group, index, all) => all.slice(0, index).every((other) => other.to <= group.from));
    return { groups, open, growing };
  },
  provide: (field) =>
    EditorView.decorations.compute([field], (state) => {
      const { groups, open } = state.field(field);
      return Decoration.set(
        groups.map((group) =>
          Decoration.mark({
            class: [
              "prose-try",
              group.id === open ? "prose-try--open" : "",
              group.tries.length < 2 ? "prose-try--alone" : "",
              group.ai.includes(group.tries[group.showing] ?? "") ? "prose-try--ai" : "",
            ]
              .filter(Boolean)
              .join(" "),
            attributes: { "data-try": group.id },
          }).range(group.from, group.to),
        ),
      );
    }),
});

export const triesOf = (state: EditorState) => state.field(triesField, false) ?? null;

const sameList = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
  a.length === b.length && a.every((text, index) => text === b[index]);

const sameTries = (a: LiveTry, b: LiveTry) =>
  a.showing === b.showing && sameList(a.tries, b.tries) && sameList(a.ai, b.ai);

const undoTries = invertedEffects.of((transaction) => {
  const before = transaction.startState.field(triesField, false)?.groups ?? [];
  const after = transaction.state.field(triesField, false)?.groups ?? [];
  const back: Array<StateEffect<unknown>> = [];
  for (const old of before) {
    const now = after.find((group) => group.id === old.id);
    const moved =
      now !== undefined &&
      (now.from !== transaction.changes.mapPos(old.from, 1) ||
        now.to !== transaction.changes.mapPos(old.to, -1));
    if (now === undefined || moved || !sameTries(old, now)) back.push(putTry.of(old));
  }
  for (const now of after) {
    if (!before.some((group) => group.id === now.id)) back.push(dropTry.of(now.id));
  }
  return back;
});

const groupById = (state: EditorState, id: string) =>
  triesOf(state)?.groups.find((group) => group.id === id) ?? null;

const trimmed = (state: EditorState, from: number, to: number) => {
  const text = state.sliceDoc(from, to);
  const start = from + (text.length - text.trimStart().length);
  const end = to - (text.length - text.trimEnd().length);
  return { from: start, to: Math.max(start, end) };
};

const oneParagraph = (state: EditorState) => {
  const range = state.selection.main;
  return state.doc.lineAt(range.from).number === state.doc.lineAt(range.to).number;
};

const overlapping = (state: EditorState) => {
  const range = state.selection.main;
  return (
    triesOf(state)?.groups.find((group) =>
      range.empty
        ? group.from <= range.head && range.head <= group.to
        : group.from < range.to && range.from < group.to,
    ) ?? null
  );
};

export const tryRange = (state: EditorState): { from: number; to: number } | null => {
  const range = state.selection.main;
  const word = range.empty ? wordAround(state.doc.toString(), range.head) : null;
  const chosen = word ?? trimmed(state, range.from, range.to);
  if (chosen.to <= chosen.from || !oneParagraph(state) || overlapping(state) !== null) return null;
  const { from, to } = withMarks(state, chosen.from, chosen.to);
  return tryPlaceOk(state.doc.toString(), from, to) ? { from, to } : null;
};

const groupAt = (state: EditorState) => {
  const range = state.selection.main;
  const group = oneParagraph(state) ? overlapping(state) : null;
  return group !== null && range.from >= group.from && range.to <= group.to ? group : null;
};

export const canTry = (state: EditorState) => groupAt(state) !== null || tryRange(state) !== null;

const outsideHistory = Transaction.addToHistory.of(false);

export const openTriesAt = (view: TriesEditor): string | null => {
  const { state } = view;
  const existing = groupAt(state);
  if (existing !== null) {
    view.dispatch({ effects: openTry.of(existing.id), annotations: outsideHistory });
    return existing.id;
  }
  const range = tryRange(state);
  if (range === null) return null;
  const group: LiveTry = {
    id: newId(),
    ...range,
    tries: [state.sliceDoc(range.from, range.to)],
    showing: 0,
    ai: [],
  };
  view.dispatch({
    effects: [putTry.of(group), openTry.of(group.id)],
    annotations: outsideHistory,
  });
  return group.id;
};

export const closeTries = (view: TriesEditor) => {
  if (triesOf(view.state)?.open == null) return;
  view.dispatch({ effects: openTry.of(null), annotations: outsideHistory });
};

const show = (
  view: TriesEditor,
  group: LiveTry,
  showing: number,
  given = group.tries,
  givenAi = group.ai,
) => {
  const target = given[showing];
  if (target === undefined) return false;
  const body = view.state.doc.toString();
  const block = textBlocks(body).find(
    (each) => each.start <= group.from && group.to <= each.end,
  ) ?? { start: group.from, end: group.to };
  const text = flipText(
    maskReferences(body.slice(block.start, block.end)),
    group.from - block.start,
    group.to - block.start,
    target,
  );
  if (text === null) return false;
  const tries = given.map((each, index) => (index === showing ? text : each));
  const ai = givenAi.map((each) => (each === target ? text : each));
  const next: LiveTry = { ...group, tries, ai, showing, to: group.from + text.length };
  const head = view.state.selection.main.head;
  const inside = view.state.selection.main.empty && head >= group.from && head <= group.to;
  view.dispatch({
    changes: { from: group.from, to: group.to, insert: text },
    effects: putTry.of(next),
    ...(inside ? { selection: EditorSelection.cursor(next.to) } : {}),
    annotations: [
      flipped.of({ text, n: showing + 1, of: tries.length }),
      isolateHistory.of("full"),
    ],
  });
  return true;
};

export const flipTry = (view: TriesEditor, id: string, index: number) => {
  const group = groupById(view.state, id);
  if (group === null || group.tries.length === 0) return false;
  const n = group.tries.length;
  return show(view, group, ((index % n) + n) % n);
};

export type AddResult = "added" | "invalid" | "refused";

export const addTry = (view: TriesEditor, id: string, raw: string, fromAi = false): AddResult => {
  const group = groupById(view.state, id);
  const text = raw.trim();
  if (group === null || !tryTextOk(text)) return "invalid";
  const known = group.tries.indexOf(text);
  const shown =
    known >= 0
      ? show(view, group, known)
      : show(
          view,
          group,
          group.tries.length,
          [...group.tries, text],
          fromAi ? [...group.ai, text] : group.ai,
        );
  return shown ? "added" : "refused";
};

export const removeTry = (view: TriesEditor, id: string, index: number) => {
  const group = groupById(view.state, id);
  if (group === null || group.tries.length < 2 || group.tries[index] === undefined) return true;
  const gone = group.tries[index];
  const tries = group.tries.filter((_, at) => at !== index);
  const ai = group.ai.filter((each) => each !== gone);
  if (index === group.showing) {
    return show(view, group, Math.min(index, tries.length - 1), tries, ai);
  }
  view.dispatch({
    effects: putTry.of({
      ...group,
      tries,
      ai,
      showing: group.showing > index ? group.showing - 1 : group.showing,
    }),
    annotations: isolateHistory.of("full"),
  });
  return true;
};

const pointer = ViewPlugin.fromClass(
  class {
    hovered: string | null = null;
    armed = false;
  },
  {
    eventHandlers: {
      mousemove(event) {
        const mark = event.target instanceof Element ? event.target.closest("[data-try]") : null;
        this.hovered = mark?.getAttribute("data-try") ?? null;
        this.armed = true;
      },
      mouseleave() {
        this.hovered = null;
      },
      keydown(event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") this.armed = false;
        return false;
      },
    },
  },
);

const flipHovered = (step: number) => (view: EditorView) => {
  const state = view.plugin(pointer);
  if (state === null || !state.armed || state.hovered === null) return false;
  if (!view.state.selection.main.empty) return false;
  const group = groupById(view.state, state.hovered);
  if (group === null || group.tries.length < 2) return false;
  if (flipTry(view, group.id, group.showing + step)) return true;
  view.dispatch({ annotations: refusedFlip.of(true) });
  return false;
};

const otherTries = (hint: string) =>
  hoverTooltip(
    (view, pos) => {
      const tries = triesOf(view.state);
      const group = tries?.groups.find(
        (each) => each.from <= pos && pos <= each.to && each.tries.length >= 2,
      );
      if (group === undefined || tries?.open === group.id) return null;
      return {
        pos: group.from,
        end: group.to,
        above: true,
        create: () => {
          const dom = document.createElement("div");
          dom.className = "prose-try-tip";
          dom.setAttribute("aria-hidden", "true");
          for (const [index, text] of group.tries.entries()) {
            if (index === group.showing) continue;
            const item = document.createElement("span");
            item.className = "prose-try-tip__try";
            item.textContent = text;
            dom.append(item);
          }
          const keys = document.createElement("span");
          keys.className = "prose-try-tip__hint";
          keys.textContent = hint;
          dom.append(keys);
          return { dom };
        },
      };
    },
    { hoverTime: 250, hideOnChange: true },
  );

export const triesExtension = (initial: ReadonlyArray<LiveTry>) => [
  triesField.init(() => ({ groups: initial, open: null, growing: null })),
  undoTries,
  pointer,
  Prec.high(
    keymap.of([
      { key: "ArrowRight", run: flipHovered(1) },
      { key: "ArrowLeft", run: flipHovered(-1) },
      {
        key: "Mod-Shift-a",
        run: (view) => openTriesAt(view) !== null,
      },
    ]),
  ),
];

export const triesHint = (hint: string) => otherTries(hint);

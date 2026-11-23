import { type RefObject, useEffect } from "react";
import { type EditorState, Prec, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  hoverTooltip,
  keymap,
  showTooltip,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import {
  blockAt,
  echoesAt,
  GROUP_OF,
  keptKey,
  type PencilGroup,
  type PencilMark,
  pencilMarks,
  type PencilRule,
} from "../domain/pencil.ts";
import { canTry, openTriesAt } from "./proseTries.ts";

export interface PencilText {
  readonly name: string;
  readonly groups: Readonly<Record<PencilGroup, string>>;
  readonly rules: Readonly<Record<PencilRule, string>>;
  readonly why: Readonly<Record<PencilRule, string>>;
  readonly judgement: string;
  readonly tryOther: string;
  readonly tryKeys: string;
  readonly keep: string;
  readonly settings: string;
}

export interface PencilConfig {
  readonly on: ReadonlySet<PencilGroup>;
  readonly kept: ReadonlySet<string>;
  readonly language: string;
  readonly text: PencilText;
  readonly onKeep: (key: string) => void;
  readonly onSettings: () => void;
  readonly onCount: (count: number) => void;
}

export type PencilProps = PencilConfig;

export const pencilConfigOf = (props: PencilProps, latest: () => PencilProps): PencilConfig => ({
  on: props.on,
  kept: props.kept,
  text: props.text,
  language: props.language,
  onKeep: (key) => latest().onKeep(key),
  onSettings: () => latest().onSettings(),
  onCount: (n) => latest().onCount(n),
});

export const setPencil = StateEffect.define<PencilConfig>();

type LatestPencil = RefObject<{ readonly pencil: PencilProps }>;

export const useSyncPencil = (
  view: RefObject<EditorView | null>,
  latest: LatestPencil,
  props: PencilProps,
) => {
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- CodeMirror is outside React: the Pencil's groups, kept marks, words and the text's language reach its marks.
  useEffect(() => {
    const config = pencilConfigOf(props, () => latest.current.pencil);
    view.current?.dispatch({ effects: setPencil.of(config) });
  }, [view, props, latest]);
};

const configField = StateField.define<PencilConfig | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setPencil)) return effect.value;
    return value;
  },
});

const configOf = (state: EditorState) => state.field(configField, false) ?? null;

interface Shown {
  readonly marks: ReadonlyArray<PencilMark>;
  readonly decorations: DecorationSet;
}

const MARK_CLASS: Readonly<Record<PencilGroup, string>> = {
  habits: "pencil-mark pencil-mark--habit",
  cliches: "pencil-mark pencil-mark--cliche",
  mechanics: "pencil-mark pencil-mark--mechanics",
  repetition: "pencil-echo",
};

const echoMark = Decoration.mark({ class: "pencil-echo" });

class Bracket extends WidgetType {
  readonly open: boolean;
  constructor(open: boolean) {
    super();
    this.open = open;
  }
  override eq(other: Bracket) {
    return other.open === this.open;
  }
  override toDOM() {
    const node = document.createElement("span");
    node.className = `pencil-bracket pencil-bracket--${this.open ? "open" : "close"}`;
    node.setAttribute("aria-hidden", "true");
    return node;
  }
}

const OPEN_BRACKET = Decoration.widget({ widget: new Bracket(true), side: 1 });
const CLOSE_BRACKET = Decoration.widget({ widget: new Bracket(false), side: -1 });

const pencilView = ViewPlugin.fromClass(
  class {
    all: ReadonlyArray<PencilMark> = [];
    writing: number | null = null;
    shown: Shown = { marks: [], decorations: Decoration.none };
    echoes: DecorationSet = Decoration.none;
    decorations: DecorationSet = Decoration.none;
    count = -1;

    constructor(view: EditorView) {
      this.read(view.state);
      this.build(view);
    }

    read(state: EditorState) {
      const config = configOf(state);
      this.all =
        config === null ? [] : pencilMarks(state.doc.toString(), config.language, config.on);
    }

    update(update: ViewUpdate) {
      const config = configOf(update.state);
      const configChanged = config !== configOf(update.startState);
      if (update.docChanged || configChanged) this.read(update.state);
      const head = update.state.selection.main.head;
      const before = this.writing;
      if (!update.view.hasFocus) this.writing = null;
      else if (
        update.docChanged &&
        update.transactions.some((t) => t.isUserEvent("input") || t.isUserEvent("delete"))
      ) {
        this.writing = head;
      } else if (this.writing !== null) {
        const mapped = update.changes.mapPos(this.writing);
        const body = update.state.doc.toString();
        const block = blockAt(body, mapped);
        this.writing = block !== null && block.from <= head && head <= block.to ? mapped : null;
      }
      if (
        update.docChanged ||
        configChanged ||
        update.selectionSet ||
        update.focusChanged ||
        before !== this.writing
      ) {
        this.build(update.view);
      }
    }

    build(view: EditorView) {
      const { state } = view;
      const config = configOf(state);
      if (config === null) return;
      const body = state.doc.toString();
      const hidden = this.writing === null ? null : blockAt(body, this.writing);
      const marks = this.all.filter(
        (mark) =>
          config.on.has(GROUP_OF[mark.rule]) &&
          !(hidden !== null && mark.from >= hidden.from && mark.to <= hidden.to) &&
          !config.kept.has(keptKey(body, mark)),
      );
      this.shown = {
        marks,
        decorations: Decoration.set(
          marks.flatMap((mark) => {
            const words = Decoration.mark({
              class: MARK_CLASS[GROUP_OF[mark.rule]],
              attributes: { "data-pencil": mark.rule },
            }).range(mark.from, mark.to);
            return mark.rule === "cliche"
              ? [OPEN_BRACKET.range(mark.from), words, CLOSE_BRACKET.range(mark.to)]
              : [words];
          }),
          true,
        ),
      };
      const range = state.selection.main;
      this.echoes =
        config.on.has("repetition") && view.hasFocus && range.empty
          ? Decoration.set(
              echoesAt(body, range.head, config.language).map((span) =>
                echoMark.range(span.from, span.to),
              ),
            )
          : Decoration.none;
      this.decorations = this.shown.decorations;
      if (marks.length !== this.count) {
        this.count = marks.length;
        const count = marks.length;
        queueMicrotask(() => config.onCount(count));
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const echoLayer = EditorView.decorations.of(
  (view) => view.plugin(pencilView)?.echoes ?? Decoration.none,
);

const shownMarks = (view: EditorView) => view.plugin(pencilView)?.shown.marks ?? [];

const markAt = (view: EditorView, pos: number, side: -1 | 0 | 1 = 0) =>
  shownMarks(view).find((mark) =>
    side < 0
      ? mark.from < pos && pos <= mark.to
      : side > 0
        ? mark.from <= pos && pos < mark.to
        : mark.from <= pos && pos <= mark.to,
  ) ?? null;

const slipDom = (view: EditorView, mark: PencilMark, focus: boolean) => {
  const config = configOf(view.state);
  const dom = document.createElement("div");
  dom.className = "pencil-slip";
  if (config === null) return { dom };
  const { text } = config;
  const body = view.state.doc.toString();
  const words = body.slice(mark.from, mark.to).replace(/\s+/gu, " ");

  const head = document.createElement("div");
  head.className = "pencil-slip__head";
  const name = document.createElement("span");
  name.className = "pencil-slip__rule";
  name.textContent = text.rules[mark.rule];
  const group = document.createElement("span");
  group.className = "pencil-slip__group";
  group.textContent = `${text.name} · ${text.judgement}`;
  head.append(name, group);

  const why = document.createElement("p");
  why.className = "pencil-slip__why";
  why.textContent = text.why[mark.rule];

  const quote = document.createElement("p");
  quote.className = "pencil-slip__words";
  quote.textContent = `“${words}”`;

  const foot = document.createElement("div");
  foot.className = "pencil-slip__foot";
  const tryButton = document.createElement("button");
  tryButton.type = "button";
  tryButton.className = "button button--small";
  tryButton.textContent = text.tryOther;
  const keys = document.createElement("kbd");
  keys.className = "key";
  keys.setAttribute("aria-hidden", "true");
  keys.textContent = text.tryKeys;
  tryButton.append(keys);
  tryButton.addEventListener("click", () => {
    view.dispatch({ selection: { anchor: mark.from, head: mark.to }, effects: openSlip.of(null) });
    view.focus();
    openTriesAt(view);
  });
  const keep = document.createElement("button");
  keep.type = "button";
  keep.className = "link-button";
  keep.textContent = text.keep;
  keep.addEventListener("click", () => {
    config.onKeep(keptKey(body, mark));
    view.dispatch({ effects: openSlip.of(null) });
    view.focus();
  });
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "link-button";
  settings.textContent = text.settings;
  settings.addEventListener("click", () => {
    view.dispatch({ effects: openSlip.of(null) });
    config.onSettings();
  });
  const tryable =
    GROUP_OF[mark.rule] !== "mechanics" &&
    canTry(view.state.update({ selection: { anchor: mark.from, head: mark.to } }).state);
  if (!tryable) foot.append(keep, settings);
  else foot.append(tryButton, keep, settings);

  dom.append(head, why, quote, foot);
  dom.setAttribute("role", "dialog");
  dom.setAttribute("aria-label", text.rules[mark.rule]);
  dom.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    view.dispatch({ effects: openSlip.of(null) });
    view.focus();
  });
  return {
    dom,
    mount: () => {
      if (focus) (foot.querySelector("button") as HTMLButtonElement | null)?.focus();
    },
  };
};

const openSlip = StateEffect.define<PencilMark | null>();

const slipField = StateField.define<PencilMark | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(openSlip)) return effect.value;
      if (effect.is(setPencil)) return null;
    }
    return transaction.docChanged ? null : value;
  },
  provide: (field) =>
    showTooltip.from(field, (mark): Tooltip | null =>
      mark === null
        ? null
        : {
            pos: mark.from,
            end: mark.to,
            above: false,
            create: (view) => slipDom(view, mark, true),
          },
    ),
});

const hoverSlip = hoverTooltip(
  (view, pos, side) => {
    if (view.state.field(slipField) !== null) return null;
    const mark = markAt(view, pos, side);
    if (mark === null) return null;
    return {
      pos: mark.from,
      end: mark.to,
      above: false,
      create: (editor) => slipDom(editor, mark, false),
    };
  },
  {
    hoverTime: 300,
    hideOnChange: true,
    hideOn: (transaction) => transaction.effects.some((effect) => effect.is(setPencil)),
  },
);

const showAtCaret = (view: EditorView) => {
  const head = view.state.selection.main.head;
  const mark = markAt(view, head);
  if (mark === null) return false;
  view.dispatch({ effects: openSlip.of(mark) });
  return true;
};

export const pencilExtension = (latest: LatestPencil) => {
  const initial = pencilConfigOf(latest.current.pencil, () => latest.current.pencil);
  return [
    configField.init(() => initial),
    pencilView,
    echoLayer,
    slipField,
    hoverSlip,
    Prec.high(
      keymap.of([
        { key: "Mod-.", run: showAtCaret },
        {
          key: "Escape",
          run: (view) => {
            if (view.state.field(slipField) === null) return false;
            view.dispatch({ effects: openSlip.of(null) });
            return true;
          },
        },
      ]),
    ),
  ];
};

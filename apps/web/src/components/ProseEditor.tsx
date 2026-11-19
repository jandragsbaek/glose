import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  Compartment,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  placeholder as placeholderText,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { findReferences, linkKey, type TryGroup } from "@glose/contracts";
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

import { referenceLead } from "../domain/writing.ts";
import { FormatBar, type FormatCommand, type FormatState } from "./FormatBar.tsx";
import {
  activeStyles,
  type BlockStyle,
  formattingMarks,
  setBlockStyle,
  toggleEmphasis,
} from "./proseFormatting.ts";
import {
  canTry,
  fromSaved,
  openTriesAt,
  triesExtension,
  triesHint,
  type TriesState,
} from "./proseTries.ts";
import {
  leftOfPos,
  reportTries,
  triesHandle,
  type TriesHandle,
  type TriesText,
} from "./proseTriesHandle.ts";

export interface ProseHandle {
  readonly replace: (from: number, to: number, text: string, focus?: boolean) => void;
  readonly select: (from: number, to: number) => void;
  readonly citePoint: () => number;
  readonly topOf: (pos: number) => number | null;
  readonly focusedCaret: () => number | null;
  readonly posAtHeight: (clientY: number) => number | null;
  readonly bottomOf: (pos: number) => number | null;
  readonly focus: () => void;
  readonly format: (command: FormatCommand) => void;
  readonly leftOf: (pos: number) => number | null;
  readonly tries: TriesHandle;
}

const FORMAT: Record<FormatCommand, (view: EditorView) => boolean> = {
  strong: toggleEmphasis("strong"),
  em: toggleEmphasis("em"),
  h2: setBlockStyle(2),
  h3: setBlockStyle(3),
};

const blockKey = (level: BlockStyle) => ({
  key: `Ctrl-Shift-${level}`,
  mac: `Cmd-Alt-${level}`,
  run: setBlockStyle(level),
});

const leadOf = referenceLead;

const referenceAt = (state: EditorState, pos: number) => {
  const body = state.doc.toString();
  return findReferences(body).find((token) => leadOf(body, token.start) === pos) ?? null;
};

export const referenceKey = (target: string, location: string | null) =>
  `${linkKey(target)}|${location ?? ""}`;

const setFlagged = StateEffect.define<ReadonlySet<string>>();

export const flaggedKeys = (keys: Iterable<string>) => [...new Set(keys)].sort().join("\n");
const flaggedField = StateField.define<ReadonlySet<string>>({
  create: () => new Set(),
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setFlagged)) return effect.value;
    return value;
  },
});

class ReferenceMark extends WidgetType {
  readonly number: number;
  readonly flagged: boolean;
  readonly label: string;
  readonly joined: boolean;
  constructor(number: number, flagged: boolean, label: string, joined: boolean) {
    super();
    this.number = number;
    this.flagged = flagged;
    this.label = label;
    this.joined = joined;
  }
  override eq(other: ReferenceMark) {
    return (
      other.number === this.number &&
      other.flagged === this.flagged &&
      other.label === this.label &&
      other.joined === this.joined
    );
  }
  override toDOM() {
    const mark = document.createElement("sup");
    mark.className = [
      "prose-editor__ref",
      this.flagged ? "prose-editor__ref--flagged" : "",
      this.joined ? "prose-editor__ref--joined" : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (this.joined) {
      const comma = document.createElement("span");
      comma.className = "ref-sep";
      comma.textContent = ",";
      mark.append(comma);
    }
    mark.append(String(this.number));
    mark.setAttribute("role", "doc-noteref");
    mark.setAttribute("aria-label", this.label);
    return mark;
  }
  override ignoreEvent() {
    return false;
  }
}

const referenceMarks = (label: (n: number, flagged: boolean) => string) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.startState.field(flaggedField) !== update.state.field(flaggedField)
        ) {
          this.decorations = this.build(update.view);
        }
      }
      build(view: EditorView) {
        const { state } = view;
        const flagged = state.field(flaggedField);
        const body = state.doc.toString();
        const tokens = findReferences(body);
        return Decoration.set(
          tokens.map((token, index) => {
            const bad = flagged.has(referenceKey(token.target, token.location));
            const lead = leadOf(body, token.start);
            const joined = tokens[index - 1]?.end === lead;
            return Decoration.replace({
              widget: new ReferenceMark(index + 1, bad, label(index + 1, bad), joined),
            }).range(lead, token.end);
          }),
        );
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

const wording = (text: {
  label: string;
  placeholder: string;
  referenceLabel: (n: number, flagged: boolean) => string;
  triesHint: string;
}) => [
  EditorView.contentAttributes.of({
    "aria-label": text.label,
    "aria-multiline": "true",
    spellcheck: "true",
  }),
  placeholderText(text.placeholder),
  referenceMarks(text.referenceLabel),
  triesHint(text.triesHint),
];

const BAR_ROOM = 40;

const gapTo = (editor: EditorView, pos: number, forward: boolean, edge: number) => {
  let cursor = EditorSelection.cursor(pos);
  for (let step = 0; step < 4; step++) {
    const next = editor.moveVertically(cursor, forward);
    if (next.head === cursor.head) break;
    cursor = next;
    if (editor.state.doc.lineAt(next.head).text.trim() === "") continue;
    const coords = editor.coordsAtPos(next.head, forward ? 1 : -1);
    if (coords === null) break;
    return forward ? coords.top - edge : edge - coords.bottom;
  }
  return Number.POSITIVE_INFINITY;
};

const barBelow = (editor: EditorView, top: number, bottom: number) => {
  const { from, to } = editor.state.selection.main;
  const chrome = document.querySelector(".desk-bar")?.getBoundingClientRect().bottom ?? 0;
  const roomAbove = top - chrome >= BAR_ROOM && gapTo(editor, from, false, top) >= BAR_ROOM;
  if (roomAbove) return false;
  if (gapTo(editor, to, true, bottom) >= BAR_ROOM) return true;
  return top - chrome < BAR_ROOM;
};

export function ProseEditor({
  ref,
  initial,
  flagged,
  label,
  language,
  placeholder,
  referenceLabel,
  initialTries,
  triesText,
  onChange,
  onTries,
  onLayout,
  onCite,
  onEditReference,
}: {
  readonly ref: Ref<ProseHandle>;
  readonly initial: string;
  readonly flagged: string;
  readonly label: string;
  readonly language: string;
  readonly placeholder: string;
  readonly referenceLabel: (n: number, flagged: boolean) => string;
  readonly initialTries: ReadonlyArray<TryGroup>;
  readonly triesText: TriesText;
  readonly onChange: (body: string) => void;
  readonly onTries: (tries: TriesState) => void;
  readonly onLayout: () => void;
  readonly onCite: (from: number, to: number, typed?: boolean) => void;
  readonly onEditReference: (start: number) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const touched = useRef(false);
  const words = useRef(new Compartment());
  const view = useRef<EditorView | null>(null);
  const [bar, setBar] = useState<FormatState | null>(null);
  const [said, setSaid] = useState("");
  const latest = useRef({
    onChange,
    onTries,
    onLayout,
    onCite,
    onEditReference,
    setBar,
    setSaid,
    triesText,
  });
  const mount = useRef({
    initial,
    initialTries,
    label,
    placeholder,
    referenceLabel,
    triesHint: triesText.hint,
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: CodeMirror's listeners, made once, call the desk's newest callbacks.
  useLayoutEffect(() => {
    latest.current = {
      onChange,
      onTries,
      onLayout,
      onCite,
      onEditReference,
      setBar,
      setSaid,
      triesText,
    };
  });

  const showBar = (editor: EditorView) => {
    const range = editor.state.selection.main;
    const node = host.current;
    if (!editor.hasFocus) {
      window.setTimeout(() => {
        if (!frame.current?.contains(document.activeElement)) latest.current.setBar(null);
      }, 0);
      return;
    }
    touched.current = true;
    if (range.empty || node === null) {
      latest.current.setBar(null);
      return;
    }
    const start = editor.coordsAtPos(range.from);
    const end = editor.coordsAtPos(range.to);
    const box = node.getBoundingClientRect();
    if (start === null || end === null) return;
    latest.current.setBar({
      top: start.top - box.top,
      bottom: end.bottom - box.top,
      below: barBelow(editor, start.top, end.bottom),
      left: Math.max(0, start.left - box.left),
      tryable: canTry(editor.state),
      ...activeStyles(editor.state),
    });
  };

  const attach = (node: HTMLDivElement | null) => {
    host.current = node;
    if (node === null) {
      view.current?.destroy();
      view.current = null;
      return;
    }
    if (view.current !== null) return;
    view.current = new EditorView({
      parent: node,
      state: EditorState.create({
        doc: mount.current.initial,
        extensions: [
          history(),
          keymap.of([
            {
              key: "Mod-k",
              run: (editor) => {
                const range = editor.state.selection.main;
                const token = range.empty ? referenceAt(editor.state, range.head) : null;
                if (token !== null) latest.current.onEditReference(token.start);
                else latest.current.onCite(range.to, range.to);
                return true;
              },
            },
            { key: "Mod-b", run: toggleEmphasis("strong") },
            { key: "Mod-i", run: toggleEmphasis("em") },
            blockKey(2),
            blockKey(3),
            blockKey(0),
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.lineWrapping,
          flaggedField,
          words.current.of(wording(mount.current)),
          formattingMarks,
          triesExtension(fromSaved(mount.current.initialTries)),
          EditorView.domEventHandlers({
            mousedown: (event, editor) => {
              const mark =
                event.target instanceof Element ? event.target.closest(".prose-editor__ref") : null;
              if (mark === null) return false;
              const token = referenceAt(editor.state, editor.posAtDOM(mark));
              if (token === null) return false;
              event.preventDefault();
              latest.current.onEditReference(token.start);
              return true;
            },
          }),
          EditorView.inputHandler.of((editor, from, to, text) => {
            if (text !== "[" || from !== to || editor.state.sliceDoc(from - 1, from) !== "[") {
              return false;
            }
            editor.dispatch({ changes: { from: from - 1, to, insert: "" } });
            latest.current.onCite(from - 1, from - 1, true);
            return true;
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
            reportTries(update, latest.current);
            if (update.docChanged || update.geometryChanged || update.viewportChanged) {
              latest.current.onLayout();
            }
            if (
              update.selectionSet ||
              update.focusChanged ||
              update.docChanged ||
              update.geometryChanged
            ) {
              showBar(update.view);
            }
          }),
        ],
      }),
    });
    latest.current.onLayout();
  };

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- CodeMirror is outside React: it draws the flagged References in rubric.
  useEffect(() => {
    view.current?.dispatch({
      effects: setFlagged.of(new Set(flagged.split("\n").filter(Boolean))),
    });
  }, [flagged]);

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- CodeMirror is outside React: its label, placeholder and Reference names follow the interface language.
  useEffect(() => {
    view.current?.dispatch({
      effects: words.current.reconfigure(
        wording({ label, placeholder, referenceLabel, triesHint: triesText.hint }),
      ),
    });
  }, [label, placeholder, referenceLabel, triesText.hint]);

  const format = (command: FormatCommand) => {
    const editor = view.current;
    if (editor === null) return;
    FORMAT[command](editor);
    editor.focus();
  };

  useImperativeHandle(ref, () => ({
    replace: (from, to, text, focus = true) => {
      const editor = view.current;
      if (editor === null) return;
      editor.dispatch({
        changes: { from, to, insert: text },
        selection: focus ? EditorSelection.cursor(from + text.length) : undefined,
        scrollIntoView: focus,
      });
      if (focus) editor.focus();
    },
    select: (from, to) => {
      const editor = view.current;
      if (editor === null) return;
      editor.dispatch({ selection: EditorSelection.range(from, to), scrollIntoView: true });
      editor.focus();
    },
    citePoint: () => {
      const editor = view.current;
      if (editor === null) return 0;
      return touched.current ? editor.state.selection.main.to : editor.state.doc.length;
    },
    topOf: (pos) => {
      const editor = view.current;
      const node = host.current;
      if (editor === null || node === null) return null;
      const coords = editor.coordsAtPos(Math.min(pos, editor.state.doc.length));
      return coords === null ? null : coords.top - node.getBoundingClientRect().top;
    },
    focusedCaret: () => {
      const editor = view.current;
      return editor !== null && editor.hasFocus ? editor.state.selection.main.head : null;
    },
    posAtHeight: (clientY) => {
      const editor = view.current;
      if (editor === null) return null;
      const box = editor.contentDOM.getBoundingClientRect();
      return editor.posAtCoords({ x: box.left + 4, y: clientY }, false);
    },
    bottomOf: (pos) => {
      const editor = view.current;
      const node = host.current;
      if (editor === null || node === null) return null;
      const coords = editor.coordsAtPos(Math.min(pos, editor.state.doc.length), -1);
      return coords === null ? null : coords.bottom - node.getBoundingClientRect().top;
    },
    focus: () => view.current?.focus(),
    format,
    leftOf: (pos) => leftOfPos(view.current, host.current, pos),
    tries: triesHandle(() => view.current),
  }));

  return (
    <div className="prose-editor" lang={language} ref={frame}>
      <div ref={attach} />
      {bar === null ? null : (
        <FormatBar
          state={bar}
          onFormat={format}
          onCite={() => {
            const range = view.current?.state.selection.main;
            if (range !== undefined) latest.current.onCite(range.to, range.to);
          }}
          onTries={() => {
            if (view.current !== null) openTriesAt(view.current);
          }}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

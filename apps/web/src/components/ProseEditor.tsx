import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderText } from "@codemirror/view";
import type { TryGroup } from "@glose/contracts";
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

import type { OverviewLine } from "./overviewMap.ts";
import { flaggedField, referenceAt, referenceMarks, setFlagged } from "./proseReferences.ts";
import { FormatBar, type FormatCommand, type FormatState } from "./FormatBar.tsx";
import {
  activeStyles,
  type BlockStyle,
  formattingMarks,
  setBlockStyle,
  toggleEmphasis,
} from "./proseFormatting.ts";
import { pencilExtension, type PencilProps, useSyncPencil } from "./prosePencil.ts";
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
  readonly lines: () => ProseLines | null;
  readonly tries: TriesHandle;
}

export interface ProseLines {
  readonly lines: ReadonlyArray<OverviewLine>;
  readonly columns: number;
  readonly lineHeight: number;
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
  pencil,
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
  readonly pencil: PencilProps;
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
    pencil,
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
      pencil,
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
          pencilExtension(latest),
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

  useSyncPencil(view, latest, pencil);
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
    lines: () => {
      const editor = view.current;
      const node = host.current;
      if (editor === null || node === null) return null;
      const shift = editor.documentTop - node.getBoundingClientRect().top;
      const { doc } = editor.state;
      const lines: Array<OverviewLine> = [];
      for (let number = 1; number <= doc.lines; number++) {
        const line = doc.line(number);
        const block = editor.lineBlockAt(line.from);
        lines.push({ top: block.top + shift, height: block.height, text: line.text });
      }
      const first = editor.contentDOM.querySelector(".cm-line");
      const style = first === null ? null : getComputedStyle(first);
      const inset =
        style === null ? 0 : parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return {
        lines,
        columns: (editor.contentDOM.clientWidth - inset) / editor.defaultCharacterWidth,
        lineHeight: editor.defaultLineHeight,
      };
    },
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

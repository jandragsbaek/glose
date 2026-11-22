import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  placeholder as placeholderText,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { type GraphNode, parseWikilink, type Source } from "@glose/contracts";
import { useLayoutEffect, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { FormatBar, type FormatCommand, type FormatState } from "./FormatBar.tsx";
import { LinkSlip } from "./LinkSlip.tsx";
import {
  activeStyles,
  type BlockStyle,
  formattingMarks,
  setBlockStyle,
  toggleEmphasis,
} from "./proseFormatting.ts";

const LINK = /\[\[[^[\]\n]+\]\]/g;
const BAR_ROOM = 40;

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

const linkMark = Decoration.mark({ class: "note-editor__link" });

const linkMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
    }
    build(view: EditorView) {
      const marks: Array<Range<Decoration>> = [];
      for (const { from, to } of view.visibleRanges) {
        for (const match of view.state.sliceDoc(from, to).matchAll(LINK)) {
          marks.push(linkMark.range(from + match.index, from + match.index + match[0].length));
        }
      }
      return Decoration.set(marks);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

type Slip = {
  readonly from: number;
  readonly to: number;
  readonly top: number;
  readonly query: string;
  readonly typed: boolean;
};

const linkAt = (state: EditorState, pos: number): string | null => {
  const line = state.doc.lineAt(pos);
  for (const match of line.text.matchAll(LINK)) {
    const start = line.from + match.index;
    if (pos >= start && pos <= start + match[0].length) {
      return parseWikilink(match[0].slice(2, -2)).target || null;
    }
  }
  return null;
};

export function NoteEditor({
  initial,
  self,
  autoFocus,
  label,
  placeholder,
  nodes,
  sources,
  onChange,
  onBlur,
  onFollow,
}: {
  readonly initial: string;
  readonly self: string;
  readonly autoFocus: boolean;
  readonly label: string;
  readonly placeholder: string;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly sources: ReadonlyArray<Source>;
  readonly onChange: (body: string) => void;
  readonly onBlur: () => void;
  readonly onFollow: (target: string) => boolean;
}) {
  const t = useT();
  const frame = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const [bar, setBar] = useState<FormatState | null>(null);
  const [slip, setSlip] = useState<Slip | null>(null);
  const open = useRef<Slip | null>(null);
  const showSlip = (next: Slip | null) => {
    open.current = next;
    setSlip(next);
  };
  const latest = useRef({ onChange, onBlur, onFollow, setBar, showSlip });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: CodeMirror's listeners, made once, call the page's newest callbacks.
  useLayoutEffect(() => {
    latest.current = { onChange, onBlur, onFollow, setBar, showSlip };
  });
  const mount = useRef({ initial, label, placeholder, autoFocus });

  const below = (editor: EditorView, pos: number) => {
    const box = frame.current?.getBoundingClientRect();
    const coords = editor.coordsAtPos(pos);
    return box === undefined || coords === null ? 0 : coords.bottom - box.top + 6;
  };

  const openSlip = (editor: EditorView, typed: boolean) => {
    const { from, to } = editor.state.selection.main;
    latest.current.setBar(null);
    latest.current.showSlip({
      from,
      to,
      top: below(editor, to),
      query: editor.state.sliceDoc(from, to).trim(),
      typed,
    });
  };

  const follow = (editor: EditorView, pos: number) => {
    const target = linkAt(editor.state, pos);
    return target !== null && latest.current.onFollow(target);
  };

  const showBar = (editor: EditorView) => {
    const range = editor.state.selection.main;
    const box = frame.current?.getBoundingClientRect();
    if (!editor.hasFocus || range.empty || box === undefined) {
      window.setTimeout(() => {
        if (!frame.current?.contains(document.activeElement)) latest.current.setBar(null);
      }, 0);
      if (range.empty) latest.current.setBar(null);
      return;
    }
    const start = editor.coordsAtPos(range.from);
    const end = editor.coordsAtPos(range.to);
    if (start === null || end === null) return;
    latest.current.setBar({
      top: start.top - box.top,
      bottom: end.bottom - box.top,
      below: start.top - box.top < BAR_ROOM,
      left: Math.max(0, start.left - box.left),
      tryable: false,
      ...activeStyles(editor.state),
    });
  };

  const attach = (node: HTMLDivElement | null) => {
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
                openSlip(editor, false);
                return true;
              },
            },
            {
              key: "Mod-Enter",
              run: (editor) => follow(editor, editor.state.selection.main.head),
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
          EditorView.contentAttributes.of({
            "aria-label": mount.current.label,
            "aria-multiline": "true",
            spellcheck: "true",
          }),
          placeholderText(mount.current.placeholder),
          formattingMarks,
          linkMarks,
          EditorView.inputHandler.of((editor, from, to, text) => {
            const start = text === "[[" ? from : from - 1;
            const opens =
              text === "[[" || (text === "[" && editor.state.sliceDoc(from - 1, from) === "[");
            if (!opens || from !== to) return false;
            editor.dispatch({
              changes: { from: start, to, insert: "" },
              selection: EditorSelection.cursor(start),
            });
            openSlip(editor, true);
            return true;
          }),
          EditorView.domEventHandlers({
            mousedown: (event, editor) => {
              if (!(event.metaKey || event.ctrlKey)) return false;
              const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos === null || !follow(editor, pos)) return false;
              event.preventDefault();
              return true;
            },
            blur: () => {
              latest.current.onBlur();
              return false;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.focusChanged || update.docChanged) {
              showBar(update.view);
            }
          }),
        ],
      }),
    });
    if (mount.current.autoFocus) view.current.focus();
  };

  const format = (command: FormatCommand) => {
    const editor = view.current;
    if (editor === null) return;
    FORMAT[command](editor);
    editor.focus();
  };

  const link = (target: string) => {
    const editor = view.current;
    const slip = open.current;
    if (editor === null || slip === null) return;
    const text = `[[${target}]]`;
    editor.dispatch({
      changes: { from: slip.from, to: slip.to, insert: text },
      selection: EditorSelection.cursor(slip.from + text.length),
      scrollIntoView: true,
    });
    showSlip(null);
    editor.focus();
  };

  const closeSlip = (query: string, back: boolean) => {
    const editor = view.current;
    const slip = open.current;
    if (slip === null) return;
    showSlip(null);
    if (editor !== null && slip.typed) {
      const text = `[[${query}`;
      editor.dispatch({
        changes: { from: slip.from, to: slip.from, insert: text },
        selection: back ? EditorSelection.cursor(slip.from + text.length) : undefined,
      });
    }
    if (back) editor?.focus();
  };

  return (
    <div className="prose-editor note-editor" ref={frame}>
      <div ref={attach} />
      {bar === null ? null : (
        <FormatBar
          state={bar}
          onFormat={format}
          cite={{ short: t.links.short, title: t.links.title }}
          onCite={() => {
            const editor = view.current;
            if (editor !== null) openSlip(editor, false);
          }}
        />
      )}
      {slip === null ? null : (
        <LinkSlip
          top={slip.top}
          initialQuery={slip.query}
          self={self}
          nodes={nodes}
          sources={sources}
          onLink={link}
          onClose={closeSlip}
        />
      )}
    </div>
  );
}

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  EditorSelection,
  EditorState,
  type Range,
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
import { findReferences, linkKey } from "@glose/contracts";
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

/** What the desk asks of the editor. */
export interface ProseHandle {
  /** Replaces a range of the prose (an insert when from equals to), then focuses the text. */
  readonly replace: (from: number, to: number, text: string) => void;
  /** Selects a range, such as a Reference's token so the writer can change its page. */
  readonly select: (from: number, to: number) => void;
  /** The cursor's place in the prose. */
  readonly cursor: () => number;
  /** The top of a place in the prose, in pixels from the top of the editor. */
  readonly topOf: (pos: number) => number | null;
  readonly focus: () => void;
}

/** A Reference that a check flags is drawn in rubric; keys are `target|location`. */
export const referenceKey = (target: string, location: string | null) =>
  `${linkKey(target)}|${location ?? ""}`;

const setFlagged = StateEffect.define<ReadonlySet<string>>();

/** The flagged keys as one string, so a prop that keeps its keys keeps its value. */
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
  constructor(number: number, flagged: boolean, label: string) {
    super();
    this.number = number;
    this.flagged = flagged;
    this.label = label;
  }
  override eq(other: ReferenceMark) {
    return (
      other.number === this.number && other.flagged === this.flagged && other.label === this.label
    );
  }
  override toDOM() {
    const mark = document.createElement("sup");
    mark.className = this.flagged
      ? "prose-editor__ref prose-editor__ref--flagged"
      : "prose-editor__ref";
    mark.textContent = String(this.number);
    mark.setAttribute("aria-label", this.label);
    return mark;
  }
  override ignoreEvent() {
    return false;
  }
}

/**
 * Each Reference shows as its number, raised, until the cursor enters it; then the writer sees
 * and edits the token itself (`[[Note]]{p. 64}`).
 */
const referenceMarks = (label: (n: number) => string) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.selectionSet ||
          update.startState.field(flaggedField) !== update.state.field(flaggedField)
        ) {
          this.decorations = this.build(update.view);
        }
      }
      build(view: EditorView) {
        const { state } = view;
        const flagged = state.field(flaggedField);
        const ranges: Array<Range<Decoration>> = [];
        findReferences(state.doc.toString()).forEach((token, index) => {
          const touched = state.selection.ranges.some((range) =>
            range.empty
              ? range.head > token.start && range.head < token.end
              : range.from < token.end && range.to > token.start,
          );
          const bad = flagged.has(referenceKey(token.target, token.location));
          ranges.push(
            touched
              ? Decoration.mark({
                  class: bad
                    ? "prose-editor__token prose-editor__token--flagged"
                    : "prose-editor__token",
                }).range(token.start, token.end)
              : Decoration.replace({
                  widget: new ReferenceMark(index + 1, bad, label(index + 1)),
                }).range(token.start, token.end),
          );
        });
        return Decoration.set(ranges);
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );

/** The prose of a Writing project: plain Markdown, its References drawn as numbers. */
export function ProseEditor({
  ref,
  initial,
  flagged,
  label,
  placeholder,
  referenceLabel,
  onChange,
  onLayout,
  onCite,
}: {
  readonly ref: Ref<ProseHandle>;
  readonly initial: string;
  /** Keys (see referenceKey) of the References a check flags, joined by a line break. */
  readonly flagged: string;
  /** The accessible name of the text. */
  readonly label: string;
  readonly placeholder: string;
  readonly referenceLabel: (n: number) => string;
  readonly onChange: (body: string) => void;
  /** The text moved on the page: margins line up with it again. */
  readonly onLayout: () => void;
  /** The writer typed `[[` or pressed the shortcut: choose a Note to cite at the cursor. */
  readonly onCite: (at: number) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  // The latest callbacks, read by the editor's listeners, which are made once.
  const latest = useRef({ onChange, onLayout, onCite });
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a ref, not state: CodeMirror's listeners, made once, call the desk's newest callbacks.
  useLayoutEffect(() => {
    latest.current = { onChange, onLayout, onCite };
  });

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
        doc: initial,
        extensions: [
          history(),
          keymap.of([
            {
              key: "Mod-k",
              run: (editor) => {
                latest.current.onCite(editor.state.selection.main.head);
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true" }),
          placeholderText(placeholder),
          flaggedField,
          referenceMarks(referenceLabel),
          EditorView.inputHandler.of((editor, from, to, text) => {
            if (text !== "[" || editor.state.sliceDoc(from - 1, from) !== "[") return false;
            // `[[` opens the Note picker; the brackets are not kept.
            editor.dispatch({ changes: { from: from - 1, to, insert: "" } });
            latest.current.onCite(from - 1);
            return true;
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
            if (update.docChanged || update.geometryChanged || update.viewportChanged) {
              latest.current.onLayout();
            }
          }),
        ],
      }),
    });
    latest.current.onLayout();
  };

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- CodeMirror is outside React: it draws the flagged References in rubric.
  useEffect(() => {
    view.current?.dispatch({
      effects: setFlagged.of(new Set(flagged.split("\n").filter(Boolean))),
    });
  }, [flagged]);

  useImperativeHandle(ref, () => ({
    replace: (from, to, text) => {
      const editor = view.current;
      if (editor === null) return;
      editor.dispatch({
        changes: { from, to, insert: text },
        selection: EditorSelection.cursor(from + text.length),
        scrollIntoView: true,
      });
      editor.focus();
    },
    select: (from, to) => {
      const editor = view.current;
      if (editor === null) return;
      editor.dispatch({ selection: EditorSelection.range(from, to), scrollIntoView: true });
      editor.focus();
    },
    cursor: () => view.current?.state.selection.main.head ?? 0,
    topOf: (pos) => {
      const editor = view.current;
      const node = host.current;
      if (editor === null || node === null) return null;
      const coords = editor.coordsAtPos(Math.min(pos, editor.state.doc.length));
      return coords === null ? null : coords.top - node.getBoundingClientRect().top;
    },
    focus: () => view.current?.focus(),
  }));

  return <div ref={attach} className="prose-editor" />;
}

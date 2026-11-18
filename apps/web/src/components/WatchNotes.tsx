import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
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
import { findStamps, stampLink, timestampText } from "@glose/contracts";
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

export interface WatchNotesHandle {
  readonly stamp: (seconds: number) => void;
  readonly focus: () => void;
}

class StampMark extends WidgetType {
  readonly label: string;
  readonly seconds: number;
  constructor(label: string, seconds: number) {
    super();
    this.label = label;
    this.seconds = seconds;
  }
  override eq(other: StampMark) {
    return other.label === this.label && other.seconds === this.seconds;
  }
  override toDOM() {
    const mark = document.createElement("span");
    mark.className = "watch-notes__stamp";
    mark.textContent = this.label;
    mark.dataset.seconds = String(this.seconds);
    return mark;
  }
  override ignoreEvent() {
    return false;
  }
}

const stampMarks = (videoId: string | null) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) this.decorations = this.build(update.view);
      }
      build(view: EditorView) {
        return Decoration.set(
          findStamps(view.state.doc.toString(), videoId).map((stamp) =>
            Decoration.replace({ widget: new StampMark(stamp.label, stamp.seconds) }).range(
              stamp.start,
              stamp.end,
            ),
          ),
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
  readonly label: string;
  readonly describedBy: string;
  readonly placeholder: string;
}) => [
  EditorView.contentAttributes.of({
    "aria-label": text.label,
    "aria-describedby": text.describedBy,
    "aria-multiline": "true",
    spellcheck: "true",
  }),
  placeholderText(text.placeholder),
];

export const stampInsert = (
  doc: string,
  from: number,
  to: number,
  videoId: string | null,
  seconds: number,
): string => {
  const mark = videoId === null ? `[${timestampText(seconds)}]` : stampLink(videoId, seconds);
  const before = from === 0 || /\s/.test(doc[from - 1] ?? "") ? "" : " ";
  const next = doc[to];
  const after = next === undefined || /[^\s.,;:!?)]/.test(next) ? " " : "";
  return `${before}${mark}${after}`;
};

export const stampAtCursor = (doc: string, cursor: number, videoId: string | null): number | null =>
  findStamps(doc, videoId)
    .filter((stamp) => stamp.start <= cursor)
    .at(-1)?.seconds ?? null;

export function WatchNotes({
  ref,
  initial,
  videoId,
  label,
  describedBy,
  placeholder,
  onChange,
  onBlur,
  onPlay,
  onStampKey,
  onToggleKey,
}: {
  readonly ref: Ref<WatchNotesHandle>;
  readonly initial: string;
  readonly videoId: string | null;
  readonly label: string;
  readonly describedBy: string;
  readonly placeholder: string;
  readonly onChange: (text: string) => void;
  readonly onBlur: () => void;
  readonly onPlay: (seconds: number) => void;
  readonly onStampKey: () => void;
  readonly onToggleKey: () => void;
}) {
  const view = useRef<EditorView | null>(null);
  const words = useRef(new Compartment());
  const latest = useRef({ onChange, onBlur, onPlay, onStampKey, onToggleKey });
  const mount = useRef({ initial, videoId, label, describedBy, placeholder });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a ref, not state: CodeMirror's listeners, made once, call the newest callbacks.
  useLayoutEffect(() => {
    latest.current = { onChange, onBlur, onPlay, onStampKey, onToggleKey };
  });

  const attach = (node: HTMLDivElement | null) => {
    if (node === null) {
      view.current?.destroy();
      view.current = null;
      return;
    }
    if (view.current !== null) return;
    const { videoId: video } = mount.current;
    view.current = new EditorView({
      parent: node,
      state: EditorState.create({
        doc: mount.current.initial,
        extensions: [
          history(),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                latest.current.onStampKey();
                return true;
              },
            },
            {
              key: "Mod-Shift-Enter",
              run: () => {
                latest.current.onToggleKey();
                return true;
              },
            },
            {
              key: "Alt-Enter",
              run: (editor) => {
                const seconds = stampAtCursor(
                  editor.state.doc.toString(),
                  editor.state.selection.main.head,
                  video,
                );
                if (seconds !== null) latest.current.onPlay(seconds);
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.lineWrapping,
          stampMarks(video),
          words.current.of(wording(mount.current)),
          EditorView.domEventHandlers({
            mousedown: (event) => {
              const mark =
                event.target instanceof Element
                  ? event.target.closest<HTMLElement>(".watch-notes__stamp")
                  : null;
              if (mark === null) return false;
              event.preventDefault();
              latest.current.onPlay(Number(mark.dataset.seconds));
              return true;
            },
            blur: () => {
              latest.current.onBlur();
              return false;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
  };

  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- CodeMirror is outside React: its label and placeholder follow the interface language.
  useEffect(() => {
    view.current?.dispatch({
      effects: words.current.reconfigure(wording({ label, describedBy, placeholder })),
    });
  }, [label, describedBy, placeholder]);

  useImperativeHandle(ref, () => ({
    stamp: (seconds) => {
      const editor = view.current;
      if (editor === null) return;
      const { from, to } = editor.state.selection.main;
      const insert = stampInsert(editor.state.doc.toString(), from, to, videoId, seconds);
      editor.dispatch({
        changes: { from, to, insert },
        selection: EditorSelection.cursor(from + insert.length),
        scrollIntoView: true,
        userEvent: "input",
      });
      editor.focus();
    },
    focus: () => view.current?.focus(),
  }));

  return <div className="watch-notes" ref={attach} />;
}

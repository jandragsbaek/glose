import type { EditorView, ViewUpdate } from "@codemirror/view";
import type { Dispatch, SetStateAction } from "react";

import {
  type AddResult,
  addTry,
  closeTries,
  flipped,
  flipTry,
  refusedFlip,
  removeTry,
  triesField,
  type TriesState,
} from "./proseTries.ts";

export interface TriesText {
  readonly hint: string;
  readonly flipped: (text: string, n: number, of: number) => string;
  readonly refused: string;
}

export interface TriesHandle {
  readonly flip: (id: string, index: number) => boolean;
  readonly add: (id: string, text: string, fromAi?: boolean) => AddResult;
  readonly remove: (id: string, index: number) => boolean;
  readonly close: (focus: boolean) => void;
}

export const triesHandle = (view: () => EditorView | null): TriesHandle => ({
  flip: (id, index) => {
    const editor = view();
    return editor === null || flipTry(editor, id, index);
  },
  add: (id, text, fromAi) => {
    const editor = view();
    return editor === null ? "invalid" : addTry(editor, id, text, fromAi);
  },
  remove: (id, index) => {
    const editor = view();
    return editor === null || removeTry(editor, id, index);
  },
  close: (focus) => {
    const editor = view();
    if (editor === null) return;
    closeTries(editor);
    if (focus) editor.focus();
  },
});

export const leftOfPos = (editor: EditorView | null, node: HTMLElement | null, pos: number) => {
  if (editor === null || node === null) return null;
  const coords = editor.coordsAtPos(Math.min(pos, editor.state.doc.length), 1);
  return coords === null ? null : coords.left - node.getBoundingClientRect().left;
};

const repeatable = (note: string) => (said: string) => (said === note ? `${note}\u00a0` : note);

export const reportTries = (
  update: ViewUpdate,
  editor: {
    readonly onTries: (tries: TriesState) => void;
    readonly setSaid: Dispatch<SetStateAction<string>>;
    readonly triesText: TriesText;
  },
) => {
  const tries = update.state.field(triesField);
  if (update.startState.field(triesField) !== tries) editor.onTries(tries);
  for (const transaction of update.transactions) {
    const flip = transaction.annotation(flipped);
    if (flip !== undefined) editor.setSaid(editor.triesText.flipped(flip.text, flip.n, flip.of));
    if (transaction.annotation(refusedFlip) === true) {
      editor.setSaid(repeatable(editor.triesText.refused));
    }
  }
};

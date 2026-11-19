import { history } from "@codemirror/commands";
import {
  EditorSelection,
  EditorState,
  type StateCommand,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";

import { triesExtension, triesField, type TriesEditor } from "./proseTries.ts";

export const desk = (doc: string, from: number, to = from) => {
  let state = EditorState.create({
    doc,
    selection: EditorSelection.range(from, to),
    extensions: [history(), triesExtension([])],
  });
  const editor: TriesEditor = {
    get state() {
      return state;
    },
    dispatch: (spec: TransactionSpec | Transaction) => {
      state = spec instanceof Transaction ? spec.state : state.update(spec).state;
    },
  };
  const run = (command: StateCommand) =>
    command({ state, dispatch: (transaction) => editor.dispatch(transaction) });
  const type = (at: number, text: string) =>
    editor.dispatch({ changes: { from: at, insert: text } });
  const groups = () => state.field(triesField).groups;
  return { editor, type, run, groups, text: () => state.doc.toString() };
};

export const TEXT = "It had the better verb. It was gone.";
export const AT = TEXT.indexOf("better");

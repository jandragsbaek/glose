import { assert, describe, it } from "@effect/vitest";
import { EditorSelection } from "@codemirror/state";

import { sentenceAround } from "../domain/writing.ts";
import {
  addTry,
  closeTries,
  flipTry,
  fromSaved,
  openTriesAt,
  removeTry,
  toSaved,
} from "./proseTries.ts";
import { AT, desk, TEXT } from "./proseTries.testkit.ts";

describe("Tries in the text", () => {
  it("opens the word at the caret and keeps it once a second Try is added", () => {
    const { editor, groups, text } = desk(TEXT, AT + 2);
    const id = openTriesAt(editor);
    assert.isNotNull(id);
    assert.deepStrictEqual(groups()[0]?.tries, ["better"]);
    addTry(editor, id ?? "", " sharper ");
    assert.strictEqual(text(), TEXT.replace("better", "sharper"));
    closeTries(editor);
    assert.deepStrictEqual(toSaved(groups()), [
      { at: AT, showing: 1, tries: ["better", "sharper"], ai: [] },
    ]);
  });

  it("lets a group of one Try go when the slip closes", () => {
    const { editor, groups } = desk(TEXT, AT);
    openTriesAt(editor);
    closeTries(editor);
    assert.deepStrictEqual(groups(), []);
  });

  it("refuses words across paragraphs or over a Reference", () => {
    assert.isNull(openTriesAt(desk("one\n\ntwo", 0, 8).editor));
    assert.isNull(openTriesAt(desk("A word.[[Note]] after", 2, 16).editor));
  });

  it("edits the Try that shows when the writer types in it, and keeps edges outside", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    flipTry(live.editor, id, 0);
    live.type(AT + "better".length, "!");
    live.type(AT, "the ");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
    live.type(AT + "the ".length + 3, "t");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["bettter", "sharper"]);
  });

  it("reads saved Tries back as they were written", () => {
    const saved = [{ at: AT, showing: 1, tries: ["sharper", "better"], ai: ["sharper"] }];
    assert.deepStrictEqual(toSaved(fromSaved(saved)), saved);
  });

  it("drops the AI mark from a Try the writer edits, and merges a Try typed into another", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "livelier", true);
    assert.deepStrictEqual(live.groups()[0]?.ai, ["livelier"]);
    live.type(AT + "livelie".length, "s");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "liveliesr"]);
    assert.deepStrictEqual(live.groups()[0]?.ai, []);
    live.editor.dispatch({
      changes: { from: AT, to: AT + "liveliesr".length, insert: "better" },
    });
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better"]);
  });

  it("removes a Try; removing the one that shows shows the next", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    addTry(live.editor, id, "truer");
    flipTry(live.editor, id, 1);
    removeTry(live.editor, id, 1);
    assert.strictEqual(live.text(), TEXT.replace("better", "truer"));
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "truer"]);
    removeTry(live.editor, id, 0);
    removeTry(live.editor, id, 0);
    assert.deepStrictEqual(live.groups()[0]?.tries, ["truer"]);
  });

  it("flips around the ends and moves a caret inside to the end of the new Try", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    live.editor.dispatch({ selection: EditorSelection.cursor(AT + 2) });
    flipTry(live.editor, id, 2);
    assert.strictEqual(live.text(), TEXT);
    assert.strictEqual(live.editor.state.selection.main.head, AT + "better".length);
  });
});

describe("sentenceAround", () => {
  it("gives the sentence the words sit in", () => {
    assert.strictEqual(sentenceAround(TEXT, AT, AT + 6), "It had the better verb.");
    const second = TEXT.indexOf("gone");
    assert.strictEqual(sentenceAround(TEXT, second, second + 4), "It was gone.");
    assert.strictEqual(sentenceAround("One.\nTwo words here", 5, 8), "Two words here");
  });
});

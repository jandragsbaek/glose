import { assert, describe, it } from "@effect/vitest";
import { EditorSelection, EditorState, type StateCommand } from "@codemirror/state";

import { activeStyles, setBlockStyle, toggleEmphasis } from "./proseFormatting.ts";

const run = (doc: string, from: number, to: number, command: StateCommand) => {
  let state = EditorState.create({ doc, selection: EditorSelection.range(from, to) });
  command({
    state,
    dispatch: (transaction) => {
      state = transaction.state;
    },
  });
  return state;
};

describe("toggleEmphasis", () => {
  it("adds and removes bold and italic on a word", () => {
    const bold = run("a word here", 2, 6, toggleEmphasis("strong"));
    assert.strictEqual(bold.doc.toString(), "a **word** here");
    const both = run(bold.doc.toString(), 4, 8, toggleEmphasis("em"));
    assert.strictEqual(both.doc.toString(), "a ***word*** here");
    const plain = run(both.doc.toString(), 5, 9, toggleEmphasis("strong"));
    assert.strictEqual(plain.doc.toString(), "a *word* here");
  });

  it("styles a selection over two paragraphs and takes the style off them again", () => {
    const bold = run("one\n\ntwo", 0, 8, toggleEmphasis("strong"));
    assert.strictEqual(bold.doc.toString(), "**one**\n\n**two**");
    const off = run(bold.doc.toString(), 0, bold.doc.length, toggleEmphasis("strong"));
    assert.strictEqual(off.doc.toString(), "one\n\ntwo");
  });

  it("takes the style off again with the selection the first press left", () => {
    let state = run("one\ntwo", 0, 7, toggleEmphasis("em"));
    const again = (command: StateCommand) =>
      command({
        state,
        dispatch: (transaction) => {
          state = transaction.state;
        },
      });
    again(toggleEmphasis("em"));
    assert.strictEqual(state.doc.toString(), "one\ntwo");
    state = run("one\ntwo", 0, 7, toggleEmphasis("strong"));
    again(toggleEmphasis("strong"));
    assert.strictEqual(state.doc.toString(), "one\ntwo");
  });

  it("reports bold as on for a selection whose every line is bold", () => {
    const bold = run("one\n\ntwo", 0, 8, toggleEmphasis("strong"));
    assert.isTrue(activeStyles(bold).strong);
    assert.isFalse(activeStyles(bold).em);
  });

  it("takes back an empty pair of marks when pressed again", () => {
    const once = run("a  b", 2, 2, toggleEmphasis("strong"));
    assert.strictEqual(once.doc.toString(), "a **** b");
    const twice = run(
      once.doc.toString(),
      once.selection.main.head,
      once.selection.main.head,
      toggleEmphasis("strong"),
    );
    assert.strictEqual(twice.doc.toString(), "a  b");
  });

  it("shows a heading as pressed when a triple click ends on the next line", () => {
    const state = EditorState.create({
      doc: "## Heading\nPlain text",
      selection: EditorSelection.range(0, 11),
    });
    assert.strictEqual(activeStyles(state).level, 2);
  });

  it("leaves a heading's marks outside the bold", () => {
    const doc = "Intro.\n\n## The trap\n\nBody.";
    const all = run(doc, 0, doc.length, toggleEmphasis("strong"));
    assert.strictEqual(all.doc.toString(), "**Intro.**\n\n## **The trap**\n\n**Body.**");
  });
});

describe("setBlockStyle", () => {
  it("changes only the heading marks and keeps the caret", () => {
    const state = run("Text\n## Title here\nMore", 14, 14, setBlockStyle(3));
    assert.strictEqual(state.doc.toString(), "Text\n\n### Title here\n\nMore");
    assert.strictEqual(
      state.doc.sliceString(state.selection.main.head - 4, state.selection.main.head),
      "tle ",
    );
  });

  it("leaves the next line alone when the selection ends at its start", () => {
    assert.strictEqual(
      run("First\nSecond", 0, 6, setBlockStyle(2)).doc.toString(),
      "## First\n\nSecond",
    );
  });

  it("starts a heading on an empty line", () => {
    const state = run("", 0, 0, setBlockStyle(2));
    assert.strictEqual(state.doc.toString(), "## ");
    assert.strictEqual(state.selection.main.head, 3);
  });
});

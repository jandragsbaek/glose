import { assert, describe, it } from "@effect/vitest";
import { redo, undo } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";

import { toggleEmphasis } from "./proseFormatting.ts";
import { addTry, closeTries, flipTry, openTriesAt, removeTry, toSaved } from "./proseTries.ts";
import { AT, desk, TEXT } from "./proseTries.testkit.ts";

describe("Tries and the rest of the desk", () => {
  const withTries = (from = AT + 1, to = from) => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    live.editor.dispatch({ selection: EditorSelection.range(from, to) });
    return { ...live, id };
  };

  it("undoes a flip and an added Try without losing the group, and redoes them", () => {
    const live = withTries();
    flipTry(live.editor, live.id, 1);
    live.run(undo);
    assert.strictEqual(live.text(), TEXT);
    assert.deepStrictEqual(toSaved(live.groups()), [
      { at: AT, showing: 0, tries: ["better", "sharper"], ai: [] },
    ]);
    live.run(redo);
    assert.strictEqual(live.groups()[0]?.showing, 1);

    const fresh = desk(TEXT, AT + 1);
    const id = openTriesAt(fresh.editor) ?? "";
    addTry(fresh.editor, id, "livelier", true);
    closeTries(fresh.editor);
    fresh.run(undo);
    assert.strictEqual(fresh.text(), TEXT);
    fresh.run(redo);
    assert.deepStrictEqual(toSaved(fresh.groups()), [
      { at: AT, showing: 1, tries: ["better", "livelier"], ai: ["livelier"] },
    ]);
  });

  it("brings a deleted group back with undo", () => {
    const live = withTries(AT, AT + "better".length);
    live.editor.dispatch({ changes: { from: AT, to: AT + "better".length, insert: "" } });
    assert.deepStrictEqual(live.groups(), []);
    live.run(undo);
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
  });

  it("keeps every letter typed over the words in the Try that shows", () => {
    const live = withTries(AT, AT + "better".length);
    for (const [index, letter] of [..."keener"].entries()) {
      const at = index === 0 ? AT : AT + index;
      live.editor.dispatch({
        changes: { from: at, to: index === 0 ? AT + "better".length : at, insert: letter },
        selection: EditorSelection.cursor(AT + index + 1),
        userEvent: "input.type",
      });
    }
    assert.deepStrictEqual(live.groups()[0]?.tries, ["keener", "sharper"]);
    live.editor.dispatch({ selection: EditorSelection.cursor(0) });
    live.type(AT + "keener".length, " x");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["keener", "sharper"]);
  });

  it("keeps a few words with spaces typed over the words", () => {
    const live = withTries(AT, AT + "better".length);
    for (const [index, letter] of [..."much keener"].entries()) {
      const at = index === 0 ? AT : AT + index;
      live.editor.dispatch({
        changes: { from: at, to: index === 0 ? AT + "better".length : at, insert: letter },
        selection: EditorSelection.cursor(AT + index + 1),
        userEvent: "input.type",
      });
    }
    live.editor.dispatch({ selection: EditorSelection.cursor(0) });
    assert.deepStrictEqual(live.groups()[0]?.tries, ["much keener", "sharper"]);
    assert.strictEqual(live.groups()[0]?.to, AT + "much keener".length);
  });

  it("takes letters joined to the words into the Try, so it stays whole words", () => {
    const live = withTries(0);
    live.type(AT + "better".length, "s");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["betters", "sharper"]);
  });

  it("keeps the AI mark through undo of typing, and one undo per flip", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "livelier", true);
    live.type(AT + 2, "x");
    assert.deepStrictEqual(live.groups()[0]?.ai, []);
    live.run(undo);
    assert.deepStrictEqual(live.groups()[0]?.ai, ["livelier"]);
    flipTry(live.editor, id, 0);
    live.run(undo);
    assert.strictEqual(live.groups()[0]?.showing, 1);
  });

  it("keeps each of two equal words on its own word when bold comes off", () => {
    const doc = "**Long lead** go go home.";
    const live = desk(doc, 0);
    for (const at of [doc.indexOf("go"), doc.lastIndexOf("go")]) {
      live.editor.dispatch({ selection: EditorSelection.cursor(at + 1) });
      const id = openTriesAt(live.editor) ?? "";
      addTry(live.editor, id, at === doc.indexOf("go") ? "first" : "second");
      flipTry(live.editor, id, 0);
      closeTries(live.editor);
    }
    live.editor.dispatch({ selection: EditorSelection.range(2, 11) });
    live.run(toggleEmphasis("strong"));
    assert.strictEqual(live.text(), "Long lead go go home.");
    assert.deepStrictEqual(
      live.groups().map((group) => [group.from, group.tries[1]]),
      [
        [10, "first"],
        [13, "second"],
      ],
    );
  });

  it("keeps a group of a few words when one of them is made bold", () => {
    const doc = "It had the better verb today.";
    const live = desk(doc, doc.indexOf("better"), doc.indexOf("verb") + 4);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "a sharper noun");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    live.editor.dispatch({ selection: EditorSelection.cursor(doc.indexOf("better") + 2) });
    live.run(toggleEmphasis("strong"));
    assert.deepStrictEqual(live.groups()[0]?.tries[1], "a sharper noun");
  });

  it("keeps a few-word group and its AI mark through bold and back", () => {
    const doc = "It had the better verb today.";
    const live = desk(doc, doc.indexOf("better"), doc.indexOf("verb") + 4);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "a sharper noun", true);
    removeTry(live.editor, id, 0);
    addTry(live.editor, id, "better verb");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    const at = live.text().indexOf("sharper");
    live.editor.dispatch({ selection: EditorSelection.cursor(at + 2) });
    live.run(toggleEmphasis("strong"));
    assert.include(live.text(), "**sharper**");
    assert.deepStrictEqual(live.groups()[0]?.ai, ["a **sharper** noun"]);
    live.editor.dispatch({ selection: EditorSelection.cursor(live.text().indexOf("sharper") + 2) });
    live.run(toggleEmphasis("strong"));
    assert.strictEqual(live.text(), doc.replace("better verb", "a sharper noun"));
    assert.deepStrictEqual(live.groups()[0]?.tries, ["a sharper noun", "better verb"]);
    assert.deepStrictEqual(live.groups()[0]?.ai, ["a sharper noun"]);
  });

  it("keeps one group when two tracked words are joined, and undo brings both back", () => {
    const doc = "A red blue sky.";
    const live = desk(doc, 0);
    for (const [word, other] of [
      ["red", "green"],
      ["blue", "grey"],
    ] as const) {
      live.editor.dispatch({ selection: EditorSelection.cursor(doc.indexOf(word) + 1) });
      const id = openTriesAt(live.editor) ?? "";
      addTry(live.editor, id, other);
      flipTry(live.editor, id, 0);
      closeTries(live.editor);
    }
    const space = doc.indexOf(" blue");
    live.editor.dispatch({ changes: { from: space, to: space + 1, insert: "" } });
    assert.strictEqual(live.groups().length, 1);
    live.run(undo);
    assert.strictEqual(live.text(), doc);
    assert.deepStrictEqual(
      live.groups().map((group) => group.tries),
      [
        ["red", "green"],
        ["blue", "grey"],
      ],
    );
  });

  it("gives the Try back as it was when a deleted space is undone", () => {
    const live = withTries(0);
    flipTry(live.editor, live.id, 1);
    const space = AT + "sharper".length;
    live.editor.dispatch({ changes: { from: space, to: space + 1, insert: "" } });
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharperverb"]);
    live.run(undo);
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
  });

  it("keeps the group through bold, a fast Backspace, and one undo", () => {
    const live = withTries(0);
    flipTry(live.editor, live.id, 1);
    live.editor.dispatch({ selection: EditorSelection.cursor(AT + 3) });
    live.run(toggleEmphasis("strong"));
    const head = live.editor.state.selection.main.head;
    live.editor.dispatch({
      changes: { from: head - 1, to: head },
      userEvent: "delete.backward",
    });
    live.run(undo);
    assert.strictEqual(live.text(), TEXT.replace("better", "sharper"));
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
  });

  it("keeps each group on its own words when bold comes off an earlier word", () => {
    const doc = "**Lead** a b a b home.";
    const live = desk(doc, 0);
    for (const at of [doc.indexOf("a b"), doc.lastIndexOf("a b")]) {
      live.editor.dispatch({ selection: EditorSelection.range(at, at + 3) });
      const id = openTriesAt(live.editor) ?? "";
      addTry(live.editor, id, at === doc.indexOf("a b") ? "one" : "two");
      flipTry(live.editor, id, 0);
      closeTries(live.editor);
    }
    live.editor.dispatch({ selection: EditorSelection.cursor(doc.indexOf("a b") + 1) });
    live.run(toggleEmphasis("em"));
    live.editor.dispatch({ selection: EditorSelection.cursor(3) });
    live.run(toggleEmphasis("strong"));
    assert.strictEqual(live.text(), "Lead *a* b a b home.");
    assert.deepStrictEqual(
      live
        .groups()
        .map((group) => [live.editor.state.sliceDoc(group.from, group.to), group.tries[1]]),
      [
        ["*a* b", "one"],
        ["a b", "two"],
      ],
    );
    assert.isTrue(flipTry(live.editor, live.groups()[0]?.id ?? "", 1));
    assert.strictEqual(live.text(), "Lead one a b home.");
  });

  it("leaves literal marks, code and a Try's own nested marks as they are", () => {
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      ["Use 2*3 here please.", "2*3", "six"],
      ["Use `x*y` here please.", "`x*y`", "plain"],
      ["It had the better verb today.", "better", "**a *b***"],
    ];
    for (const [doc, words, other] of cases) {
      const at = doc.indexOf(words);
      const live = desk(doc, at, at + words.length);
      const id = openTriesAt(live.editor) ?? "";
      addTry(live.editor, id, other);
      assert.strictEqual(live.text(), doc.replace(words, other));
      flipTry(live.editor, id, 0);
      assert.strictEqual(live.text(), doc);
      flipTry(live.editor, id, 1);
      assert.strictEqual(live.text(), doc.replace(words, other));
    }
  });

  it("gives an escaped mark back as it was, flip after flip", () => {
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      ["A *better verb* today now.", "better", "2\\*3"],
    ];
    for (const [doc, words, other] of cases) {
      const at = doc.indexOf(words);
      const live = desk(doc, at, at + words.length);
      const id = openTriesAt(live.editor) ?? "";
      assert.strictEqual(addTry(live.editor, id, other), "added");
      const away = live.text();
      for (let round = 0; round < 2; round += 1) {
        flipTry(live.editor, id, 0);
        assert.strictEqual(live.text(), doc);
        flipTry(live.editor, id, 1);
        assert.strictEqual(live.text(), away);
      }
    }
  });

  it("refuses a Try that would change the bold or italic around it, and keeps the text", () => {
    for (const [doc, words, other] of [
      ["It had **much better words** and *bigger verbs* today.", "words** and *bigger", "term"],
      ["a *b c* d *e f* g", "c* d *e", "term"],
      ["A *better verb* today now.", "better", "2*3"],
      ["It had **better verb** today.", "better", "2*3"],
      ["It had ***better verb*** today.", "better", "2*3"],
      ["It had **better *verb*** today.", "**better *verb", "sharper"],
      ["It had a much **better verb** today.", "much **better", "sharper"],
      ["* Add *better verb* today.", "*better", "sharper"],
      ["He said better is two* today now.", "better", "*sharper"],
    ] as const) {
      const at = doc.indexOf(words);
      const live = desk(doc, at, at + words.length);
      const id = openTriesAt(live.editor) ?? "";
      assert.strictEqual(addTry(live.editor, id, other), "refused");
      assert.strictEqual(live.text(), doc);
    }
  });

  it("leaves underscores inside words and triple marks alone", () => {
    const doc = "Set the user_id field before you save it.";
    const live = desk(doc, doc.indexOf("user_id") + 2);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "account");
    assert.strictEqual(live.text(), doc.replace("user_id", "account"));
    flipTry(live.editor, id, 0);
    assert.strictEqual(live.text(), doc);
    addTry(live.editor, id, "***sharper***");
    assert.strictEqual(live.text(), doc.replace("user_id", "***sharper***"));
  });

  it("lets the open group go when its paragraph shrinks to its words", () => {
    const doc = "A better verb.\n\nMore.";
    const live = desk(doc, 3);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    flipTry(live.editor, id, 0);
    live.editor.dispatch({
      changes: [
        { from: 0, to: 2 },
        { from: 8, to: 14 },
      ],
      userEvent: "delete",
    });
    assert.deepStrictEqual(live.groups(), []);
    live.run(undo);
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
  });

  it("gives the group back as it was when typing over more than its words is undone", () => {
    const doc = "It had the better verb today now.";
    const live = desk(doc, doc.indexOf("better") + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    const at = doc.indexOf("better verb");
    live.editor.dispatch({
      changes: { from: at, to: at + "better verb".length, insert: "better" },
      userEvent: "input.type",
    });
    live.run(undo);
    assert.strictEqual(live.text(), doc);
    const [group] = live.groups();
    assert.strictEqual(live.editor.state.sliceDoc(group?.from, group?.to), "better");
    assert.deepStrictEqual(group?.tries, ["better", "sharper"]);
  });

  it("lets a group go when its paragraph shrinks to its words, and undo brings it back", () => {
    const doc = "A better verb.\n\nA better verb.";
    const live = desk(doc, 3);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    live.editor.dispatch({
      changes: [
        { from: 0, to: 2 },
        { from: 8, to: 14 },
      ],
      userEvent: "delete",
    });
    assert.deepStrictEqual(live.groups(), []);
    live.run(undo);
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
  });

  it("takes the whole word with an apostrophe or a hyphen at the caret", () => {
    for (const [doc, word] of [
      ["I can't go today.", "can't"],
      ["Den er AI-genereret nu.", "AI-genereret"],
    ] as const) {
      const live = desk(doc, doc.indexOf(word) + 1);
      const id = openTriesAt(live.editor) ?? "";
      assert.deepStrictEqual(live.groups()[0]?.tries, [word]);
      addTry(live.editor, id, "other");
      assert.strictEqual(live.text(), doc.replace(word, "other"));
    }
    assert.isNull(openTriesAt(desk("I can't go.", 2, 5).editor));
    const quoted = "He said 'better' today.";
    assert.isNull(openTriesAt(desk(quoted, quoted.indexOf("' today") + 1).editor));
    const inQuotes = desk(quoted, quoted.indexOf("better") + 2);
    openTriesAt(inQuotes.editor);
    assert.deepStrictEqual(inQuotes.groups()[0]?.tries, ["better"]);
  });

  it("lets a few-word Try take bold that covers only its own first word, and still flip", () => {
    const doc = "It had the better verb today.";
    const live = desk(doc, doc.indexOf("better"), doc.indexOf("verb") + 4);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "sharper noun");
    flipTry(live.editor, id, 0);
    closeTries(live.editor);
    live.editor.dispatch({ selection: EditorSelection.cursor(doc.indexOf("better") + 2) });
    live.run(toggleEmphasis("strong"));
    assert.strictEqual(live.text(), "It had the **better** verb today.");
    assert.isTrue(flipTry(live.editor, id, 1));
    assert.strictEqual(live.text(), "It had the sharper noun today.");
    assert.isTrue(flipTry(live.editor, id, 0));
    assert.strictEqual(live.text(), "It had the **better** verb today.");
  });

  it("takes the whole bold when a new Try starts inside it", () => {
    const doc = "It had the **better** verb today.";
    const live = desk(doc, doc.indexOf("better"), doc.indexOf("verb") + 4);
    const id = openTriesAt(live.editor) ?? "";
    assert.deepStrictEqual(live.groups()[0]?.tries, ["**better** verb"]);
    assert.strictEqual(addTry(live.editor, id, "sharper noun"), "added");
    assert.strictEqual(live.text(), "It had the sharper noun today.");
  });

  it("keeps the group when the words are made bold", () => {
    const live = withTries(AT + 2);
    live.run(toggleEmphasis("strong"));
    assert.include(live.text(), "**better**");
    assert.deepStrictEqual(live.groups()[0]?.tries, ["better", "sharper"]);
    assert.strictEqual(
      live.editor.state.sliceDoc(live.groups()[0]?.from, live.groups()[0]?.to),
      "better",
    );
  });

  it("keeps a lone AI word marked when the writer's own Try is removed", () => {
    const live = desk(TEXT, AT + 1);
    const id = openTriesAt(live.editor) ?? "";
    addTry(live.editor, id, "livelier", true);
    removeTry(live.editor, id, 0);
    closeTries(live.editor);
    assert.deepStrictEqual(toSaved(live.groups()), [
      { at: AT, showing: 0, tries: ["livelier"], ai: ["livelier"] },
    ]);
  });

  it("refuses part of a word, a whole paragraph, and a selection across paragraphs", () => {
    assert.isNull(openTriesAt(desk(TEXT, AT + 1, AT + 4).editor));
    assert.isNull(openTriesAt(desk("One.\n\nShe left.", 6, 15).editor));
    assert.isNull(openTriesAt(desk("**She left.**", 2, 11).editor));
    assert.isNull(openTriesAt(desk("> She left.", 2, 11).editor));
    assert.isNull(openTriesAt(desk("> - An item", 4, 11).editor));
    const live = withTries(AT, TEXT.length);
    live.editor.dispatch({ changes: { from: TEXT.length, insert: "\n\nMore." } });
    live.editor.dispatch({ selection: EditorSelection.range(AT, TEXT.length + 4) });
    assert.isNull(openTriesAt(live.editor));
  });
});

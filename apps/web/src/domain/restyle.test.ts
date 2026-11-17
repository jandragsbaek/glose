import { assert, describe, it } from "@effect/vitest";

import { hasStyle, restyle } from "./restyle.ts";

const toggle = (text: string, word: string, kind: "strong" | "em", end = word) => {
  const from = text.indexOf(word);
  const to = text.indexOf(end, from) + end.length;
  return restyle(text, from, to, kind)?.text;
};

describe("restyle", () => {
  it("adds bold, italic and both to a word", () => {
    assert.strictEqual(toggle("a word here", "word", "strong"), "a **word** here");
    assert.strictEqual(toggle("a **word** here", "word", "em"), "a ***word*** here");
    assert.strictEqual(toggle("a ***word*** here", "word", "strong"), "a *word* here");
  });

  it("takes a style off only the words chosen", () => {
    assert.strictEqual(toggle("**one two three**", "two", "strong"), "**one** two **three**");
    assert.strictEqual(toggle("*one two three*", "two", "em"), "*one* two *three*");
  });

  it("keeps the other style whole when a new one crosses its edge", () => {
    assert.strictEqual(toggle("**one two** three", "two", "em", "three"), "**one *two*** *three*");
  });

  it("keeps a Reference and a line break inside the styled text", () => {
    assert.strictEqual(
      toggle("a claim [[Busy]] here", "claim", "strong", "]]"),
      "a **claim [[Busy]]** here",
    );
    assert.strictEqual(toggle("one\ntwo", "one", "strong", "two"), "**one\ntwo**");
  });

  it("returns where the chosen words now are", () => {
    const result = restyle("a word here", 2, 6, "strong");
    assert.strictEqual(result?.text.slice(result.from, result.to), "word");
    assert.isTrue(hasStyle("**one** two", 2, 5, "strong"));
    assert.isFalse(hasStyle("**one** two", 2, 11, "strong"));
  });
});

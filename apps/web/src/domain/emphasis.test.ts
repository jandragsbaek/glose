import { assert, describe, it } from "@effect/vitest";

import { emphasisSpans, maskReferences, textBlocks } from "./emphasis.ts";

const styled = (text: string) => {
  const spans = emphasisSpans(maskReferences(text));
  return [...spans]
    .sort((a, b) => a.open - b.open)
    .map((span) => `${span.kind}:${text.slice(span.open + span.size, span.close)}`);
};

describe("emphasisSpans", () => {
  it("reads bold, italic and both at once", () => {
    assert.deepStrictEqual(styled("a **bold** and *it* and _it_"), [
      "strong:bold",
      "em:it",
      "em:it",
    ]);
    assert.deepStrictEqual(styled("***both***"), ["em:**both**", "strong:both"]);
    assert.deepStrictEqual(styled("**bold *it***"), ["strong:bold *it*", "em:it"]);
  });

  it("leaves arithmetic and words with underscores plain", () => {
    assert.deepStrictEqual(styled("5 * 3 * 2"), []);
    assert.deepStrictEqual(styled("snake_case_word"), []);
    assert.deepStrictEqual(styled("\\*not\\* and `*code*`"), []);
  });

  it("reads a span across a Reference and across lines of one paragraph", () => {
    assert.deepStrictEqual(styled("**a claim [[Busy]]{p. 2}**"), ["strong:a claim [[Busy]]{p. 2}"]);
    assert.deepStrictEqual(styled("**one\ntwo**"), ["strong:one\ntwo"]);
    assert.deepStrictEqual(styled("**one\n\ntwo**"), []);
  });
});

describe("textBlocks", () => {
  it("sets a heading line apart from the text under it", () => {
    const body = "## Title\nText under it\nmore\n\nNext";
    assert.deepStrictEqual(
      textBlocks(body).map((block) => [body.slice(block.start, block.end), block.heading]),
      [
        ["## Title", true],
        ["Text under it\nmore", false],
        ["Next", false],
      ],
    );
  });
});

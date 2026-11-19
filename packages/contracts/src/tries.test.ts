import { assert, describe, it } from "@effect/vitest";

import { anchorTries, keepTryWords, tryPlaceOk, tryTextOk } from "./tries.ts";

const BODY = "Even the nine o'clock version had the better verb, the better one.";
const AT = BODY.indexOf("better");

describe("anchorTries", () => {
  it("keeps a group whose Try that shows is at its place", () => {
    const group = { at: AT, showing: 0, tries: ["better", "sharper"], ai: [] };
    assert.deepStrictEqual(anchorTries(BODY, [group]), [group]);
  });

  it("moves a group to the nearest whole-word place when the text moved", () => {
    const body = `Now: ${BODY}`;
    const [moved] = anchorTries(body, [
      { at: AT, showing: 1, tries: ["sharper", "better"], ai: [] },
    ]);
    assert.strictEqual(moved?.at, body.indexOf("better"));
    assert.deepStrictEqual(
      anchorTries("A betterment.", [{ at: 0, showing: 0, tries: ["better", "x"], ai: [] }]),
      [],
    );
  });

  it("drops a group the text no longer holds, with one Try, or over a Reference", () => {
    assert.deepStrictEqual(
      anchorTries("Nothing here.", [{ at: 0, showing: 0, tries: ["better", "sharper"], ai: [] }]),
      [],
    );
    assert.deepStrictEqual(
      anchorTries(BODY, [{ at: AT, showing: 0, tries: ["better", "better"], ai: [] }]),
      [],
    );
    const cited = "A word.[[Some Note]]{p. 4} After.";
    assert.deepStrictEqual(
      anchorTries(cited, [{ at: 2, showing: 0, tries: ["word.[[Some Note]]", "x"], ai: [] }]),
      [],
    );
  });

  it("keeps a word at its place before it moves another group onto the same word", () => {
    const body = "A louder start, then the better end.";
    const groups = anchorTries(body, [
      { at: 2, showing: 0, tries: ["better", "first"], ai: [] },
      { at: body.indexOf("better"), showing: 0, tries: ["better", "second"], ai: [] },
    ]);
    assert.deepStrictEqual(groups, [
      { at: body.indexOf("better"), showing: 0, tries: ["better", "second"], ai: [] },
    ]);
  });

  it("refuses part of a word, a whole paragraph, and keeps a lone AI word", () => {
    assert.deepStrictEqual(
      anchorTries("A betterment.", [{ at: 2, showing: 0, tries: ["better", "x"], ai: [] }]),
      [],
    );
    assert.deepStrictEqual(
      anchorTries("One.\n\nShe left.", [{ at: 6, showing: 0, tries: ["She left.", "x"], ai: [] }]),
      [],
    );
    const lone = { at: AT, showing: 0, tries: ["better"], ai: ["better"] };
    assert.deepStrictEqual(anchorTries(BODY, [lone]), [lone]);
  });

  it("keeps the first of two groups that would overlap, and only the AI's Tries it holds", () => {
    const groups = anchorTries(BODY, [
      { at: AT, showing: 0, tries: ["better verb", "verb"], ai: ["gone"] },
      { at: AT + 7, showing: 0, tries: ["verb", "word"], ai: ["word"] },
    ]);
    assert.deepStrictEqual(groups, [
      { at: AT, showing: 0, tries: ["better verb", "verb"], ai: [] },
    ]);
  });
});

describe("keepTryWords", () => {
  it("keeps new, short, one-line words without quotes, at most five", () => {
    assert.deepStrictEqual(
      keepTryWords(
        [
          "“livelier”",
          "Better",
          "a far too long answer of many words here",
          "x\ny",
          "truer",
          "truer",
          "a",
          "b",
          "c",
          "d",
        ],
        "better",
        [],
      ),
      ["livelier", "truer", "a", "b", "c"],
    );
  });

  it("refuses a sentence, unless the chosen words end a sentence too", () => {
    assert.deepStrictEqual(keepTryWords(["Go now.", "We should all go. Home", "go"], "leave", []), [
      "go",
    ]);
    assert.deepStrictEqual(keepTryWords(["gone."], "away.", []), ["gone."]);
    assert.deepStrictEqual(
      keepTryWords(["We should leave", "we should leave", "go off", "depart"], "leave", []),
      ["go off", "depart"],
    );
  });
});

describe("tryTextOk", () => {
  it("refuses line breaks, References, comments and edge spaces", () => {
    assert.isTrue(tryTextOk("a few words"));
    for (const bad of ["", " word", "two\nlines", "a [[Note]]", "a --> b"]) {
      assert.isFalse(tryTextOk(bad), bad);
    }
  });
});

describe("tryPlaceOk", () => {
  it("answers at once on a line with a long run of marks", () => {
    const line = `${"#".repeat(5000)}x foo bar`;
    assert.isTrue(tryPlaceOk(line, line.length - 3, line.length));
    const stars = `${"*".repeat(20000)}x word`;
    assert.isTrue(tryPlaceOk(stars, stars.length - 4, stars.length));
  });
});

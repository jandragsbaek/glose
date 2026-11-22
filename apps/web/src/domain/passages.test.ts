import { assert, describe, it } from "@effect/vitest";

import type { BookPassage } from "@glose/contracts";

import {
  bandsOf,
  furthestPage,
  hasBrokenLines,
  joinLines,
  keptBefore,
  pastedLocation,
} from "./passages.ts";

const passage = (id: string, page: string | null, words = id): BookPassage => ({
  id,
  source: "Newport 2016 Deep Work",
  page,
  words,
  yourWords: "",
  created: null,
  usedBy: [],
});

describe("Passages", () => {
  it("bands Passages by twenty pages, the ones with no page number last", () => {
    const bands = bandsOf([
      passage("a", "3"),
      passage("b", "47"),
      passage("c", "52–53"),
      passage("d", "Loc 1234"),
      passage("e", null),
    ]);
    assert.deepStrictEqual(
      bands.map((band) => [band.pages, band.passages.map(({ id }) => id)]),
      [
        [[1, 19], ["a"]],
        [
          [40, 59],
          ["b", "c"],
        ],
        [null, ["d", "e"]],
      ],
    );
  });

  it("says how far into the book the Passages reach", () => {
    assert.strictEqual(
      furthestPage([passage("a", "47"), passage("b", "120–121"), passage("c", null)]),
      "120–121",
    );
    assert.isNull(furthestPage([passage("c", "xii"), passage("d", "Loc 1234")]));
  });

  it("finds an e-reader's location at the end of a paste, and keeps the words apart", () => {
    assert.deepStrictEqual(pastedLocation("Deep work is rare.\n\nKindle Location 1234"), {
      location: "Loc 1234",
      words: "Deep work is rare.",
    });
    assert.deepStrictEqual(pastedLocation("Deep work is rare. (Page 47)"), {
      location: "47",
      words: "Deep work is rare.",
    });
    assert.isNull(pastedLocation("Deep work is rare."));
  });

  it("mends lines a PDF or an e-reader broke, and keeps the paragraphs", () => {
    assert.isTrue(hasBrokenLines("Deep work is\nrare."));
    assert.isFalse(hasBrokenLines("One.\n\nTwo."));
    assert.strictEqual(
      joinLines("Deep work is in-\ncreasingly rare\nand valuable.\n\nSecond."),
      "Deep work is increasingly rare and valuable.\n\nSecond.",
    );
  });

  it("knows words the user kept before, case and spacing aside", () => {
    const kept = passage("a", "47", "Deep work is rare.");
    assert.strictEqual(keptBefore([kept], "  deep  work is RARE. "), kept);
    assert.isNull(keptBefore([kept], "Shallow work"));
  });
});

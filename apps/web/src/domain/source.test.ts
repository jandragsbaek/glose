import { assert, describe, it } from "@effect/vitest";

import { callNumber, wordCount } from "./source.ts";

describe("callNumber", () => {
  it("uses three letters of the family name and the first-publication year", () => {
    assert.deepStrictEqual(
      [
        callNumber({ familyName: "Arendt", firstPublished: 1958 }),
        callNumber({ familyName: "Ørsted", firstPublished: 1820 }),
        callNumber({ familyName: "de Beauvoir", firstPublished: 1949 }),
        callNumber({ familyName: "Wu", firstPublished: null }),
      ],
      ["ARE 1958", "ØRS 1820", "DEB 1949", "WU ?"],
    );
  });
});

describe("wordCount", () => {
  it("counts words, not dashes or blank lines", () => {
    assert.strictEqual(wordCount("Arbejde, fremstilling  -  handling.\n\nNatalitet"), 4);
  });
});

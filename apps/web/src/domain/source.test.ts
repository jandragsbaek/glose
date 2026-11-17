import { assert, describe, it } from "@effect/vitest";

import { BOOK_TEXT_DETAILS, type Source } from "@glose/contracts";

import { callNumber, onDesk, wordCount } from "./source.ts";

const BOOK: Source = {
  id: "A book",
  familyName: "Arendt",
  givenName: null,
  title: "A book",
  firstPublished: 1958,
  edition: null,
  editionYear: null,
  publisher: null,
  translator: null,
  ...BOOK_TEXT_DETAILS,
  hasText: false,
  readingPlace: null,
  readingStep: "free-text",
  readingStart: null,
  freeText: "",
  modified: 0,
  added: 0,
};

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

  it("adds a Course lesson's week and day", () => {
    assert.strictEqual(
      callNumber({ familyName: "Lindqvist", firstPublished: 2026, kind: "lesson", part: "2.3" }),
      "LIN 2026 2.3",
    );
  });
});

describe("wordCount", () => {
  it("counts words, not dashes or blank lines", () => {
    assert.strictEqual(wordCount("Arbejde, fremstilling  -  handling.\n\nNatalitet"), 4);
  });
});

describe("onDesk", () => {
  const lesson = (part: string, more: Partial<Source> = {}): Source => ({
    ...BOOK,
    id: `Lesson ${part}`,
    kind: "lesson",
    container: "A course",
    part,
    readingStep: "read",
    readingPlace: null,
    ...more,
  });

  it("shows a course's begun lessons and the next one, in the course's order", () => {
    const sources = [
      lesson("1.3"),
      { ...BOOK, id: "A book", readingStep: "extraction" as const },
      lesson("1.2", { readingPlace: 4 }),
      lesson("1.1", { readingStep: "done" }),
      lesson("2.1"),
    ];
    assert.deepStrictEqual(
      onDesk(sources, (source) => source).map((source) => source.id),
      ["Lesson 1.2", "Lesson 1.3", "A book"],
    );
  });
});

import { BOOK_TEXT_DETAILS, type Source } from "@glose/contracts";
import { assert, describe, it } from "@effect/vitest";

import { ARENDT } from "../testkit/sources.ts";
import { listSources, MAX_SOURCES } from "./sourceTools.ts";

const source = (id: string, details: Partial<Source> = {}): Source => ({
  id,
  ...ARENDT,
  familyName: "Berg",
  givenName: "Maria",
  title: `Book ${id}`,
  publisher: null,
  ...BOOK_TEXT_DETAILS,
  hasText: false,
  videoLink: null,
  videoFile: null,
  readingPlace: null,
  readingStep: "free-text",
  readingStart: null,
  freeText: "",
  modified: 0,
  added: 0,
  ...details,
});

describe("listSources", () => {
  const recentFirst = [
    ...Array.from({ length: 40 }, (_, index) => source(`${index}`)),
    source("Arendt 1958 The Human Condition", ARENDT),
  ];

  it("gives the first Sources of a long list, and how many there are", () => {
    const listed = listSources(recentFirst, null);
    assert.deepStrictEqual(
      listed.sources.map((found) => found.id),
      recentFirst.slice(0, MAX_SOURCES).map((found) => found.id),
    );
    assert.strictEqual(listed.total, 41);
  });

  it("finds a Source beyond the first ones by words from its author and title", () => {
    const listed = listSources(recentFirst, "arendt, Human Condition");
    assert.strictEqual(listed.sources[0]?.id, "Arendt 1958 The Human Condition");
    assert.strictEqual(listed.total, 1);
  });
});

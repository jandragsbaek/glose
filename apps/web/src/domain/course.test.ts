import { assert, describe, it } from "@effect/vitest";

import { BOOK_TEXT_DETAILS, type Source } from "@glose/contracts";

import { coursesOf, shelfOf, slotAfter } from "./course.ts";

const lesson = (part: string | null, overrides: Partial<Source> = {}): Source => ({
  id: `Lindqvist 2026 ${part} Lesson`,
  familyName: "Lindqvist",
  givenName: "Anna",
  title: `Lesson ${part}`,
  firstPublished: 2026,
  edition: null,
  editionYear: null,
  publisher: null,
  translator: null,
  ...BOOK_TEXT_DETAILS,
  kind: "lesson",
  container: "Practical AI Engineering",
  part,
  hasText: true,
  videoLink: null,
  videoFile: null,
  readingPlace: null,
  readingStep: "read",
  readingStart: null,
  freeText: "",
  modified: 0,
  added: 0,
  ...overrides,
});

const filled = (shelf: ReturnType<typeof shelfOf>) =>
  shelf.weeks.map((week) => week.slots.map((slot) => (slot.lesson === null ? "·" : "#")).join(""));

describe("coursesOf", () => {
  it("groups the lessons of one course, whatever the case of its name, in week and day order", () => {
    const courses = coursesOf([
      lesson("1.2"),
      lesson("1.10", { container: "practical ai engineering", url: "https://mega.dev/c" }),
      lesson("1.1"),
      lesson("1.1", { container: "Another course", familyName: "Holm" }),
      { ...lesson(null), kind: "article", container: "Practical AI Engineering" },
    ]);

    assert.deepStrictEqual(
      courses.map((course) => [course.name, course.lessons.map((one) => one.part), course.url]),
      [
        ["Another course", ["1.1"], null],
        ["Practical AI Engineering", ["1.1", "1.2", "1.10"], "https://mega.dev/c"],
      ],
    );
  });
});

describe("shelfOf", () => {
  it("sets a new course as one week of five empty days, starting at Day 1", () => {
    const shelf = shelfOf([]);
    assert.deepStrictEqual(filled(shelf), ["·····"]);
    assert.strictEqual(shelf.next, "1.1");
  });

  it("offers the day after the last one added, and a new week once a week is full", () => {
    const partWay = shelfOf([lesson("1.1"), lesson("1.2"), lesson("1.3")]);
    assert.deepStrictEqual(filled(partWay), ["###··"]);
    assert.strictEqual(partWay.next, "1.4");

    const full = shelfOf(["1.1", "1.2", "1.3", "1.4", "1.5"].map((part) => lesson(part)));
    assert.deepStrictEqual(filled(full), ["#####", "·····"]);
    assert.strictEqual(full.next, "2.1");
  });

  it("keeps a gap where a day was skipped, and widens the week for a sixth day", () => {
    const shelf = shelfOf([lesson("1.1"), lesson("2.6")]);
    assert.deepStrictEqual(filled(shelf), ["#·····", "·····#", "······"]);
    assert.strictEqual(shelf.next, "3.1");
  });

  it("lists a lesson with no week and day, or a second lesson on one day, apart", () => {
    const shelf = shelfOf([lesson("1.1"), lesson("1.1", { id: "again" }), lesson(null)]);
    assert.deepStrictEqual(
      shelf.unplaced.map((one) => one.id),
      ["Lindqvist 2026 null Lesson", "again"],
    );
  });
});

describe("slotAfter", () => {
  it("finds the next empty day after the one just added", () => {
    const shelf = shelfOf([lesson("1.1"), lesson("1.3")]);
    assert.strictEqual(slotAfter(shelf, "1.1"), "1.2");
    assert.strictEqual(slotAfter(shelf, "1.2"), "1.4");
    assert.strictEqual(slotAfter(shelfOf([lesson("1.4")]), "1.5"), "2.1");
    assert.strictEqual(slotAfter(shelfOf([lesson("1.1")]), "5.2"), "5.3");
  });
});

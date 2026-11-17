import { assert, describe, it } from "@effect/vitest";

import {
  byFileName,
  detailsFromMarkdown,
  lessonTitle,
  partByOrder,
  partFromName,
  splitName,
} from "./importText.ts";

const CLIPPED = `---
title: "Why chunk size matters"
source: "https://example.com/chunks"
author:
  - "[[Anna Lindqvist]]"
  - "[[Bo Ek]]"
published: 2026-03-04T10:00:00Z
site: Example Notes
tags: [rag, ai]
---

# Why chunk size matters

Text.
`;

describe("detailsFromMarkdown", () => {
  it("reads a web clipper's frontmatter", () => {
    assert.deepStrictEqual(detailsFromMarkdown(CLIPPED), {
      title: "Why chunk size matters",
      family: "Lindqvist",
      given: "Anna",
      otherAuthors: ["Bo Ek"],
      published: "2026-03-04",
      year: "2026",
      url: "https://example.com/chunks",
      container: "Example Notes",
      doi: null,
    });
  });

  it("falls back to the first heading for the title", () => {
    assert.strictEqual(detailsFromMarkdown("## Lesson three\n\nText.").title, "Lesson three");
  });
});

describe("lesson files", () => {
  it("reads week and day from common file names", () => {
    assert.deepStrictEqual(
      [
        "Week 2 - Day 3 - Retrieval.md",
        "week02_day05.md",
        "W1D4 Embeddings.md",
        "2.3 Retrieval.md",
        "03-01-intro.md",
        "Introduction.md",
      ].map(partFromName),
      ["2.3", "2.5", "1.4", "2.3", "3.1", null],
    );
  });

  it("orders names as people number them and counts days by order", () => {
    assert.deepStrictEqual(
      byFileName([{ name: "day10.md" }, { name: "day2.md" }, { name: "day1.md" }]).map(
        (f) => f.name,
      ),
      ["day1.md", "day2.md", "day10.md"],
    );
    assert.deepStrictEqual(
      [0, 4, 5, 19].map((index) => partByOrder(index, 5)),
      ["1.1", "1.5", "2.1", "4.5"],
    );
  });

  it("tidies a title from the file name when the text has none", () => {
    assert.strictEqual(
      lessonTitle("Week 2 - Day 3 - Retrieval_basics.md", "Text."),
      "Retrieval basics",
    );
    assert.strictEqual(lessonTitle("x.md", "# From the heading\n\nText."), "From the heading");
  });

  it("splits a name into family and given", () => {
    assert.deepStrictEqual(splitName("Lindqvist, Anna"), { family: "Lindqvist", given: "Anna" });
    assert.deepStrictEqual(splitName("Ursula K. Le Guin"), {
      family: "Guin",
      given: "Ursula K. Le",
    });
  });
});

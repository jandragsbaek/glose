import { assert, describe, it } from "@effect/vitest";
import { resolveReferences } from "@glose/contracts";

import {
  citationParts,
  headingOf,
  hugWord,
  insertionAfter,
  noteExcerpt,
  referenceLead,
  type ProofInline,
  proofBlocks,
  withHeading,
} from "./writing.ts";

const NODES = [{ id: "Busy", kind: "note" as const, sourceId: null, body: "", page: null }];

const shape = (body: string) =>
  proofBlocks(body, resolveReferences(body, NODES, [])).map((block) => {
    const pieces =
      block.kind === "list"
        ? block.items.map((item) => item.map(piece).join("")).join(" | ")
        : block.inlines.map(piece).join("");
    return `${block.kind}: ${pieces}`;
  });

const piece = (part: ProofInline) => {
  if (part.kind === "reference") return `[${part.reference.number}]`;
  const em = part.em ? `<em>${part.text}</em>` : part.text;
  return part.strong ? `<strong>${em}</strong>` : em;
};

describe("proofBlocks", () => {
  it("reads paragraphs, headings, quotes and lists with their References", () => {
    assert.deepStrictEqual(
      shape(
        [
          "## Why *busy* fails",
          "",
          "Busy is **not** productive.[[Busy]]{p. 2}",
          "It only looks so.",
          "",
          "> A quote[[Busy]]",
          "",
          "- one[[Busy]]",
          "- two",
        ].join("\n"),
      ),
      [
        "heading: Why <em>busy</em> fails",
        "paragraph: Busy is <strong>not</strong> productive.[1] It only looks so.",
        "quote: A quote[2]",
        "list: one[3] | two",
      ],
    );
  });
});

describe("citationParts", () => {
  it("sets the title in italic", () => {
    assert.deepStrictEqual(citationParts("Cal Newport, *Deep Work* (2016), 64."), [
      { text: "Cal Newport, ", italic: false },
      { text: "Deep Work", italic: true },
      { text: " (2016), 64.", italic: false },
    ]);
  });
});

describe("insertionAfter", () => {
  it("places a Reference at the end of the sentence that holds the passage", () => {
    const body = "Most people check email every six minutes. I do too.";
    assert.strictEqual(insertionAfter(body, "every six"), body.indexOf(" I do"));
    assert.strictEqual(insertionAfter(body, "every six minutes."), body.indexOf(" I do"));
    assert.strictEqual(insertionAfter(body, "missing"), null);
  });
});

describe("headings", () => {
  it("reads a heading line and sets or clears its level", () => {
    assert.deepStrictEqual(headingOf("## The visible work trap"), { level: 2, marker: 3 });
    assert.strictEqual(headingOf("#hashtag"), null);
    assert.strictEqual(withHeading("## The trap", 3), "### The trap");
    assert.strictEqual(withHeading("### The trap", 0), "The trap");
    assert.strictEqual(withHeading("The trap", 2), "## The trap");
  });
});

describe("hugWord", () => {
  it("sets a Reference against the word before it, not after a space", () => {
    assert.strictEqual(hugWord("the inbox ", 10), 9);
    assert.strictEqual(hugWord("the inbox", 9), 9);
    assert.strictEqual(hugWord("one.  ", 6), 6);
  });
});

describe("noteExcerpt", () => {
  it("gives the first sentence of a Note as plain text", () => {
    assert.strictEqual(
      noteExcerpt(
        "It explains why [[Shallow work is easy to replicate|shallow work]] *fills* the day. More.",
      ),
      "It explains why shallow work fills the day.",
    );
  });
});

describe("proofBlocks offsets", () => {
  it("keeps styles right after an emoji and sets a Reference against its word", () => {
    const body = "😀 **a claim [[Busy]]** and more [[Busy]].";
    assert.deepStrictEqual(shape(body), ["paragraph: 😀 <strong>a claim</strong>[1] and more[2]."]);
  });
});

describe("referenceLead", () => {
  it("takes in the spaces typed before a Reference, but not a line start", () => {
    assert.strictEqual(referenceLead("word  [[A]]", 6), 4);
    assert.strictEqual(referenceLead("word[[A]]", 4), 4);
    assert.strictEqual(referenceLead("one\n  [[A]]", 6), 6);
  });
});

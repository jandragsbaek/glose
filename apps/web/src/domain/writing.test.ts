import { assert, describe, it } from "@effect/vitest";
import { resolveReferences } from "@glose/contracts";

import { citationParts, insertionAfter, type ProofInline, proofBlocks } from "./writing.ts";

const NODES = [{ id: "Busy", kind: "note" as const, sourceId: null, body: "", page: null }];

/** Each block as its kind and its pieces, with References as `[n]`. */
const shape = (body: string) =>
  proofBlocks(body, resolveReferences(body, NODES, [])).map((block) => {
    const pieces =
      block.kind === "list"
        ? block.items.map((item) => item.map(piece).join("")).join(" | ")
        : block.inlines.map(piece).join("");
    return `${block.kind}: ${pieces}`;
  });

const piece = (part: ProofInline) =>
  part.kind === "reference"
    ? `[${part.reference.number}]`
    : part.kind === "text"
      ? part.text
      : `<${part.kind}>${part.text}</${part.kind}>`;

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

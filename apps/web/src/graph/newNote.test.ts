import type { FoundPage } from "@glose/contracts";
import { describe, expect, it } from "vite-plus/test";

import { footnotesFor, insertMarker, keptQuotes } from "./newNote.ts";

const page = (id: string, state: FoundPage["state"], quotes: ReadonlyArray<string>): FoundPage => ({
  id,
  url: `https://${id}.example/`,
  title: `Page ${id}`,
  site: null,
  author: null,
  published: null,
  articleType: "web",
  stance: "supports",
  why: "",
  quotes: quotes.map((text, index) => ({ text, paragraph: index + 1 })),
  state,
  source: null,
});

describe("keptQuotes", () => {
  it("numbers a quote by its place among all found quotes, so dropping a page keeps the numbers", () => {
    const pages = [page("w1", "dropped", ["a", "b"]), page("w2", "kept", ["c"])];
    expect(keptQuotes(pages).map((quote) => [quote.number, quote.text])).toEqual([[3, "c"]]);
  });
});

describe("footnotesFor", () => {
  const kept = keptQuotes([page("w1", "kept", ["a", "b"]), page("w2", "kept", ["c"])]);

  it("numbers the quote footnotes in the order the text cites them, and leaves the user's own footnotes", () => {
    const result = footnotesFor("First.[^q3] Then.[^q1] Mine.[^1]", kept);
    expect(result.text).toBe("First.[^q1] Then.[^q2] Mine.[^1]");
    expect(result.quotes.map((quote) => quote.text)).toEqual(["c", "a", "b"]);
    expect(result.missing).toEqual([]);
  });

  it("names a cited quote that is no longer kept", () => {
    expect(footnotesFor("Gone.[^q9] Mine.[^9]", kept).missing).toEqual([9]);
  });
});

describe("insertMarker", () => {
  it("sets the marker against the word before the cursor and keeps the space after it", () => {
    expect(insertMarker("It works. Next", 10, 2)).toEqual({
      text: "It works.[^q2] Next",
      caret: 15,
    });
  });
});

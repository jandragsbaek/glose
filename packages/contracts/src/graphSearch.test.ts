import { assert, describe, it } from "@effect/vitest";

import type { GraphNode } from "./graph.ts";
import { searchNodes } from "./graphSearch.ts";

const note = (title: string, body = ""): GraphNode => ({
  id: title,
  kind: "note",
  title,
  sourceId: null,
  body,
  aiText: false,
  aiTitle: false,
  page: null,
  growth: "seed",
  created: null,
  updated: null,
  tended: null,
  properties: [],
});

const found = (nodes: ReadonlyArray<GraphNode>, query: string) =>
  searchNodes(nodes, query).map((hit) => hit.node.id);

const filler = Array.from({ length: 8 }, (_, index) =>
  note(`Filler ${index}`, "The work of the day takes time and work."),
);

describe("searchNodes", () => {
  it("ranks a Note with the query's rare word above Notes that share only common words", () => {
    const nodes = [...filler, note("Flow needs clear goals", "Work at the edge of skill.")];
    assert.strictEqual(found(nodes, "work flow")[0], "Flow needs clear goals");
  });

  it("puts a Note with the words in its title above one with them only in its text", () => {
    const nodes = [
      note("Shallow tasks fill the day", "Deep work is rare."),
      note("Deep work is rare and valuable", "It takes long hours."),
    ];
    assert.deepStrictEqual(found(nodes, "deep work"), [
      "Deep work is rare and valuable",
      "Shallow tasks fill the day",
    ]);
  });

  it("matches whole words, so a short word inside a longer one does not count", () => {
    const nodes = [note("Starting is the hardest part"), note("Art needs time")];
    assert.deepStrictEqual(found(nodes, "art"), ["Art needs time"]);
  });

  it("finds other forms of an English or a Danish word", () => {
    const nodes = [
      note("Habits compound over time"),
      note("Vanerne former dagen"),
      note("Studying spaced out beats cramming"),
    ];
    assert.deepStrictEqual(found(nodes, "habit"), ["Habits compound over time"]);
    assert.deepStrictEqual(found(nodes, "vane"), ["Vanerne former dagen"]);
    assert.deepStrictEqual(found(nodes, "studies"), ["Studying spaced out beats cramming"]);
  });

  it("finds a Danish word inside a compound, below a Note with the word itself", () => {
    const nodes = [
      note("Arbejdshukommelse, korttidshukommelse, langtidshukommelse og billedhukommelse"),
      note("Hukommelse styrkes af genkaldelse"),
    ];
    assert.deepStrictEqual(found(nodes, "hukommelse"), [
      "Hukommelse styrkes af genkaldelse",
      "Arbejdshukommelse, korttidshukommelse, langtidshukommelse og billedhukommelse",
    ]);
  });

  it("finds nothing for common words alone, and gives the matched words of the text", () => {
    const nodes = [note("Attention residue", "Attention lingers on the last task.")];
    assert.deepStrictEqual(found(nodes, "the and of det og"), []);
    assert.deepStrictEqual(
      searchNodes(nodes, "lingering").map((hit) => hit.matchedBodyWords),
      [["lingers"]],
    );
  });
});

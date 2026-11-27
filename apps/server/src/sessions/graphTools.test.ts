import type { GraphNode } from "@glose/contracts";
import { assert, describe, it } from "@effect/vitest";

import { MAX_LINKED_FROM, readNote, searchGraph } from "./graphTools.ts";

const note = (title: string, body: string, updated: string | null = null): GraphNode => ({
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
  updated,
  tended: null,
  properties: [],
});

describe("searchGraph", () => {
  it("shows the snippet around the matched word, not around the same letters in another word", () => {
    const body = `Starting is hard. ${"A long day of work. ".repeat(20)}Art needs time.`;
    const [match] = searchGraph([note("On craft", body)], "art");
    assert.include(match?.snippet, "Art needs time.");
  });

  it("shows the snippet around the matched word, not around an AI mark", () => {
    const body = `> [!ai-part] Habits\n> ${"A long day of work. ".repeat(20)}\n\nThe hard part is starting.`;
    const [match] = searchGraph([note("On starting", body)], "part");
    assert.include(match?.snippet, "The hard part is starting.");
  });
});

describe("readNote", () => {
  it("gives a few of many back-links, the ones it links back to first, then the newest, and the count", () => {
    const linking = Array.from({ length: 40 }, (_, index) =>
      note(`Note ${index}`, "[[Hub]]", `2026-01-${String(index + 1).padStart(2, "0")}`),
    );
    const view = {
      nodes: [note("Hub", "[[Note 3]]"), ...linking],
      links: [
        { from: "Hub", to: "Note 3" },
        ...linking.map((other) => ({ from: other.id, to: "Hub" })),
      ],
    };
    const read = readNote(view, "hub");
    assert.deepStrictEqual("linkedFrom" in read && read.linkedFrom.slice(0, 3), [
      "Note 3",
      "Note 39",
      "Note 38",
    ]);
    assert.strictEqual("linkedFrom" in read && read.linkedFrom.length, MAX_LINKED_FROM);
    assert.strictEqual("linkedFromTotal" in read && read.linkedFromTotal, 40);
  });
});

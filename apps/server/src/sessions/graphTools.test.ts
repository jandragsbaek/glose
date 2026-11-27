import type { GraphNode } from "@glose/contracts";
import { assert, describe, it } from "@effect/vitest";

import { searchGraph } from "./graphTools.ts";

const note = (title: string, body: string): GraphNode => ({
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

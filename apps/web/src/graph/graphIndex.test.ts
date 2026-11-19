import type { GraphNode } from "@glose/contracts";
import { assert, describe, it } from "@effect/vitest";

import { holdsAiText, narrowToAiText, toTend } from "./graphIndex.ts";

const node = (fields: Partial<GraphNode>): GraphNode => ({
  id: "N",
  kind: "note",
  title: "N",
  sourceId: null,
  body: "",
  aiText: false,
  aiTitle: false,
  page: null,
  growth: "seed",
  created: null,
  updated: null,
  tended: null,
  properties: [],
  ...fields,
});

describe("holdsAiText", () => {
  it("marks a Note with AI text or only an AI title, and never a Source", () => {
    assert.isTrue(holdsAiText(node({ aiText: true })));
    assert.isTrue(holdsAiText(node({ aiTitle: true })));
    assert.isFalse(holdsAiText(node({})));
    assert.isFalse(holdsAiText(node({ kind: "source", aiText: true })));
  });
});

describe("narrowToAiText", () => {
  const ai = node({ id: "AI", aiText: true });
  const own = node({ id: "Own" });

  it("leaves Find as it is while the AI key is off", () => {
    assert.isNull(narrowToAiText(null, [ai], false));
    assert.deepStrictEqual(narrowToAiText([ai, own], [ai], false), [ai, own]);
  });

  it("shows the Notes with AI text, and only those Find found when it has a query", () => {
    assert.deepStrictEqual(narrowToAiText(null, [ai], true), [ai]);
    assert.deepStrictEqual(narrowToAiText([ai, own], [ai], true), [ai]);
    assert.deepStrictEqual(narrowToAiText([own], [ai], true), []);
  });
});

describe("toTend", () => {
  it("lists Notes in the user's words, never tended first, then the one tended longest ago", () => {
    const view = {
      nodes: [
        node({ id: "Recent", tended: "2026-11-18" }),
        node({ id: "AI", aiText: true }),
        node({ id: "Source", kind: "source" }),
        node({ id: "Old", tended: "2026-01-02" }),
        node({ id: "Never" }),
      ],
      links: [],
    };
    assert.deepStrictEqual(
      toTend(view).map((found) => found.id),
      ["Never", "Old", "Recent"],
    );
  });
});

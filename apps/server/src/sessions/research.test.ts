import { assert, describe, it } from "@effect/vitest";

import { addressesOf, trimAddress } from "./research.ts";

describe("addresses the user writes", () => {
  it("keeps a closing bracket that belongs to the address, and drops end punctuation", () => {
    assert.strictEqual(
      trimAddress("https://en.wikipedia.org/wiki/Mercury_(planet)"),
      "https://en.wikipedia.org/wiki/Mercury_(planet)",
    );
    assert.deepStrictEqual(
      addressesOf({
        type: "message",
        role: "user",
        content: "Read https://a.example/x_(y). Also (see https://b.example/z), please.",
      }),
      ["https://a.example/x_(y)", "https://b.example/z"],
    );
  });

  it("takes no address from what the AI wrote", () => {
    assert.deepStrictEqual(
      addressesOf({ type: "message", role: "assistant", content: "https://evil.example/?q=x" }),
      [],
    );
    assert.deepStrictEqual(
      addressesOf({
        type: "web_search_call",
        action: { type: "search", query: "https://evil.example/?q=x", sources: [] },
      }),
      [],
    );
  });
});

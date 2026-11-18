import { assert, describe, it } from "@effect/vitest";

import { EMPTY_ARTICLE, fillFromFile } from "./articleForm.ts";

describe("fillFromFile", () => {
  it("replaces only what an earlier file filled, keeps typed values and clears stale ones", () => {
    const first = fillFromFile({ ...EMPTY_ARTICLE, givenName: "Mira (typed)" }, [], {
      familyName: "Holt",
      givenName: "Mira",
      container: "Example Review",
    });
    const second = fillFromFile(first.values, first.filled, { familyName: "Berg" });

    assert.deepStrictEqual(first.filled, ["familyName", "container"]);
    assert.strictEqual(second.values.familyName, "Berg");
    assert.strictEqual(second.values.givenName, "Mira (typed)");
    assert.strictEqual(second.values.container, "");
    assert.deepStrictEqual(second.filled, ["familyName"]);
  });
});

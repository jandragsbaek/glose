import { assert, describe, it } from "@effect/vitest";

import { dayOf, growthOf, nextGrowth } from "./growth.ts";

const own = { aiText: false, linkedNotes: 0, tended: null };

describe("nextGrowth", () => {
  it("keeps a Note with AI text a Seed, however linked or tended", () => {
    assert.isNull(nextGrowth("seed", { aiText: true, linkedNotes: 9, tended: "2026-11-19" }));
  });

  it("suggests Sprout for own words, Sapling at three linked Notes, Tree once tended", () => {
    assert.strictEqual(nextGrowth("seed", own), "sprout");
    assert.strictEqual(nextGrowth("seed", { ...own, linkedNotes: 3 }), "sapling");
    assert.strictEqual(
      nextGrowth("sapling", { ...own, linkedNotes: 3, tended: "2026-11-19" }),
      "tree",
    );
  });

  it("never suggests a step down: only the user sets Growth", () => {
    assert.isNull(nextGrowth("tree", own));
    assert.isNull(nextGrowth("sapling", { ...own, linkedNotes: 3 }));
  });
});

describe("growthOf and dayOf", () => {
  it("read a missing or unknown Growth as a Seed", () => {
    assert.strictEqual(growthOf(undefined), "seed");
    assert.strictEqual(growthOf("evergreen"), "seed");
    assert.strictEqual(growthOf("tree"), "tree");
  });

  it("read a day, a time on a day, or nothing", () => {
    assert.strictEqual(dayOf("2026-11-19"), "2026-11-19");
    assert.strictEqual(dayOf("2026-11-19T08:30"), "2026-11-19");
    assert.isNull(dayOf("someday"));
    assert.isNull(dayOf(20261119));
  });
});

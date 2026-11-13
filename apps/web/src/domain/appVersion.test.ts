import { assert, describe, it } from "@effect/vitest";

import { nightlyOf } from "./appVersion.ts";

describe("nightlyOf", () => {
  it("reads the build day and run from a nightly's version", () => {
    const nightly = nightlyOf("0.1.0-nightly.20261113.42");
    assert.isNotNull(nightly);
    assert.deepStrictEqual(
      [nightly?.built.getFullYear(), nightly?.built.getMonth(), nightly?.built.getDate()],
      [2026, 10, 13],
    );
    assert.strictEqual(nightly?.run, 42);
  });

  it("returns null for any other version", () => {
    assert.isNull(nightlyOf("0.1.0"));
  });
});

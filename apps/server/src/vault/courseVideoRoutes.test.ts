import { assert, describe, it } from "@effect/vitest";

import { byteRange } from "./courseVideoRoutes.ts";

describe("byteRange", () => {
  it("reads the byte ranges a video player asks for", () => {
    assert.strictEqual(byteRange(undefined, 1000), null);
    assert.deepStrictEqual(byteRange("bytes=0-", 1000), { start: 0, end: 999 });
    assert.deepStrictEqual(byteRange("bytes=100-199", 1000), { start: 100, end: 199 });
    assert.deepStrictEqual(byteRange("bytes=900-5000", 1000), { start: 900, end: 999 });
    assert.deepStrictEqual(byteRange("bytes=-100", 1000), { start: 900, end: 999 });
  });

  it("refuses a range outside the file", () => {
    assert.strictEqual(byteRange("bytes=1000-", 1000), "bad");
    assert.strictEqual(byteRange("bytes=5-2", 1000), "bad");
    assert.strictEqual(byteRange("items=0-1", 1000), "bad");
    assert.strictEqual(byteRange("bytes=-", 1000), "bad");
  });
});

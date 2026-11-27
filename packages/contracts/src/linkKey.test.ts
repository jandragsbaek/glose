import { assert, describe, it } from "@effect/vitest";

import { fileNameKey, sameFileName } from "./fileName.ts";
import { linkKey } from "./graph.ts";

const rootLocale = (name: string) => name.normalize("NFC").toLocaleLowerCase("und");

describe("linkKey and fileNameKey", () => {
  it("fold case as the root locale does, for every code point", () => {
    const differ: Array<string> = [];
    for (let point = 0; point <= 0x10ffff; point++) {
      if (point >= 0xd800 && point <= 0xdfff) continue;
      const char = String.fromCodePoint(point);
      for (const name of [char, `A${char}`, `A${char}b`]) {
        const expected = rootLocale(name);
        if (linkKey(name) !== expected || fileNameKey(name) !== expected) {
          differ.push(point.toString(16));
        }
      }
    }
    assert.deepStrictEqual(differ, []);
  });

  it("keep the final sigma, Turkish dotted I and composed forms as before", () => {
    for (const name of ["ΟΔΟΣ", "ΟΔΟΣ ΚΑΙ", "İstanbul", "Café", "ǅemal", "ẞtraße"]) {
      assert.strictEqual(linkKey(name), rootLocale(name));
    }
    assert.isTrue(sameFileName("Café.md", "CAFÉ.MD"));
    assert.isFalse(sameFileName("Cafe.md", "Café.md"));
  });
});

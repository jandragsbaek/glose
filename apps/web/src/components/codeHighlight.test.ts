import { assert, describe, it } from "@effect/vitest";

import { highlightCode } from "./codeHighlight.ts";

const roles = (lines: Awaited<ReturnType<typeof highlightCode>>) =>
  (lines ?? []).flatMap((line) =>
    line.tokens
      .filter((token) => token.role !== null)
      .map((token) => [token.text.trim(), token.role]),
  );

describe("highlightCode", () => {
  it("gives Python's keywords, names, strings, numbers and comments their roles", async () => {
    const lines = await highlightCode(
      ["@cache", "def fib(n: int) -> int:", '    """Doc."""', "    return n + 1  # one"].join("\n"),
      "py",
    );
    assert.strictEqual(lines?.length, 4);
    const found = roles(lines);
    for (const pair of [
      ["def", "keyword"],
      ["fib", "function"],
      ["int", "type"],
      ["return", "keyword"],
      ["1", "number"],
      ["# one", "comment"],
    ]) {
      assert.deepInclude(found, pair);
    }
    assert.isTrue(found.some(([text, role]) => text === "@cache" && role === "decorator"));
    assert.isTrue(found.some(([text, role]) => text?.includes("Doc.") && role === "string"));
  });

  it("keeps the code exactly, line by line", async () => {
    const code = "const a = { b: `c${d}` };\n\n// e";
    const lines = await highlightCode(code, "TypeScript");
    assert.strictEqual(
      lines?.map((line) => line.tokens.map((token) => token.text).join("")).join("\n"),
      code,
    );
  });

  it("has no tokens for a language without a grammar", async () => {
    assert.isNull(await highlightCode("x", "not-a-language"));
    assert.isNull(await highlightCode("x", ""));
  });
});

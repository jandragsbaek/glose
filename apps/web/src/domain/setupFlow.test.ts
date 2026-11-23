import { assert, describe, it } from "@effect/vitest";

import { setupFlow } from "./setupFlow.ts";

describe("setupFlow", () => {
  it("takes a new or empty Vault through the Sections and the first book", () => {
    assert.deepStrictEqual(setupFlow(0), ["look", "vault", "sections", "chatgpt", "book"]);
  });

  it("takes a Vault that holds Sources from the Vault to ChatGPT, then out", () => {
    assert.deepStrictEqual(setupFlow(13), ["look", "vault", "chatgpt"]);
  });
});

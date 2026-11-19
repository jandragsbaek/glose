import { assert, describe, it } from "@effect/vitest";

import { keepOtherFields } from "./frontmatter.ts";

const OWNED = new Set(["glose", "title"]);
const today = "2026-11-19";

describe("keepOtherFields", () => {
  it("gives a new file created and updated", () => {
    assert.strictEqual(
      keepOtherFields(null, "---\nglose: x\ntitle: T\n---\n\nText\n", OWNED, {
        today,
        created: true,
      }),
      "---\nglose: x\ntitle: T\ncreated: 2026-11-19\nupdated: 2026-11-19\n---\n\nText\n",
    );
  });

  it("keeps created and the user's fields, drops a field Glose owns and left out", () => {
    const previous =
      "---\nglose: x\ntitle: Old\naliases: [A]\ncreated: 2025-01-02\nupdated: 2025-01-02\n---\n";
    assert.strictEqual(
      keepOtherFields(previous, "---\nglose: x\n---\n", OWNED, { today, created: true }),
      "---\nglose: x\ncreated: 2025-01-02\nupdated: 2026-11-19\naliases: [ A ]\n---\n",
    );
  });

  it("does not invent created for a file written before Glose kept dates", () => {
    assert.strictEqual(
      keepOtherFields("---\nglose: x\n---\n", "---\nglose: x\n---\n", OWNED, {
        today,
        created: true,
      }),
      "---\nglose: x\nupdated: 2026-11-19\n---\n",
    );
  });
});

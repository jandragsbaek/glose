import { assert, describe, it } from "@effect/vitest";

import { relinkWikilinks } from "./relink.ts";

describe("relinkWikilinks", () => {
  it("renames every form of wikilink Obsidian writes, and only links to that file", () => {
    const markdown = [
      "[[Old]] and [[old|shown words]] and [[Old#A heading|there]].",
      "![[Old]] and [[Notes/Old.md^block]] but not [[Older]] or [[Other|Old]].",
    ].join("\n");

    assert.strictEqual(
      relinkWikilinks(markdown, "Old", "New name"),
      [
        "[[New name]] and [[New name|shown words]] and [[New name#A heading|there]].",
        "![[New name]] and [[Notes/New name.md^block]] but not [[Older]] or [[Other|Old]].",
      ].join("\n"),
    );
  });

  it("leaves wikilinks inside code as written", () => {
    const markdown = "`[[Old]]`\n\n```\n[[Old]]\n```\n\n[[Old]]";

    assert.strictEqual(
      relinkWikilinks(markdown, "Old", "New"),
      "`[[Old]]`\n\n```\n[[Old]]\n```\n\n[[New]]",
    );
  });
});

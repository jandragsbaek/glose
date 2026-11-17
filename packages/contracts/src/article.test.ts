import { assert, describe, it } from "@effect/vitest";

import { parseArticle } from "./article.ts";
import { findInArticle, markPassage, removePassage, setPassageWords } from "./articleEdit.ts";
import { articleBody } from "./articleInline.ts";

const LESSON = `---
title: Retrieval before generation
author: Anna Lindqvist
---

# Retrieval before generation

A language model answers from what it learned in training.

## Chunking decides what can be found

Documents are split into **chunks** before they are embedded. A chunk that is too small loses
the context that makes it meaningful.

- Split on headings first.
- Then by length, with [overlap](https://example.com/overlap).
  It keeps a sentence findable.

> A quoted paragraph.
>
> And a second one.

\`\`\`python
chunks = split(doc)
\`\`\`

| Size | Use |
| --- | --- |
| small | facts |
`;

const passageText = (markdown: string, id: string) =>
  parseArticle(markdown).passages.find((passage) => passage.id === id);

describe("parseArticle", () => {
  it("numbers paragraphs, list items and quoted paragraphs, not headings or code", () => {
    const article = parseArticle(LESSON);
    assert.deepStrictEqual(
      article.units.map((unit) => unit.plain),
      [
        "A language model answers from what it learned in training.",
        "Documents are split into chunks before they are embedded. A chunk that is too small loses\nthe context that makes it meaningful.",
        "Split on headings first.",
        "Then by length, with overlap.\nIt keeps a sentence findable.",
        "A quoted paragraph.",
        "And a second one.",
      ],
    );
    assert.deepStrictEqual(
      article.blocks.map((block) => block.kind),
      ["heading", "paragraph", "heading", "paragraph", "list", "quote", "code", "table"],
    );
    assert.deepStrictEqual(
      article.sections.map(({ title, first, last }) => ({ title, first, last })),
      [
        { title: "Retrieval before generation", first: 1, last: 1 },
        { title: "Chunking decides what can be found", first: 2, last: 6 },
      ],
    );
  });

  it("drops the frontmatter from the body", () => {
    assert.isTrue(articleBody(LESSON).startsWith("# Retrieval"));
  });
});

describe("Passages", () => {
  it("marks words in a paragraph and keeps the rest of the file", () => {
    const plain = parseArticle(LESSON).units[1]!.plain;
    const start = plain.indexOf("A chunk");
    const edit = markPassage(LESSON, 2, start, start + "A chunk that is too small".length);
    assert.strictEqual(edit._tag, "Edited");
    if (edit._tag !== "Edited") return;
    assert.include(edit.markdown, "embedded. ==A chunk that is too small== loses");
    assert.strictEqual(edit.passage, "2.1");
    assert.strictEqual(passageText(edit.markdown, "2.1")?.text, "A chunk that is too small");
  });

  it("marks a formatted word whole and maps across lines", () => {
    const plain = parseArticle(LESSON).units[1]!.plain;
    const start = plain.indexOf("hunks");
    const end = plain.indexOf("context") + "context".length;
    const edit = markPassage(LESSON, 2, start, end);
    assert.strictEqual(edit._tag, "Edited");
    if (edit._tag !== "Edited") return;
    assert.include(edit.markdown, "into ==**chunks** before");
    assert.include(edit.markdown, "loses\nthe context== that");
  });

  it("marks inside a list item and a quote", () => {
    const item = markPassage(LESSON, 3, 0, "Split on headings".length);
    assert.strictEqual(item._tag, "Edited");
    if (item._tag === "Edited") assert.include(item.markdown, "- ==Split on headings== first.");
    const quote = markPassage(LESSON, 6, 4, 12);
    assert.strictEqual(quote._tag, "Edited");
    if (quote._tag === "Edited") assert.include(quote.markdown, "> And ==a second== one.");
  });

  it("widens a selection that cuts a word to the whole word", () => {
    const edit = markPassage(LESSON, 1, 4, 13);
    assert.strictEqual(edit._tag, "Edited");
    if (edit._tag === "Edited") assert.include(edit.markdown, "A ==language model== answers");
  });

  it("maps a selection in a paragraph with quote marks to the same words", () => {
    const text =
      'A note titled "Memory" holds nothing you can argue with. A note titled "Recall" holds a claim.\n';
    const plain = parseArticle(text).units[0]!.plain;
    const start = plain.indexOf('"Memory"');
    const end = plain.indexOf("with.") + "with.".length;
    const edit = markPassage(text, 1, start, end);
    assert.strictEqual(edit._tag, "Edited");
    if (edit._tag === "Edited") {
      assert.include(edit.markdown, 'titled =="Memory" holds nothing you can argue with.== A note');
    }
  });

  it("refuses an overlap and an empty stretch", () => {
    const first = markPassage(LESSON, 1, 0, 10);
    assert.strictEqual(first._tag, "Edited");
    if (first._tag !== "Edited") return;
    assert.deepStrictEqual(markPassage(first.markdown, 1, 5, 20), {
      _tag: "Refused",
      reason: "overlap",
    });
    assert.deepStrictEqual(markPassage(LESSON, 1, 3, 3), { _tag: "Refused", reason: "empty" });
  });

  it("keeps the user's words as a footnote and removes both on unmark", () => {
    const marked = markPassage(LESSON, 1, 2, 16);
    if (marked._tag !== "Edited") return assert.fail("not marked");
    const worded = setPassageWords(marked.markdown, "1.1", "Like notes:\none idea each.");
    if (worded._tag !== "Edited") return assert.fail("no words");
    assert.include(worded.markdown, "==language model==[^glose-1]");
    assert.include(worded.markdown, "[^glose-1]: Like notes:\n    one idea each.\n");
    assert.strictEqual(passageText(worded.markdown, "1.1")?.words, "Like notes:\none idea each.");

    const changed = setPassageWords(worded.markdown, "1.1", "Shorter.");
    if (changed._tag !== "Edited") return assert.fail("not changed");
    assert.strictEqual(passageText(changed.markdown, "1.1")?.words, "Shorter.");
    assert.notInclude(changed.markdown, "one idea each");

    const removed = removePassage(changed.markdown, "1.1");
    if (removed._tag !== "Edited") return assert.fail("not removed");
    assert.strictEqual(removed.markdown, LESSON);
  });

  it("finds a quote in the text and gives its paragraph", () => {
    const article = parseArticle(LESSON);
    assert.deepStrictEqual(findInArticle(article, "“a chunk that is too  small loses the”"), {
      n: 2,
      text: "A chunk that is too small loses\nthe",
    });
    assert.isNull(findInArticle(article, "not in the text"));
  });
});

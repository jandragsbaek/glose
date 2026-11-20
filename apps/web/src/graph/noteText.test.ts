import { assert, describe, it } from "@effect/vitest";

import { parseNoteText } from "./noteText.ts";

const withoutOffsets = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (key, field: unknown) => (key === "at" ? undefined : field)));

describe("parseNoteText", () => {
  it("shows research footnotes as numbers, each definition its own paragraph", () => {
    const blocks = parseNoteText(
      "It works.[^q1]\n\n[^q1]: “Words” [[Web 2024 A page]], ¶ 2\n\n[^q2]: “More words” [[Web 2024 A page]], ¶ 5",
    );
    const kinds = blocks.map((block) =>
      block.kind === "paragraph" ? block.inlines.map((part) => part.kind) : [],
    );
    assert.deepStrictEqual(kinds, [
      ["text", "note"],
      ["note", "text", "link", "text"],
      ["note", "text", "link", "text"],
    ]);
  });

  it("keeps a colon after a marker in the text, and markers in code or escaped as written", () => {
    const [block] = parseNoteText("The finding matters[^q1]: it holds. `[^q2]` and \\[^q3].");
    const parts = block?.kind === "paragraph" ? block.inlines : [];
    assert.deepStrictEqual(
      parts.map((part) => (part.kind === "text" || part.kind === "code" ? part.text : part.kind)),
      ["The finding matters", "note", ": it holds. ", "[^q2]", " and \\[^q3]."],
    );
    const [item, heading, code] = parseNoteText(
      "- [^q1]: a list item\n\n## [^q1]: A heading\n\nSee ``[^q1]`` here.",
    );
    const texts = (block: typeof item) =>
      block?.kind === "list"
        ? block.items[0]!.inlines
        : block?.kind === "heading" || block?.kind === "paragraph"
          ? block.inlines
          : [];
    assert.include(JSON.stringify(texts(item)), ": a list item");
    assert.include(JSON.stringify(texts(heading)), ": A heading");
    assert.deepStrictEqual(
      texts(code).map((part) => part.kind),
      ["text", "code", "text"],
    );
  });

  it("splits paragraphs and lists, and keeps wikilinks with the words they show", () => {
    assert.deepStrictEqual(
      withoutOffsets(
        parseNoteText(
          [
            "Arendt names three activities,",
            "see [[Labor answers to necessity|labor]].",
            "",
            "- [[Work builds a durable world of things]]",
            "- action",
            "",
          ].join("\n"),
        ),
      ),
      [
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "Arendt names three activities, see " },
            { kind: "link", target: "Labor answers to necessity", label: "labor" },
            { kind: "text", text: "." },
          ],
        },
        {
          kind: "list",
          items: [
            {
              inlines: [
                {
                  kind: "link",
                  target: "Work builds a durable world of things",
                  label: "Work builds a durable world of things",
                },
              ],
            },
            { inlines: [{ kind: "text", text: "action" }] },
          ],
        },
      ],
    );
  });

  it("keeps a wikilink inside code as text, since it is not a Link", () => {
    assert.deepStrictEqual(
      withoutOffsets(
        parseNoteText(
          [
            "Write `[[Natality]]` for a Link.",
            "",
            "```",
            "[[Natality]]",
            "",
            "[[Natality]]",
            "```",
            "See [[Plurality]].",
          ].join("\n"),
        ),
      ),
      [
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "Write " },
            { kind: "code", text: "[[Natality]]" },
            { kind: "text", text: " for a Link." },
          ],
        },
        { kind: "code", lang: "", text: "[[Natality]]\n\n[[Natality]]" },
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "See " },
            { kind: "link", target: "Plurality", label: "Plurality" },
            { kind: "text", text: "." },
          ],
        },
      ],
    );
  });

  it("reads an AI callout as AI paragraphs, also right under a paragraph and with a title", () => {
    assert.deepStrictEqual(
      withoutOffsets(
        parseNoteText(
          [
            "Mine.",
            "> [!ai] Action",
            "> needs [[Plurality]].",
            ">",
            "> - one",
            "lazy line",
            "",
            "> A plain quote.",
          ].join("\n"),
        ),
      ),
      [
        { kind: "paragraph", inlines: [{ kind: "text", text: "Mine." }] },
        {
          kind: "ai",
          scope: "paragraphs",
          heading: null,
          blocks: [
            { kind: "paragraph", inlines: [{ kind: "text", text: "Action" }] },
            {
              kind: "paragraph",
              inlines: [
                { kind: "text", text: "needs " },
                { kind: "link", target: "Plurality", label: "Plurality" },
                { kind: "text", text: "." },
              ],
            },
            { kind: "paragraph", inlines: [{ kind: "text", text: "- one lazy line" }] },
          ],
        },
        { kind: "paragraph", inlines: [{ kind: "text", text: "> A plain quote." }] },
      ],
    );
  });

  it("reads an AI Part with the heading above it, and leaves other headings to the user", () => {
    assert.deepStrictEqual(
      withoutOffsets(
        parseNoteText(
          [
            "## Early life ##",
            "> [!AI-PART]",
            "> Grew up.",
            "",
            "## The farm",
            "Mine, and a #tag.",
          ].join("\n"),
        ),
      ),
      [
        {
          kind: "ai",
          scope: "part",
          heading: {
            kind: "heading",
            level: 2,
            inlines: [{ kind: "text", text: "Early life" }],
          },
          blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Grew up." }] }],
        },
        { kind: "heading", level: 2, inlines: [{ kind: "text", text: "The farm" }] },
        { kind: "paragraph", inlines: [{ kind: "text", text: "Mine, and a #tag." }] },
      ],
    );
  });

  it("reads a Note marked as a whole as one AI Note, unless it marks paragraphs or a Part", () => {
    assert.deepStrictEqual(withoutOffsets(parseNoteText("First.\n\nSecond.", true)), [
      {
        kind: "ai",
        scope: "note",
        heading: null,
        blocks: [
          { kind: "paragraph", inlines: [{ kind: "text", text: "First." }] },
          { kind: "paragraph", inlines: [{ kind: "text", text: "Second." }] },
        ],
      },
    ]);
    assert.deepStrictEqual(withoutOffsets(parseNoteText("Mine.\n\n> [!ai]\n> Not.", true)), [
      { kind: "paragraph", inlines: [{ kind: "text", text: "Mine." }] },
      {
        kind: "ai",
        scope: "paragraphs",
        heading: null,
        blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Not." }] }],
      },
    ]);
  });

  it("ends an AI Part at the next heading, so the user's Part after it stays unmarked", () => {
    assert.deepStrictEqual(
      withoutOffsets(
        parseNoteText(["## AI", "> [!ai-part]", "> AI prose.", "## Human", "Mine."].join("\n")),
      ),
      [
        {
          kind: "ai",
          scope: "part",
          heading: { kind: "heading", level: 2, inlines: [{ kind: "text", text: "AI" }] },
          blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "AI prose." }] }],
        },
        { kind: "heading", level: 2, inlines: [{ kind: "text", text: "Human" }] },
        { kind: "paragraph", inlines: [{ kind: "text", text: "Mine." }] },
      ],
    );
  });

  it("reads no AI mark or heading inside fenced code, and reads one after it", () => {
    const lines = ["Example:", "```", "> [!ai]", "# not a heading", "```", "> [!ai]", "> Real."];
    assert.deepStrictEqual(
      withoutOffsets(parseNoteText(lines.join("\r\n"))),
      withoutOffsets(parseNoteText(lines.join("\n"))),
    );
    assert.deepStrictEqual(withoutOffsets(parseNoteText(lines.join("\n"))), [
      { kind: "paragraph", inlines: [{ kind: "text", text: "Example:" }] },
      { kind: "code", lang: "", text: "> [!ai]\n# not a heading" },
      {
        kind: "ai",
        scope: "paragraphs",
        heading: null,
        blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Real." }] }],
      },
    ]);
  });

  it("reads fenced code with its language, as written, with blank lines and indent kept", () => {
    const markdown = [
      "Memoise it:",
      "```Python title=fib.py",
      "@cache",
      "def fib(n):",
      "",
      "    return n  # [[Not a Link]]",
      "```",
      "~~~",
      "```",
      "~~~",
      "Done.",
    ].join("\r\n");
    const blocks = parseNoteText(markdown);
    assert.deepStrictEqual(withoutOffsets(blocks), [
      { kind: "paragraph", inlines: [{ kind: "text", text: "Memoise it:" }] },
      {
        kind: "code",
        lang: "python",
        text: "@cache\ndef fib(n):\n\n    return n  # [[Not a Link]]",
      },
      { kind: "code", lang: "", text: "```" },
      { kind: "paragraph", inlines: [{ kind: "text", text: "Done." }] },
    ]);
    assert.strictEqual(blocks[1]?.at, markdown.indexOf("```Python"));
  });

  it("runs an unclosed fence to the end, and needs a closing fence as long as the opening", () => {
    assert.deepStrictEqual(withoutOffsets(parseNoteText("````js\na()\n```\nb()")), [
      { kind: "code", lang: "js", text: "a()\n```\nb()" },
    ]);
  });

  it("reads a code span by matching backtick runs, and keeps a lone backtick as text", () => {
    const [block] = parseNoteText("Use `` a`b `` or ` `x` ` and a stray ` tick.");
    assert.deepStrictEqual(withoutOffsets(block), {
      kind: "paragraph",
      inlines: [
        { kind: "text", text: "Use " },
        { kind: "code", text: "a`b" },
        { kind: "text", text: " or " },
        { kind: "code", text: " " },
        { kind: "text", text: "x" },
        { kind: "code", text: " " },
        { kind: "text", text: " and a stray ` tick." },
      ],
    });
  });

  it("reads fenced code inside an AI callout as code in the AI text", () => {
    const [block] = parseNoteText(["> [!ai]", "> ```ts", "> const a = 1;", "> ```"].join("\n"));
    assert.deepStrictEqual(withoutOffsets(block), {
      kind: "ai",
      scope: "paragraphs",
      heading: null,
      blocks: [{ kind: "code", lang: "ts", text: "const a = 1;" }],
    });
  });

  it("keeps a Link whole when its words hold code, and a Link inside code as text", () => {
    const [block] = parseNoteText("See [[Cache|`load()`]] and `[[Cache]]`.");
    assert.deepStrictEqual(withoutOffsets(block), {
      kind: "paragraph",
      inlines: [
        { kind: "text", text: "See " },
        { kind: "link", target: "Cache", label: "`load()`" },
        { kind: "text", text: " and " },
        { kind: "code", text: "[[Cache]]" },
        { kind: "text", text: "." },
      ],
    });
  });
});

import { assert, describe, it } from "@effect/vitest";

import { parseNoteText } from "./noteText.ts";

/** Offsets only key the rendered parts; the test reads the structure without them. */
const withoutOffsets = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (key, field: unknown) => (key === "at" ? undefined : field)));

describe("parseNoteText", () => {
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
          inlines: [{ kind: "text", text: "Write `[[Natality]]` for a Link." }],
        },
        { kind: "paragraph", inlines: [{ kind: "text", text: "```\n[[Natality]]" }] },
        { kind: "paragraph", inlines: [{ kind: "text", text: "[[Natality]]\n```" }] },
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
    // Windows line ends move every offset after them; the reading must not change.
    assert.deepStrictEqual(
      withoutOffsets(parseNoteText(lines.join("\r\n"))),
      withoutOffsets(parseNoteText(lines.join("\n"))),
    );
    assert.deepStrictEqual(withoutOffsets(parseNoteText(lines.join("\n"))), [
      {
        kind: "paragraph",
        inlines: [{ kind: "text", text: "Example: ``` > [!ai] # not a heading ```" }],
      },
      {
        kind: "ai",
        scope: "paragraphs",
        heading: null,
        blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Real." }] }],
      },
    ]);
  });
});

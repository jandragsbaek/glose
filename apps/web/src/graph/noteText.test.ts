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
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "[[Natality]]\n```" },
            { kind: "text", text: "\nSee " },
            { kind: "link", target: "Plurality", label: "Plurality" },
            { kind: "text", text: "." },
          ],
        },
      ],
    );
  });
});

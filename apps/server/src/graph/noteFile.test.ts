import { assert, describe, it } from "@effect/vitest";

import { buildGraphView } from "./graphView.ts";
import { renderNoteFile } from "./noteFile.ts";

const SOURCE = "Brown 2014 Make It Stick";

const read = (markdown: string) =>
  buildGraphView([{ name: "Spaced practice beats massed practice", markdown }]).nodes[0];

describe("renderNoteFile", () => {
  it("writes the user's words, the kept AI draft as marked paragraphs, and the Links", () => {
    const markdown = renderNoteFile({
      source: SOURCE,
      page: "47",
      text: "Cramming fades.\r\n\r\nSpacing lasts.",
      draft: "The AI's first.\n\nThe AI's second.",
      aiTitle: true,
      related: ["Desirable difficulties make learning stick", "Calibration"],
      language: "en",
    });

    assert.strictEqual(
      markdown,
      [
        "---",
        "glose: note",
        `source: "[[${SOURCE}]]"`,
        'page: "47"',
        "ai: true",
        "ai-title: true",
        "---",
        "",
        "Cramming fades.",
        "",
        "Spacing lasts.",
        "",
        "> [!ai]",
        "> The AI's first.",
        ">",
        "> The AI's second.",
        "",
        "Related: [[Desirable difficulties make learning stick]], [[Calibration]]",
        "",
      ].join("\n"),
    );
    // The Graph reads back what was written: the Source, the Location, both AI marks, the Links.
    const node = read(markdown);
    assert.strictEqual(node?.sourceId, null); // the Source file is not in this one-file Graph
    assert.strictEqual(node?.page, "47");
    assert.isTrue(node?.aiText);
    assert.isTrue(node?.aiTitle);
  });

  it("marks nothing when the user wrote the title and every word", () => {
    const markdown = renderNoteFile({
      source: SOURCE,
      page: null,
      text: "My own words.",
      draft: null,
      aiTitle: false,
      related: [],
      language: "da",
    });

    assert.strictEqual(
      markdown,
      ["---", "glose: note", `source: "[[${SOURCE}]]"`, "---", "", "My own words.", ""].join("\n"),
    );
    const node = read(markdown);
    assert.isFalse(node?.aiText);
    assert.isFalse(node?.aiTitle);
    assert.isNull(node?.page);
  });

  it("names the closing line in the interface language", () => {
    const markdown = renderNoteFile({
      source: SOURCE,
      page: null,
      text: "",
      draft: null,
      aiTitle: true,
      related: ["Hukommelse"],
      language: "da",
    });

    assert.include(markdown, "\nSe også: [[Hukommelse]]\n");
    assert.include(markdown, "ai: true\nai-title: true\n");
  });
});

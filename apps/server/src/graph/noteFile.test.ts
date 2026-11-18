import { assert, describe, it } from "@effect/vitest";

import { buildGraphView } from "./graphView.ts";
import { renderNoteFile } from "./noteFile.ts";

const SOURCE = "Brown 2014 Make It Stick";

const read = (markdown: string) =>
  buildGraphView([{ name: "Spaced practice beats massed practice", markdown }]).nodes[0];

describe("renderNoteFile", () => {
  it("quotes a time in a video, so a YAML 1.1 reader keeps it a time and not seconds", () => {
    const markdown = renderNoteFile({
      source: "Sinek 2009 Start with why",
      page: "4:10",
      text: "People buy why you do it.",
      draft: null,
      aiTitle: false,
      related: [],
      language: "en",
    });

    assert.include(markdown, 'page: "4:10"\n');
    assert.strictEqual(read(markdown)?.page, "4:10");
  });

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
    const node = read(markdown);
    assert.strictEqual(node?.sourceId, null);
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

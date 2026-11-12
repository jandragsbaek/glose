import { assert, describe, it } from "@effect/vitest";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { buildGraphView, type GraphFile } from "./graphView.ts";

const ARENDT = [
  "---",
  "glose: source",
  "author-family: Arendt",
  "title: The Human Condition",
  "first-published: 1958",
  "---",
  "",
  "Start at [[Natality]].",
].join("\n");

const note = (source: string, body: string) =>
  ["---", "glose: note", `source: "${source}"`, "---", "", body].join("\n");

describe("buildGraphView", () => {
  it("reads Sources, Notes and plain Markdown, and gives each Note its Source", () => {
    const view = buildGraphView([
      { name: "Arendt 1958 The Human Condition", markdown: ARENDT },
      { name: "Natality", markdown: note("[[Arendt 1958 The Human Condition]]", "Beginnings.") },
      { name: "Plurality", markdown: note("[[arendt 1958 the human condition]]", "Many.") },
      { name: "Inbox", markdown: "Written in another editor." },
    ]);

    assert.deepStrictEqual(view.nodes, [
      {
        id: "Arendt 1958 The Human Condition",
        kind: "source",
        title: "The Human Condition",
        sourceId: null,
        body: "Start at [[Natality]].",
        aiText: false,
        aiTitle: false,
        page: null,
      },
      {
        id: "Inbox",
        kind: "note",
        title: "Inbox",
        sourceId: null,
        body: "Written in another editor.",
        aiText: false,
        aiTitle: false,
        page: null,
      },
      {
        id: "Natality",
        kind: "note",
        title: "Natality",
        sourceId: "Arendt 1958 The Human Condition",
        body: "Beginnings.",
        aiText: false,
        aiTitle: false,
        page: null,
      },
      {
        id: "Plurality",
        kind: "note",
        title: "Plurality",
        sourceId: "Arendt 1958 The Human Condition",
        body: "Many.",
        aiText: false,
        aiTitle: false,
        page: null,
      },
    ]);
  });

  it("links the way Obsidian does: any case, aliases, headings, embeds and the source field", () => {
    const files: ReadonlyArray<GraphFile> = [
      { name: "Arendt 1958 The Human Condition", markdown: ARENDT },
      {
        name: "Natality",
        markdown: note(
          "[[Arendt 1958 The Human Condition]]",
          "See [[plurality|many people]], [[Plurality#Speech]] and ![[Speech]].",
        ),
      },
      { name: "Plurality", markdown: "Back to [[Natality]] and to [[Natality.md]]." },
      { name: "Speech", markdown: "No links." },
    ];

    assert.deepStrictEqual(buildGraphView(files).links, [
      { from: "Arendt 1958 The Human Condition", to: "Natality" },
      { from: "Natality", to: "Arendt 1958 The Human Condition" },
      { from: "Natality", to: "Plurality" },
      { from: "Natality", to: "Speech" },
      { from: "Plurality", to: "Natality" },
    ]);
  });

  it("makes no Link to a missing file, to itself, or from inside code", () => {
    const view = buildGraphView([
      {
        name: "Natality",
        markdown: [
          "[[Natality]] and [[Not written yet]].",
          "`[[Plurality]]`",
          "```",
          "[[Plurality]]",
          "```",
        ].join("\n"),
      },
      { name: "Plurality", markdown: "" },
    ]);

    assert.deepStrictEqual(view.links, []);
  });

  it("finds AI text by either AI mark, but not a callout inside code", () => {
    const aiText = (markdown: string) => buildGraphView([{ name: "N", markdown }]).nodes[0]?.aiText;

    assert.isTrue(aiText(["---", "glose: note", "ai: true", "---", "", "All of it."].join("\n")));
    assert.isTrue(aiText(["Mine.", "", "> [!AI]- Folded", "> The AI's."].join("\n")));
    assert.isTrue(aiText(["## Early life", "> [!ai-part]", "> The AI's."].join("\n")));
    assert.isFalse(aiText(["---", "ai: false", "---", "", "> [!note]", "> Mine."].join("\n")));
    assert.isFalse(aiText(["```", "> [!ai]", "```", "Write `> [!ai]` to mark it."].join("\n")));
  });

  it("finds a file for every wikilink in the demo Graph", () => {
    const folder = NodePath.join(import.meta.dirname, "../../../../demo/Graph");
    const files = NodeFS.readdirSync(folder)
      .filter((entry) => entry.endsWith(".md"))
      .map((entry) => ({
        name: entry.slice(0, -".md".length),
        markdown: NodeFS.readFileSync(NodePath.join(folder, entry), "utf8"),
      }));
    const written = files.reduce(
      (count, file) => count + new Set(file.markdown.match(/\[\[[^\]|#]+/g)).size,
      0,
    );
    const view = buildGraphView(files);

    assert.strictEqual(view.nodes.filter((node) => node.kind === "source").length, 10);
    assert.isTrue(view.nodes.every((node) => node.kind === "source" || node.sourceId !== null));
    assert.strictEqual(view.links.length, written);
  });
});

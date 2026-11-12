import type { Language } from "@glose/contracts";
import * as Yaml from "yaml";

/**
 * A Note that Extraction writes (docs/ideas.md shows one): frontmatter with `glose: note`, its
 * Source as a wikilink and its Location (`page`), then the user's own words, the AI's draft in
 * an `[!ai]` callout when the user kept it, and the Links the user added on a closing line.
 */
export interface NoteFileContent {
  /** The Source's file name. */
  readonly source: string;
  readonly page: string | null;
  /** The user's own words. */
  readonly text: string;
  /** Paragraphs the AI wrote, kept by the user; AI text. */
  readonly draft: string | null;
  /** The AI proposed the title, the Note's file name. */
  readonly aiTitle: boolean;
  /** Notes the Note links to. */
  readonly related: ReadonlyArray<string>;
  /** The language of the closing "Related" line. */
  readonly language: Language;
}

const RELATED: Record<Language, string> = { en: "Related", da: "Se også" };

const paragraphs = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

/**
 * The AI mark on paragraphs: one callout that runs to the next blank line, its paragraphs
 * divided by `>` lines, so Obsidian shows one marked box and any other editor a quote.
 */
const aiCallout = (text: string) =>
  [
    "> [!ai]",
    ...paragraphs(text).flatMap((paragraph, index) => [
      ...(index === 0 ? [] : [">"]),
      ...paragraph.split("\n").map((line) => `> ${line}`),
    ]),
  ].join("\n");

export const renderNoteFile = (note: NoteFileContent): string => {
  const draft = note.draft === null || paragraphs(note.draft).length === 0 ? null : note.draft;
  const frontmatter = new Yaml.Document({
    glose: "note",
    source: `[[${note.source}]]`,
    ...(note.page === null ? {} : { page: note.page }),
    // Either AI mark makes the file AI text, so Obsidian search and Dataview find it.
    ...(note.aiTitle || draft !== null ? { ai: true } : {}),
    ...(note.aiTitle ? { "ai-title": true } : {}),
  });
  const blocks = [
    ...paragraphs(note.text),
    ...(draft === null ? [] : [aiCallout(draft)]),
    ...(note.related.length === 0
      ? []
      : [`${RELATED[note.language]}: ${note.related.map((name) => `[[${name}]]`).join(", ")}`]),
  ];
  const body = blocks.length === 0 ? "" : `\n${blocks.join("\n\n")}\n`;
  return `---\n${frontmatter.toString()}---\n${body}`;
};

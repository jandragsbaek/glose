import { aiCallout, hasAiCallout, type Language, textParagraphs } from "@glose/contracts";
import * as Yaml from "yaml";

import { FRONTMATTER } from "./sourceFile.ts";

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

export const renderNoteFile = (note: NoteFileContent): string => {
  const draft = note.draft === null || textParagraphs(note.draft).length === 0 ? null : note.draft;
  const frontmatter = new Yaml.Document({
    glose: "note",
    source: `[[${note.source}]]`,
    ...(note.page === null ? {} : { page: note.page }),
    // Either AI mark makes the file AI text, so Obsidian search and Dataview find it.
    ...(note.aiTitle || draft !== null ? { ai: true } : {}),
    ...(note.aiTitle ? { "ai-title": true } : {}),
  });
  const blocks = [
    ...textParagraphs(note.text),
    ...(draft === null ? [] : [aiCallout(draft)]),
    ...(note.related.length === 0
      ? []
      : [`${RELATED[note.language]}: ${note.related.map((name) => `[[${name}]]`).join(", ")}`]),
  ];
  const body = blocks.length === 0 ? "" : `\n${blocks.join("\n\n")}\n`;
  return `---\n${frontmatter.toString()}---\n${body}`;
};

/** What the user changed in a Note they edited: its Location and its text, with their marks. */
export interface NoteEdit {
  readonly page: string | null;
  /** The Markdown after the frontmatter. */
  readonly body: string;
  /** The title is still the AI's. */
  readonly aiTitle: boolean;
  /** The whole text is the AI's, with no callout to mark it. */
  readonly aiNote: boolean;
}

/**
 * The Note file with the user's edit. Every other frontmatter field (its Source, tags, the
 * user's own) stays as written. `ai: true` stays while any AI text does, so Obsidian search and
 * Dataview still find it; null when the frontmatter is not YAML Glose can read, which Glose
 * then leaves alone.
 */
export const editNoteFile = (markdown: string, edit: NoteEdit): string | null => {
  const match = FRONTMATTER.exec(markdown);
  const frontmatter = Yaml.parseDocument(match?.[1] ?? "");
  if (frontmatter.errors.length > 0) return null;
  if (frontmatter.contents !== null && !Yaml.isMap(frontmatter.contents)) return null;
  const set = (key: string, value: unknown) =>
    value === null ? frontmatter.delete(key) : frontmatter.set(key, value);
  // Blank lines around the text go; the indent of its first line stays, as it means something.
  const body = edit.body
    .replace(/\r\n?/g, "\n")
    .replace(/^(?:[ \t]*\n)+/, "")
    .trimEnd();
  set("page", edit.page);
  set("ai", edit.aiTitle || edit.aiNote || hasAiCallout(body) ? true : null);
  set("ai-title", edit.aiTitle ? true : null);
  const yaml = Yaml.isMap(frontmatter.contents) && frontmatter.contents.items.length > 0;
  const head = yaml ? `---\n${frontmatter.toString()}---\n` : "";
  if (body === "") return head;
  return `${head}${yaml ? "\n" : ""}${body}\n`;
};

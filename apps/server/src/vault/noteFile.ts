import {
  aiCallout,
  hasAiCallout,
  isTimestamp,
  type Language,
  textParagraphs,
} from "@glose/contracts";
import * as Yaml from "yaml";

import { FRONTMATTER } from "./sourceFile.ts";

export interface NoteFootnote {
  readonly label: string;
  readonly text: string;
}

export interface NoteFileContent {
  readonly source: string | null;
  readonly page: string | null;
  readonly text: string;
  readonly draft: string | null;
  readonly aiTitle: boolean;
  readonly related: ReadonlyArray<string>;
  readonly language: Language;
  readonly footnotes?: ReadonlyArray<NoteFootnote>;
}

const RELATED: Record<Language, string> = { en: "Related", da: "Se også" };

export const pageValue = (page: string) => {
  if (!isTimestamp(page)) return page;
  const scalar = new Yaml.Scalar(page);
  scalar.type = Yaml.Scalar.QUOTE_DOUBLE;
  return scalar;
};

export const renderNoteFile = (note: NoteFileContent, today: string): string => {
  const draft = note.draft === null || textParagraphs(note.draft).length === 0 ? null : note.draft;
  const frontmatter = new Yaml.Document({
    glose: "note",
    ...(note.source === null ? {} : { source: `[[${note.source}]]` }),
    ...(note.page === null ? {} : { page: pageValue(note.page) }),
    growth: "seed",
    created: today,
    updated: today,
    ...(note.aiTitle || draft !== null ? { ai: true } : {}),
    ...(note.aiTitle ? { "ai-title": true } : {}),
  });
  const blocks = [
    ...textParagraphs(note.text),
    ...(draft === null ? [] : [aiCallout(draft)]),
    ...(note.related.length === 0
      ? []
      : [`${RELATED[note.language]}: ${note.related.map((name) => `[[${name}]]`).join(", ")}`]),
    ...((note.footnotes ?? []).length === 0
      ? []
      : [
          (note.footnotes ?? [])
            .map(({ label, text }) => `[^${label}]: ${text.replace(/\s+/g, " ").trim()}`)
            .join("\n\n"),
        ]),
  ];
  const body = blocks.length === 0 ? "" : `\n${blocks.join("\n\n")}\n`;
  return `---\n${frontmatter.toString()}---\n${body}`;
};

export interface NoteEdit {
  readonly page: string | null;
  readonly body: string;
  readonly aiTitle: boolean;
  readonly aiNote: boolean;
  readonly today: string;
}

const frontmatterOf = (markdown: string) => {
  const match = FRONTMATTER.exec(markdown);
  const frontmatter = Yaml.parseDocument(match?.[1] ?? "");
  if (frontmatter.errors.length > 0) return null;
  if (frontmatter.contents !== null && !Yaml.isMap(frontmatter.contents)) return null;
  const set = (key: string, value: unknown) =>
    value === null ? frontmatter.delete(key) : frontmatter.set(key, value);
  return { frontmatter, set, body: match === null ? markdown : (match[2] ?? "") };
};

export const setNoteFields = (
  markdown: string,
  fields: Readonly<Record<string, unknown>>,
): string | null => {
  const parsed = frontmatterOf(markdown);
  if (parsed === null) return null;
  for (const [key, value] of Object.entries(fields)) parsed.set(key, value);
  const { frontmatter } = parsed;
  const yaml = Yaml.isMap(frontmatter.contents) && frontmatter.contents.items.length > 0;
  const head = yaml ? `---\n${frontmatter.toString()}---\n` : "";
  return `${head}${parsed.body}`;
};

export const editNoteFile = (markdown: string, edit: NoteEdit): string | null => {
  const parsed = frontmatterOf(markdown);
  if (parsed === null) return null;
  const { frontmatter, set } = parsed;
  const body = edit.body
    .replace(/\r\n?/g, "\n")
    .replace(/^(?:[ \t]*\n)+/, "")
    .trimEnd();
  set("page", edit.page === null ? null : pageValue(edit.page));
  set("ai", edit.aiTitle || edit.aiNote || hasAiCallout(body) ? true : null);
  set("ai-title", edit.aiTitle ? true : null);
  set("updated", edit.today);
  const yaml = Yaml.isMap(frontmatter.contents) && frontmatter.contents.items.length > 0;
  const head = yaml ? `---\n${frontmatter.toString()}---\n` : "";
  if (body === "") return head;
  return `${head}${yaml ? "\n" : ""}${body}\n`;
};

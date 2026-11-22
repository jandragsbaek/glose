import {
  isPageNumber,
  type Language,
  linkKey,
  MARKDOWN_CODE,
  oneLine,
  parseWikilink,
  WIKILINK,
} from "@glose/contracts";
import * as Yaml from "yaml";

import { pageValue } from "./noteFile.ts";
import { FRONTMATTER, parseYaml } from "./sourceFile.ts";

export interface PassageFile {
  readonly source: string;
  readonly page: string | null;
  readonly words: string;
  readonly yourWords: string;
  readonly created: string | null;
}

const field = (values: unknown, key: string): unknown =>
  typeof values === "object" && values !== null
    ? (values as Record<string, unknown>)[key]
    : undefined;

const text = (value: unknown): string | null => {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const sourceName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const wikilink = /^\s*\[\[([^[\]\n]+)\]\]\s*$/.exec(value);
  const name = wikilink ? parseWikilink(wikilink[1] ?? "").target : value.trim();
  return name === "" ? null : name;
};

const quoted = (words: string): string =>
  words
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line.trim()}`))
    .join("\n");

export const renderPassageFile = (passage: PassageFile): string => {
  const frontmatter = new Yaml.Document({
    glose: "passage",
    source: `[[${passage.source}]]`,
    ...(passage.page === null ? {} : { page: pageValue(passage.page) }),
    ...(passage.created === null ? {} : { created: passage.created }),
  });
  const mine = passage.yourWords.replace(/\r\n?/g, "\n").trim();
  return `---\n${frontmatter.toString()}---\n\n${quoted(passage.words)}\n${mine === "" ? "" : `\n${mine}\n`}`;
};

export const parsePassageFile = (markdown: string): PassageFile | null => {
  const match = FRONTMATTER.exec(markdown);
  if (match === null) return null;
  const frontmatter = parseYaml(match[1] ?? "");
  if (field(frontmatter, "glose") !== "passage") return null;
  const source = sourceName(field(frontmatter, "source"));
  if (source === null) return null;
  const lines = (match[2] ?? "").replace(/\r\n?/g, "\n").replace(/^\n+/, "").split("\n");
  const quote: Array<string> = [];
  let index = 0;
  for (; index < lines.length && /^\s*>/.test(lines[index] ?? ""); index++) {
    quote.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
  }
  const created = field(frontmatter, "created");
  return {
    source,
    page: text(field(frontmatter, "page")),
    words: quote.join("\n").trim(),
    yourWords: lines.slice(index).join("\n").trim(),
    created:
      typeof created === "string"
        ? created
        : created instanceof Date
          ? created.toISOString().slice(0, 10)
          : null,
  };
};

export const linkedNames = (markdown: string): ReadonlySet<string> =>
  new Set(
    Array.from(markdown.replace(MARKDOWN_CODE, "").matchAll(WIKILINK), (found) =>
      linkKey(parseWikilink(found[1] ?? "").target),
    ),
  );

const FOOTNOTE = /^(\[\^[^\]\s]+\]:[ \t]*)(.*)$/;

export const refreshFootnotes = (markdown: string, passage: string, cite: string): string =>
  markdown
    .split("\n")
    .map((line) => {
      const found = FOOTNOTE.exec(line.replace(/\r$/, ""));
      if (found === null || !linkedNames(found[2] ?? "").has(linkKey(passage))) return line;
      return `${found[1]}${cite}${line.endsWith("\r") ? "\r" : ""}`;
    })
    .join("\n");

const PAGE: Record<Language, string> = { en: "p.", da: "s." };

export const passageCite = (
  id: string,
  page: string | null,
  words: string,
  language: Language,
): string => {
  const label = page === null ? id : isPageNumber(page) ? `${PAGE[language]} ${page}` : page;
  return `“${oneLine(words).replace(/[[\]]/g, (bracket) => `\\${bracket}`)}” [[${id}|${label}]]`;
};

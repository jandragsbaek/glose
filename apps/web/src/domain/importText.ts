import { articleFrontmatter, parseArticle } from "@glose/contracts";

export type Frontmatter = Readonly<Record<string, string | ReadonlyArray<string>>>;

const unquote = (value: string) =>
  value
    .trim()
    .replace(/^"(.*)"$/s, "$1")
    .replace(/^'(.*)'$/s, "$1")
    .replace(/^\[\[(.*?)(?:\|.*)?\]\]$/, "$1")
    .trim();

export const readFrontmatter = (markdown: string): Frontmatter => {
  const yaml = articleFrontmatter(markdown);
  if (yaml === null) return {};
  const out: Record<string, string | Array<string>> = {};
  let listKey: string | null = null;
  for (const line of yaml.split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item !== null && listKey !== null) {
      const list = out[listKey];
      const value = unquote(item[1] ?? "");
      if (Array.isArray(list) && value !== "") list.push(value);
      continue;
    }
    const pair = /^([A-Za-z][\w -]*?):\s*(.*)$/.exec(line);
    if (pair === null) continue;
    const key = pair[1]!.trim().toLowerCase();
    const value = (pair[2] ?? "").trim();
    if (value === "") {
      out[key] = [];
      listKey = key;
    } else if (/^\[.*\]$/.test(value) && !/^\[\[/.test(value)) {
      out[key] = value
        .slice(1, -1)
        .split(",")
        .map(unquote)
        .filter((part) => part !== "");
      listKey = null;
    } else {
      out[key] = unquote(value);
      listKey = null;
    }
  }
  return out;
};

const first = (data: Frontmatter, keys: ReadonlyArray<string>): string | null => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value !== "") return value;
    if (Array.isArray(value) && value[0] !== undefined) return value[0];
  }
  return null;
};

const all = (data: Frontmatter, keys: ReadonlyArray<string>): ReadonlyArray<string> => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value !== "") {
      return value.split(/\s*(?:;|\band\b|&)\s*/).filter((name) => name !== "");
    }
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
};

export const splitName = (name: string): { readonly family: string; readonly given: string } => {
  const clean = name.replace(/\s+/g, " ").trim();
  const comma = /^([^,]+),\s*(.+)$/.exec(clean);
  if (comma !== null) return { family: comma[1]!.trim(), given: comma[2]!.trim() };
  const words = clean.split(" ");
  if (words.length === 1) return { family: clean, given: "" };
  return { family: words.at(-1)!, given: words.slice(0, -1).join(" ") };
};

export interface FoundDetails {
  readonly title: string | null;
  readonly family: string | null;
  readonly given: string | null;
  readonly otherAuthors: ReadonlyArray<string>;
  readonly published: string | null;
  readonly year: string | null;
  readonly url: string | null;
  readonly container: string | null;
  readonly doi: string | null;
}

const firstHeading = (markdown: string) =>
  parseArticle(markdown).blocks.find((block) => block.kind === "heading" && block.level <= 2);

export const detailsFromMarkdown = (markdown: string): FoundDetails => {
  const data = readFrontmatter(markdown);
  const authors = all(data, ["author", "authors", "creator", "byline"]);
  const lead = authors[0] === undefined ? null : splitName(authors[0]);
  const published = first(data, ["published", "date", "pubdate", "publish_date"]);
  const heading = firstHeading(markdown);
  const year = published === null ? null : (/\b(\d{4})\b/.exec(published)?.[1] ?? null);
  return {
    title:
      first(data, ["title"]) ??
      (heading?.kind === "heading" && heading.text !== "" ? heading.text : null),
    family: lead?.family ?? null,
    given: lead === null || lead.given === "" ? null : lead.given,
    otherAuthors: authors.slice(1),
    published: published === null ? null : published.slice(0, 10),
    year,
    url: first(data, ["source", "url", "link", "canonical"]),
    container: first(data, ["site", "site_name", "publisher", "journal", "publication", "course"]),
    doi: first(data, ["doi"]),
  };
};

export const partFromName = (name: string): string | null => {
  const base = name.replace(/\.[^.]+$/, "");
  const weekDay = /(?:week|uge|w)[\s_-]*0*(\d{1,2})\D{0,12}?(?:day|dag|d)[\s_-]*0*(\d{1,2})/i.exec(
    base,
  );
  if (weekDay !== null) return `${Number(weekDay[1])}.${Number(weekDay[2])}`;
  const dotted = /^0*(\d{1,2})[._-]0*(\d{1,2})(?:\D|$)/.exec(base);
  if (dotted !== null) return `${Number(dotted[1])}.${Number(dotted[2])}`;
  return null;
};

export const lessonTitle = (name: string, markdown: string): string => {
  const found = detailsFromMarkdown(markdown).title;
  if (found !== null) return found;
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/(?:week|uge|w)[\s_-]*\d+|(?:day|dag|d)[\s_-]*\d+|^\d+[._-]\d+/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const byFileName = <A extends { readonly name: string }>(files: ReadonlyArray<A>) =>
  [...files].sort((a, b) => natural.compare(a.name, b.name));

export const partByOrder = (index: number, perWeek: number): string =>
  `${Math.floor(index / perWeek) + 1}.${(index % perWeek) + 1}`;

export const comparePart = (a: string | null, b: string | null): number =>
  natural.compare(a ?? "", b ?? "");

export const isMarkdownName = (name: string) => /\.(md|markdown|mdown|txt)$/i.test(name);

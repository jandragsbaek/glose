import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

export interface WebPage {
  readonly url: string;
  readonly title: string;
  readonly author: string | null;
  readonly site: string | null;
  readonly published: string | null;
  readonly markdown: string;
}

const MAX_MARKDOWN = 400_000;

const clean = (text: string | null | undefined): string | null => {
  const value = text?.replace(/\s+/g, " ").trim() ?? "";
  return value === "" ? null : value;
};

const meta = (document: Document, ...names: ReadonlyArray<string>): string | null => {
  for (const name of names) {
    const element = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    const value = clean(element?.getAttribute("content"));
    if (value !== null) return value;
  }
  return null;
};

const absolute = (href: string, base: string): string | null => {
  try {
    const url = new URL(href, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

const turndown = (base: string) => {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  service.remove(["script", "style", "noscript", "iframe", "form", "button"]);
  service.addRule("no-images", { filter: ["img", "picture"], replacement: () => "" });
  service.addRule("web-links", {
    filter: "a",
    replacement: (content, node) => {
      const href = absolute((node as HTMLElement).getAttribute("href") ?? "", base);
      return href === null || content.trim() === "" ? content : `[${content}](${href})`;
    },
  });
  return service;
};

const AUTHOR_PREFIX = /^(?:by|af|von|par)\s+/i;

export const pageFromHtml = (html: string, url: string): WebPage | null => {
  const { document } = parseHTML(html);
  const published = meta(
    document,
    "article:published_time",
    "citation_publication_date",
    "citation_date",
    "date",
    "dc.date",
  );
  const metaAuthor = meta(document, "citation_author", "author", "article:author");
  const site = meta(document, "og:site_name", "citation_journal_title", "application-name");
  const metaTitle = meta(document, "citation_title", "og:title");
  const article = new Readability(document as unknown as Document, { keepClasses: false }).parse();
  const content = article?.content ?? null;
  if (content === null) return null;
  const markdown = turndown(url)
    .turndown(content)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_MARKDOWN);
  if (markdown === "") return null;
  const byline = clean(article?.byline)?.replace(AUTHOR_PREFIX, "") ?? null;
  const author = metaAuthor?.startsWith("http") === false ? metaAuthor : byline;
  return {
    url,
    title: clean(article?.title) ?? metaTitle ?? new URL(url).hostname,
    author: author !== null && author.length <= 120 ? author : null,
    site: clean(article?.siteName) ?? site,
    published: clean(article?.publishedTime) ?? published,
    markdown,
  };
};

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const IMAGE_MARK = /!\[/g;
const HTML_IMAGE = /<img\b[^>]*>/gi;
const MARKDOWN_LINK = /\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+"[^"]*")?\s*\)/g;

const cleanLine = (line: string, base: string): string =>
  line
    .replace(HTML_IMAGE, "")
    .replace(IMAGE_MARK, "[")
    .replace(MARKDOWN_LINK, (_, text: string, href: string) => {
      const target = absolute(href.replace(/^<|>$/g, ""), base);
      return target === null ? text : `[${text}](${target})`;
    });

const cleanMarkdown = (markdown: string, base: string): string => {
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = FENCE.exec(line)?.[1];
      if (fence !== null) {
        if (marker !== undefined && marker.startsWith(fence)) fence = null;
        return line;
      }
      if (marker !== undefined) {
        fence = marker;
        return line;
      }
      return cleanLine(line, base);
    })
    .join("\n");
};

export const pageFromText = (text: string, url: string): WebPage | null => {
  const markdown = cleanMarkdown(text.replace(/\r\n?/g, "\n"), url).trim().slice(0, MAX_MARKDOWN);
  if (markdown === "") return null;
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim();
  return {
    url,
    title: heading ?? new URL(url).pathname.split("/").filter(Boolean).pop() ?? url,
    author: null,
    site: new URL(url).hostname,
    published: null,
    markdown,
  };
};

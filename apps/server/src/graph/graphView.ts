import {
  type GraphLink,
  type GraphNode,
  type GraphView,
  hasAiCallout,
  linkKey,
  MARKDOWN_CODE,
  parseWikilink,
  WIKILINK,
} from "@glose/contracts";
import * as Option from "effect/Option";

import { FRONTMATTER, parseSourceFile, parseYaml } from "./sourceFile.ts";

export interface GraphFile {
  /** The file name without `.md`. */
  readonly name: string;
  readonly markdown: string;
}

const linkTargets = (markdown: string): ReadonlyArray<string> =>
  Array.from(
    markdown.replace(MARKDOWN_CODE, "").matchAll(WIKILINK),
    (match) => parseWikilink(match[1] ?? "").target,
  ).filter((target) => target !== "");

/** A Note names its Source as a wikilink: `source: "[[Arendt 1958 The Human Condition]]"`. */
const sourceName = (frontmatter: unknown): string | null => {
  if (typeof frontmatter !== "object" || frontmatter === null || !("source" in frontmatter)) {
    return null;
  }
  const value = frontmatter.source;
  if (typeof value !== "string") return null;
  const wikilink = /^\s*\[\[([^[\]\n]+)\]\]\s*$/.exec(value);
  const name = wikilink ? parseWikilink(wikilink[1] ?? "").target : "";
  return name === "" ? null : name;
};

/**
 * AI text carries an AI mark: the file as a whole (`ai: true`, so Obsidian search and other
 * tools find it), and its paragraphs or Parts (`[!ai]`, `[!ai-part]`). Either mark counts, so
 * a file whose two marks drift apart after a hand edit is never shown as free of AI text.
 */
const hasAiText = (frontmatter: unknown, body: string): boolean =>
  (typeof frontmatter === "object" &&
    frontmatter !== null &&
    "ai" in frontmatter &&
    frontmatter.ai === true) ||
  hasAiCallout(body);

const field = (frontmatter: unknown, key: string): unknown =>
  typeof frontmatter === "object" && frontmatter !== null && key in frontmatter
    ? (frontmatter as Record<string, unknown>)[key]
    : undefined;

/** A Note's Location: `page: 47` or `page: "47–49"`. */
const pageOf = (frontmatter: unknown): string | null => {
  const value = field(frontmatter, "page");
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

interface ParsedFile {
  readonly node: Omit<GraphNode, "sourceId">;
  readonly sourceName: string | null;
  readonly targets: ReadonlyArray<string>;
}

const parseFile = ({ name, markdown }: GraphFile): ParsedFile => {
  const match = FRONTMATTER.exec(markdown);
  const frontmatter = match ? parseYaml(match[1] ?? "") : undefined;
  const body = (match ? (match[2] ?? "") : markdown).replace(/^\r?\n/, "").trimEnd();
  const targets = linkTargets(markdown);
  return Option.match(parseSourceFile(markdown), {
    onSome: (source) => ({
      node: {
        id: name,
        kind: "source",
        title: source.title,
        body: source.freeText,
        aiText: hasAiText(frontmatter, source.freeText),
        aiTitle: false,
        page: null,
      },
      sourceName: null,
      targets,
    }),
    onNone: () => ({
      node: {
        id: name,
        kind: "note",
        title: name,
        body,
        aiText: hasAiText(frontmatter, body),
        aiTitle: field(frontmatter, "ai-title") === true,
        page: pageOf(frontmatter),
      },
      sourceName: sourceName(frontmatter),
      targets,
    }),
  });
};

/**
 * The Graph as the files say it is: every Markdown file is a node, and every wikilink that
 * names another file in the folder is a Link, as in Obsidian. A wikilink to a missing file is
 * not a Link, and a file linking to itself, or twice to the same file, adds one Link at most.
 */
export const buildGraphView = (files: ReadonlyArray<GraphFile>): GraphView => {
  const parsed = files.map(parseFile).sort((a, b) => a.node.id.localeCompare(b.node.id, "en"));
  const byKey = new Map(parsed.map((file) => [linkKey(file.node.id), file.node]));

  const nodes: Array<GraphNode> = parsed.map((file) => {
    const source = file.sourceName === null ? undefined : byKey.get(linkKey(file.sourceName));
    return { ...file.node, sourceId: source?.kind === "source" ? source.id : null };
  });

  const seen = new Set<string>();
  const links: Array<GraphLink> = [];
  for (const file of parsed) {
    for (const target of file.targets) {
      const to = byKey.get(linkKey(target))?.id;
      const key = `${file.node.id}\u0000${to}`;
      if (to === undefined || to === file.node.id || seen.has(key)) continue;
      seen.add(key);
      links.push({ from: file.node.id, to });
    }
  }
  return { nodes, links };
};

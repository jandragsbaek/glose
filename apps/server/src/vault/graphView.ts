import {
  dayOf,
  type GraphLink,
  type GraphNode,
  type GraphView,
  hasAiCallout,
  linkKey,
  MARKDOWN_CODE,
  NOTE_FIELDS,
  parseWikilink,
  type PersonName,
  growthOf,
  WIKILINK,
} from "@glose/contracts";
import * as Option from "effect/Option";

import { propertiesOf } from "./frontmatter.ts";
import { FRONTMATTER, parseYaml, SOURCE_FIELDS, sourceOfFrontmatter } from "./sourceFile.ts";

export interface GraphFile {
  readonly name: string;
  readonly markdown: string;
}

const linkTargets = (markdown: string): ReadonlyArray<string> =>
  Array.from(
    markdown.replace(MARKDOWN_CODE, "").matchAll(WIKILINK),
    (match) => parseWikilink(match[1] ?? "").target,
  ).filter((target) => target !== "");

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

const pageOf = (frontmatter: unknown): string | null => {
  const value = field(frontmatter, "page");
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const text = (frontmatter: unknown, key: string): string | null => {
  const value = field(frontmatter, key);
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const personOf = (frontmatter: unknown, name: string): PersonName => {
  const family = text(frontmatter, "family");
  if (family !== null) return { family, given: text(frontmatter, "given") };
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? name;
  return { family: last, given: words.length === 0 ? null : words.join(" ") };
};

interface ParsedNode {
  readonly node: Omit<GraphNode, "sourceId">;
  readonly sourceName: string | null;
  readonly targets: ReadonlyArray<string>;
}

const parseNode = ({ name, markdown }: GraphFile): ParsedNode => {
  const match = FRONTMATTER.exec(markdown);
  const frontmatter = match ? parseYaml(match[1] ?? "") : undefined;
  const body = (match ? (match[2] ?? "") : markdown).replace(/^\r?\n/, "").trimEnd();
  const targets = linkTargets(markdown);
  const dates = {
    updated: dayOf(field(frontmatter, "updated")),
    tended: dayOf(field(frontmatter, "tended")),
  };
  if (field(frontmatter, "glose") === "person") {
    return {
      node: {
        id: name,
        kind: "person",
        title: name,
        body,
        aiText: hasAiText(frontmatter, body),
        aiTitle: field(frontmatter, "ai-title") === true,
        page: null,
        growth: null,
        created: dayOf(field(frontmatter, "created")),
        ...dates,
        properties: propertiesOf(frontmatter, NOTE_FIELDS),
        person: personOf(frontmatter, name),
      },
      sourceName: null,
      targets,
    };
  }
  const source = match ? sourceOfFrontmatter(frontmatter, body) : Option.none();
  const properties = propertiesOf(frontmatter, Option.isSome(source) ? SOURCE_FIELDS : NOTE_FIELDS);
  return Option.match(source, {
    onSome: (source) => ({
      node: {
        id: name,
        kind: "source",
        title: source.title,
        body: source.freeText,
        aiText: hasAiText(frontmatter, source.freeText),
        aiTitle: false,
        page: null,
        growth: null,
        created: dayOf(field(frontmatter, "added")),
        ...dates,
        properties,
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
        growth: growthOf(field(frontmatter, "growth")),
        created: dayOf(field(frontmatter, "created")),
        ...dates,
        properties,
      },
      sourceName: sourceName(frontmatter),
      targets,
    }),
  });
};

export interface ParsedFile {
  readonly node: Omit<GraphNode, "sourceId">;
  readonly key: string;
  readonly sourceKey: string | null;
  readonly targetKeys: ReadonlyArray<string>;
}

export const parseGraphFile = (file: GraphFile): ParsedFile => {
  const { node, sourceName, targets } = parseNode(file);
  return {
    node,
    key: linkKey(node.id),
    sourceKey: sourceName === null ? null : linkKey(sourceName),
    targetKeys: targets.map(linkKey),
  };
};

const byName = new Intl.Collator("en").compare;

export const assembleGraphView = (files: ReadonlyArray<ParsedFile>): GraphView => {
  const parsed = files.toSorted((a, b) => byName(a.node.id, b.node.id));
  const byKey = new Map(parsed.map((file) => [file.key, file.node]));

  const nodes: Array<GraphNode> = parsed.map((file) => {
    const source = file.sourceKey === null ? undefined : byKey.get(file.sourceKey);
    return { ...file.node, sourceId: source?.kind === "source" ? source.id : null };
  });

  const seen = new Set<string>();
  const links: Array<GraphLink> = [];
  for (const file of parsed) {
    for (const target of file.targetKeys) {
      const to = byKey.get(target)?.id;
      const key = `${file.node.id}\u0000${to}`;
      if (to === undefined || to === file.node.id || seen.has(key)) continue;
      seen.add(key);
      links.push({ from: file.node.id, to });
    }
  }
  return { nodes, links };
};

export const buildGraphView = (files: ReadonlyArray<GraphFile>): GraphView =>
  assembleGraphView(files.map(parseGraphFile));

import * as Schema from "effect/Schema";

import { type GraphNode, linkKey, MARKDOWN_CODE } from "./graph.ts";
import { citedByContainer, type Source } from "./source.ts";
import { isTimestamp } from "./video.ts";

export const WritingProjectType = Schema.Literals(["blog-post", "assignment"]);
export type WritingProjectType = typeof WritingProjectType.Type;

export const ReferenceForm = Schema.Literals(["footnotes", "links", "side-notes"]);
export type ReferenceForm = typeof ReferenceForm.Type;

export const CitationStyle = Schema.Literals(["chicago", "apa", "harvard"]);
export type CitationStyle = typeof CitationStyle.Type;

export const PublicationRecord = Schema.Struct({
  date: Schema.String,
  file: Schema.String,
});
export type PublicationRecord = typeof PublicationRecord.Type;

const Title = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const WritingProjectFields = Schema.Struct({
  title: Title,
  type: WritingProjectType,
  language: Schema.String,
  referenceForm: ReferenceForm,
  citationStyle: CitationStyle,
  body: Schema.String,
});
export type WritingProjectFields = typeof WritingProjectFields.Type;

export const WritingProject = Schema.Struct({
  id: Schema.String,
  ...WritingProjectFields.fields,
  modified: Schema.Number,
  published: Schema.NullOr(PublicationRecord),
});
export type WritingProject = typeof WritingProject.Type;

export const WritingProjectRef = Schema.Struct({ id: Schema.String });

export const SaveWritingProject = Schema.Struct({
  id: Schema.String,
  ...WritingProjectFields.fields,
});
export type SaveWritingProject = typeof SaveWritingProject.Type;

export const PublishWritingProject = Schema.Struct({
  id: Schema.String,
  replace: Schema.Boolean,
});

export const SetSiteFolder = Schema.Struct({ siteFolder: Schema.String });

export const WritingReview = Schema.Struct({
  claims: Schema.Array(Schema.Struct({ excerpt: Schema.String, reason: Schema.String })),
  suggestions: Schema.Array(
    Schema.Struct({ excerpt: Schema.String, noteId: Schema.String, reason: Schema.String }),
  ),
  questions: Schema.Array(
    Schema.Struct({ excerpt: Schema.NullOr(Schema.String), question: Schema.String }),
  ),
});
export type WritingReview = typeof WritingReview.Type;

export class WritingProjectNotFound extends Schema.TaggedError<WritingProjectNotFound>()(
  "WritingProjectNotFound",
  { id: Schema.String },
) {}

export class WritingProjectNameTaken extends Schema.TaggedError<WritingProjectNameTaken>()(
  "WritingProjectNameTaken",
  { fileName: Schema.String },
) {}

export class SiteFolderNotSet extends Schema.TaggedError<SiteFolderNotSet>()(
  "SiteFolderNotSet",
  {},
) {}

export class SiteFolderUnavailable extends Schema.TaggedError<SiteFolderUnavailable>()(
  "SiteFolderUnavailable",
  {
    path: Schema.String,
    reason: Schema.Literals(["not-absolute", "not-found", "not-bridgetown", "not-writable"]),
  },
) {}

export class PublicationExists extends Schema.TaggedError<PublicationExists>()(
  "PublicationExists",
  { file: Schema.String },
) {}

export class PublicationNotReady extends Schema.TaggedError<PublicationNotReady>()(
  "PublicationNotReady",
  { type: WritingProjectType },
) {}

export class WritingReviewUnavailable extends Schema.TaggedError<WritingReviewUnavailable>()(
  "WritingReviewUnavailable",
  { reason: Schema.Literals(["off", "failed"]) },
) {}

export const WRITING_FOLDER = "Writing";

export const REFERENCE = /\[\[([^[\]\n]+?)\]\](?:\{([^{}\n]*)\})?/g;

export interface ReferenceToken {
  readonly start: number;
  readonly end: number;
  readonly target: string;
  readonly location: string | null;
}

const LOCATION_PREFIX = /^(?:pp?|s|ss|side|sider|page|pages)\.?\s*/i;

export const parseLocation = (raw: string | undefined): string | null => {
  const text = (raw ?? "").trim().replace(LOCATION_PREFIX, "").trim();
  return text === "" ? null : text;
};

export const referenceToken = (target: string, location: string | null, video = false): string =>
  location === null
    ? `[[${target}]]`
    : `[[${target}]]{${video && isTimestamp(location) ? location : `p. ${location}`}}`;

export const findReferences = (body: string): ReadonlyArray<ReferenceToken> => {
  const code = Array.from(body.matchAll(MARKDOWN_CODE), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
  const out: Array<ReferenceToken> = [];
  for (const match of body.matchAll(REFERENCE)) {
    const start = match.index;
    if (code.some((range) => start >= range.start && start < range.end)) continue;
    if (start > 0 && body[start - 1] === "!") continue;
    const inner = match[1] ?? "";
    const target =
      (inner.split("|", 1)[0] ?? "")
        .split(/[#^]/, 1)[0]
        ?.trim()
        .replace(/\.md$/i, "")
        .split("/")
        .pop() ?? "";
    if (target === "") continue;
    out.push({
      start,
      end: start + match[0].length,
      target,
      location: parseLocation(match[2]),
    });
  }
  return out;
};

export type CitedSource = Pick<
  Source,
  | "id"
  | "familyName"
  | "givenName"
  | "title"
  | "firstPublished"
  | "edition"
  | "editionYear"
  | "publisher"
  | "translator"
> &
  Partial<Pick<Source, "kind" | "container" | "url">>;

const hasOwnTextKind = (source: CitedSource) =>
  source.kind === "article" || source.kind === "lesson";

const isVideo = (source: CitedSource) => source.kind === "video";

export type ReferenceProblem =
  | "not-found"
  | "no-source"
  | "no-location"
  | "no-year"
  | "no-publisher"
  | "no-container"
  | "quote-mismatch";

export interface ResolvedReference extends ReferenceToken {
  readonly number: number;
  readonly noteId: string | null;
  readonly source: CitedSource | null;
  readonly page: string | null;
  readonly quote: string | null;
  readonly problems: ReadonlyArray<ReferenceProblem>;
}

const QUOTE = /(?:"([^"\n]+)"|“([^”\n]+)”|„([^“”\n]+)[“”]|«([^»\n]+)»)[\s.,;:!?)]*$/u;

const normalizeQuote = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

export const quoteBefore = (body: string, start: number): string | null => {
  const paragraphStart = body.lastIndexOf("\n\n", start);
  const before = body.slice(paragraphStart < 0 ? 0 : paragraphStart, start);
  const match = QUOTE.exec(before);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? match[4] ?? null;
};

export const resolveReferences = (
  body: string,
  nodes: ReadonlyArray<Pick<GraphNode, "id" | "kind" | "sourceId" | "body" | "page">>,
  sources: ReadonlyArray<CitedSource>,
): ReadonlyArray<ResolvedReference> => {
  const nodeByKey = new Map(nodes.map((node) => [linkKey(node.id), node]));
  const sourceByKey = new Map(sources.map((source) => [linkKey(source.id), source]));
  return findReferences(body).map((token, index) => {
    const node = nodeByKey.get(linkKey(token.target));
    const directSource = sourceByKey.get(linkKey(token.target)) ?? null;
    const isNote = node !== undefined && node.kind === "note";
    const source = isNote
      ? node.sourceId === null
        ? null
        : (sourceByKey.get(linkKey(node.sourceId)) ?? null)
      : directSource;
    const page = token.location ?? (isNote ? node.page : null);
    const quote = quoteBefore(body, token.start);
    const problems: Array<ReferenceProblem> = [];
    if (node === undefined && directSource === null) problems.push("not-found");
    else if (source === null) problems.push("no-source");
    if (problems.length === 0 && source !== null) {
      if (page === null) problems.push("no-location");
      if (source.firstPublished === null && source.editionYear === null) problems.push("no-year");
      if (citedByContainer(source.kind ?? "book")) {
        if ((source.container ?? null) === null) problems.push("no-container");
      } else if (source.publisher === null) problems.push("no-publisher");
    }
    if (quote !== null && isNote && !normalizeQuote(node.body).includes(normalizeQuote(quote))) {
      problems.push("quote-mismatch");
    }
    return {
      ...token,
      number: index + 1,
      noteId: isNote ? node.id : null,
      source,
      page,
      quote,
      problems,
    };
  });
};

export const citedYear = (source: CitedSource): number | null =>
  source.editionYear ?? source.firstPublished;

const authorName = (source: CitedSource) =>
  [source.givenName, source.familyName].filter((part) => part !== null).join(" ");

const initials = (given: string | null) =>
  given === null
    ? null
    : given
        .split(/[\s-]+/)
        .filter((part) => part !== "")
        .map((part) => `${Array.from(part)[0] ?? ""}.`)
        .join(" ");

const yearText = (source: CitedSource) => String(citedYear(source) ?? "n.d.");

const PARAGRAPH = /^¶\s*(.+)$/;

const locationText = (source: CitedSource, page: string, style: CitationStyle | "note") => {
  if (isVideo(source) && isTimestamp(page)) return page;
  const paragraph = PARAGRAPH.exec(page)?.[1];
  if (paragraph === undefined) return style === "apa" || style === "harvard" ? `p. ${page}` : page;
  return style === "apa" || style === "harvard" ? `para. ${paragraph}` : `par. ${paragraph}`;
};

const textCitation = (source: CitedSource, page: string | null) => {
  const container = source.container == null ? "" : ` *${source.container}*`;
  const location = page === null ? "" : `, ${locationText(source, page, "note")}`;
  return `${authorName(source)}, “${source.title},”${container} (${yearText(source)})${location}.`;
};

const videoCitation = (source: CitedSource, page: string | null) => {
  const channel = source.container == null ? "" : ` ${source.container},`;
  const location = page === null ? "" : `, ${locationText(source, page, "note")}`;
  return `${authorName(source)}, “${source.title},”${channel} YouTube video (${yearText(source)})${location}.`;
};

export const noteCitation = (source: CitedSource, page: string | null): string => {
  if (isVideo(source)) return videoCitation(source, page);
  if (hasOwnTextKind(source)) return textCitation(source, page);
  const translated = source.translator === null ? "" : `, trans. ${source.translator}`;
  const edition = source.edition === null ? "" : `, ${source.edition} ed.`;
  const facts = [source.publisher, yearText(source)].filter((part) => part !== null).join(", ");
  const location = page === null ? "" : `, ${page}`;
  return `${authorName(source)}, *${source.title}*${translated}${edition} (${facts})${location}.`;
};

export const shortCitation = (
  source: CitedSource,
  page: string | null,
  style: CitationStyle,
): string => {
  switch (style) {
    case "apa":
      return `${source.familyName}, ${yearText(source)}${page === null ? "" : `, ${locationText(source, page, style)}`}`;
    case "harvard":
      return `${source.familyName} ${yearText(source)}${page === null ? "" : `, ${locationText(source, page, style)}`}`;
    case "chicago":
      return `${source.familyName} ${yearText(source)}${page === null ? "" : `, ${locationText(source, page, style)}`}`;
  }
};

const textEntry = (source: CitedSource, style: CitationStyle): string => {
  const container = source.container == null ? "" : ` *${source.container}*.`;
  const url = source.url == null ? "" : ` ${source.url}`;
  if (style === "chicago") {
    const name =
      source.givenName === null ? source.familyName : `${source.familyName}, ${source.givenName}`;
    const where = source.container == null ? "" : ` *${source.container}*,`;
    return `${name}. “${source.title}.”${where} ${yearText(source)}.${url}`;
  }
  const given = initials(source.givenName);
  const name = given === null ? source.familyName : `${source.familyName}, ${given}`;
  const year = style === "apa" ? ` (${yearText(source)}).` : ` (${yearText(source)})`;
  return `${name}${year} ${source.title}.${container}${url}`;
};

const videoEntry = (source: CitedSource, style: CitationStyle): string => {
  const url = source.url == null ? "" : ` ${source.url}`;
  if (style === "chicago") {
    const name =
      source.givenName === null ? source.familyName : `${source.familyName}, ${source.givenName}`;
    const channel = source.container == null ? "" : ` ${source.container},`;
    return `${name}. “${source.title}.”${channel} ${yearText(source)}. YouTube video.${url}`;
  }
  const given = initials(source.givenName);
  const name = given === null ? source.familyName : `${source.familyName}, ${given}`;
  const year = style === "apa" ? ` (${yearText(source)}).` : ` (${yearText(source)})`;
  if (style === "apa") return `${name}${year} *${source.title}* [Video]. YouTube.${url}`;
  const channel = source.container == null ? "" : ` ${source.container}.`;
  const address = source.url == null ? "" : ` Available at: ${source.url}`;
  return `${name}${year} *${source.title}* [Video].${channel}${address}`;
};

export const bibliographyEntry = (source: CitedSource, style: CitationStyle): string => {
  if (isVideo(source)) return videoEntry(source, style);
  if (hasOwnTextKind(source)) return textEntry(source, style);
  const publisher = source.publisher === null ? "" : ` ${source.publisher}.`;
  switch (style) {
    case "apa":
    case "harvard": {
      const given = initials(source.givenName);
      const name = given === null ? source.familyName : `${source.familyName}, ${given}`;
      const year = style === "apa" ? ` (${yearText(source)}).` : ` (${yearText(source)})`;
      return `${name}${year} *${source.title}*.${publisher}`;
    }
    case "chicago": {
      const name =
        source.givenName === null ? source.familyName : `${source.familyName}, ${source.givenName}`;
      const facts = [source.publisher, yearText(source)].filter((part) => part !== null);
      return `${name}. *${source.title}*. ${facts.join(", ")}.`;
    }
  }
};

export const citedSources = (
  references: ReadonlyArray<ResolvedReference>,
): ReadonlyArray<CitedSource> => {
  const byId = new Map<string, CitedSource>();
  for (const reference of references) {
    if (reference.source !== null) byId.set(linkKey(reference.source.id), reference.source);
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.familyName.localeCompare(b.familyName, "und") || a.title.localeCompare(b.title, "und"),
  );
};

const TRANSLITERATIONS: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", ß: "ss" };

export const postSlug = (title: string): string =>
  title
    .toLocaleLowerCase("und")
    .replace(/[æøåß]/g, (letter) => TRANSLITERATIONS[letter] ?? letter)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "") || "post";

export const POSTS_FOLDER = ["src", "_posts"] as const;

export const postFileName = (date: string, title: string): string =>
  `${date}-${postSlug(title)}.md`;

const SOURCES_HEADING: Record<string, string> = { da: "Kilder", en: "Sources" };

export const sourcesHeading = (language: string): string =>
  SOURCES_HEADING[language.toLowerCase().split("-")[0] ?? "en"] ?? "Sources";

export const renderBlogPost = (
  project: Pick<WritingProject, "title" | "body" | "referenceForm" | "language">,
  references: ReadonlyArray<ResolvedReference>,
  date: string,
): string => {
  const style: CitationStyle = "chicago";
  const anchor = sourcesHeading(project.language).toLocaleLowerCase("und");
  let body = project.body;
  for (const reference of [...references].reverse()) {
    const raw = body.slice(0, reference.start);
    const before = project.referenceForm === "links" ? raw : raw.replace(/[ \t]+$/, "");
    const after = body.slice(reference.end);
    const replacement =
      project.referenceForm === "links"
        ? `${/\s$/.test(before) || before === "" ? "" : " "}([${
            reference.source === null
              ? reference.target
              : shortCitation(reference.source, reference.page, style)
          }](#${anchor}))`
        : `[^${reference.number}]`;
    body = `${before}${replacement}${after}`;
  }
  const notes =
    project.referenceForm === "links"
      ? citedSources(references).map((source) => `- ${bibliographyEntry(source, style)}`)
      : references.map(
          (reference) =>
            `[^${reference.number}]: ${
              reference.source === null
                ? reference.target
                : noteCitation(reference.source, reference.page)
            }`,
        );
  const tail =
    notes.length === 0
      ? ""
      : project.referenceForm === "links"
        ? `\n\n## ${sourcesHeading(project.language)}\n\n${notes.join("\n")}`
        : `\n\n${notes.join("\n")}`;
  const frontmatter = [
    "---",
    "layout: post",
    `title: ${JSON.stringify(project.title)}`,
    `date: ${date}`,
    "---",
  ].join("\n");
  return `${frontmatter}\n\n${body.trim()}${tail}\n`;
};

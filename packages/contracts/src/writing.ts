import * as Schema from "effect/Schema";

import { type GraphNode, linkKey, MARKDOWN_CODE } from "./graph.ts";
import type { Source } from "./source.ts";

/**
 * What a Writing project becomes. A Blog post ends as a Markdown file for the user's site; a
 * University assignment ends as a PDF with a bibliography (not built yet).
 */
export const WritingProjectType = Schema.Literals(["blog-post", "assignment"]);
export type WritingProjectType = typeof WritingProjectType.Type;

/** How the References of a Blog post appear to its readers. */
export const ReferenceForm = Schema.Literals(["footnotes", "links", "side-notes"]);
export type ReferenceForm = typeof ReferenceForm.Type;

/** The citation style of a University assignment. */
export const CitationStyle = Schema.Literals(["chicago", "apa", "harvard"]);
export type CitationStyle = typeof CitationStyle.Type;

/** Where and when a Writing project was last published. */
export const PublicationRecord = Schema.Struct({
  /** The day in the post's file name and frontmatter, `2026-11-13`. */
  date: Schema.String,
  /** Absolute path of the file Glose wrote. */
  file: Schema.String,
});
export type PublicationRecord = typeof PublicationRecord.Type;

const Title = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

/** What the user sets and writes; the type, title and form may change until publishing. */
export const WritingProjectFields = Schema.Struct({
  title: Title,
  type: WritingProjectType,
  /** The language of the prose (a BCP 47 tag such as `en` or `da`), not of the interface. */
  language: Schema.String,
  referenceForm: ReferenceForm,
  citationStyle: CitationStyle,
  /** The prose, as Markdown with References (`[[Note]]{p. 64}`). */
  body: Schema.String,
});
export type WritingProjectFields = typeof WritingProjectFields.Type;

export const WritingProject = Schema.Struct({
  /** The Markdown file's name in the `Writing` folder, without `.md`. */
  id: Schema.String,
  ...WritingProjectFields.fields,
  /** Last change of the file, in epoch milliseconds. */
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
  /** Replace a post file with the same name in the site. */
  replace: Schema.Boolean,
});

export const SetSiteFolder = Schema.Struct({ siteFolder: Schema.String });

/** The AI's review of a Blog post: flags, Notes to cite, and questions. It writes no prose. */
export const WritingReview = Schema.Struct({
  /** Sentences that state a fact from a Source but cite nothing. */
  claims: Schema.Array(Schema.Struct({ excerpt: Schema.String, reason: Schema.String })),
  /** Notes in the Graph that support or argue against a passage. */
  suggestions: Schema.Array(
    Schema.Struct({ excerpt: Schema.String, noteId: Schema.String, reason: Schema.String }),
  ),
  /** Questions about the argument, to ask before publishing. */
  questions: Schema.Array(
    Schema.Struct({ excerpt: Schema.NullOr(Schema.String), question: Schema.String }),
  ),
});
export type WritingReview = typeof WritingReview.Type;

export class WritingProjectNotFound extends Schema.TaggedError<WritingProjectNotFound>()(
  "WritingProjectNotFound",
  { id: Schema.String },
) {}

/** Another Writing project already has this file name, compared without regard to case. */
export class WritingProjectNameTaken extends Schema.TaggedError<WritingProjectNameTaken>()(
  "WritingProjectNameTaken",
  { fileName: Schema.String },
) {}

/** No site folder is chosen on this computer yet. */
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

/** The site already has a post file with this name; nothing was written. */
export class PublicationExists extends Schema.TaggedError<PublicationExists>()(
  "PublicationExists",
  { file: Schema.String },
) {}

/** This type of Writing project cannot be published yet (the PDF of an assignment). */
export class PublicationNotReady extends Schema.TaggedError<PublicationNotReady>()(
  "PublicationNotReady",
  { type: WritingProjectType },
) {}

/** The AI could not review: ChatGPT is not connected (`off`), or the call failed. */
export class WritingReviewUnavailable extends Schema.TaggedError<WritingReviewUnavailable>()(
  "WritingReviewUnavailable",
  { reason: Schema.Literals(["off", "failed"]) },
) {}

/** The folder in the Graph folder that holds Writing projects; the Graph does not read it. */
export const WRITING_FOLDER = "Writing";

/**
 * A Reference in the prose: a wikilink to a Note or a Source, then its Location in braces,
 * `[[Busyness is a proxy for productivity]]{p. 64}`. Obsidian still opens the Note; without
 * braces the Reference takes the Note's own page.
 */
export const REFERENCE = /\[\[([^[\]\n]+?)\]\](?:\{([^{}\n]*)\})?/g;

export interface ReferenceToken {
  /** Offsets of the whole token in the prose. */
  readonly start: number;
  readonly end: number;
  /** The file it names, without heading or alias. */
  readonly target: string;
  /** The Location written in braces, such as "64"; null when the token has none. */
  readonly location: string | null;
}

const LOCATION_PREFIX = /^(?:pp?|s|ss|side|sider|page|pages)\.?\s*/i;

/** "p. 64", "s. 64" and "64" all mean page 64; an empty Location is none. */
export const parseLocation = (raw: string | undefined): string | null => {
  const text = (raw ?? "").trim().replace(LOCATION_PREFIX, "").trim();
  return text === "" ? null : text;
};

/** The token for a Reference, as Glose writes it into the prose. */
export const referenceToken = (target: string, location: string | null): string =>
  location === null ? `[[${target}]]` : `[[${target}]]{p. ${location}}`;

/** Every Reference in the prose, in order; one inside code stays code. */
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

/** What a Citation needs from a Source. */
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
>;

/** Why a Reference cannot be made correct yet; each is a warning, never a block. */
export type ReferenceProblem =
  | "not-found"
  | "no-source"
  | "no-location"
  | "no-year"
  | "no-publisher"
  | "quote-mismatch";

export interface ResolvedReference extends ReferenceToken {
  /** 1 for the first Reference in the prose, and on. */
  readonly number: number;
  /** The Note it points to; null for a Reference to a Source, or to a missing file. */
  readonly noteId: string | null;
  readonly source: CitedSource | null;
  /** The written Location, else the Note's own page. */
  readonly page: string | null;
  /** The quote right before the Reference, if the prose quotes. */
  readonly quote: string | null;
  readonly problems: ReadonlyArray<ReferenceProblem>;
}

const QUOTE = /(?:"([^"\n]+)"|“([^”\n]+)”|„([^“”\n]+)[“”]|«([^»\n]+)»)[\s.,;:!?)]*$/u;

/** Spacing and quote marks differ between editors; the words must not. */
const normalizeQuote = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** The quoted words that end right before a Reference, in the same paragraph. */
export const quoteBefore = (body: string, start: number): string | null => {
  const paragraphStart = body.lastIndexOf("\n\n", start);
  const before = body.slice(paragraphStart < 0 ? 0 : paragraphStart, start);
  const match = QUOTE.exec(before);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? match[4] ?? null;
};

/**
 * Each Reference with what it points to and what keeps it from a correct Citation: a missing
 * file, a Note without a Source, no Location, missing Source data, or a quote the Note does not
 * hold word for word.
 */
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
      if (source.publisher === null) problems.push("no-publisher");
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

/** The year a Citation gives: the edition's, else the first publication's. */
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

/** "n.d." when the Source gives no year; the warning says so before publishing. */
const yearText = (source: CitedSource) => String(citedYear(source) ?? "n.d.");

/**
 * A full note Citation (Chicago notes and bibliography), for footnotes and side notes:
 * `Cal Newport, *Deep Work* (Grand Central Publishing, 2016), 64.` Italic is Markdown.
 */
export const noteCitation = (source: CitedSource, page: string | null): string => {
  const translated = source.translator === null ? "" : `, trans. ${source.translator}`;
  const edition = source.edition === null ? "" : `, ${source.edition} ed.`;
  const facts = [source.publisher, yearText(source)].filter((part) => part !== null).join(", ");
  const location = page === null ? "" : `, ${page}`;
  return `${authorName(source)}, *${source.title}*${translated}${edition} (${facts})${location}.`;
};

/** The short Citation in the text, without brackets: "Newport 2016, 64". */
export const shortCitation = (
  source: CitedSource,
  page: string | null,
  style: CitationStyle,
): string => {
  switch (style) {
    case "apa":
      return `${source.familyName}, ${yearText(source)}${page === null ? "" : `, p. ${page}`}`;
    case "harvard":
      return `${source.familyName} ${yearText(source)}${page === null ? "" : `, p. ${page}`}`;
    case "chicago":
      return `${source.familyName} ${yearText(source)}${page === null ? "" : `, ${page}`}`;
  }
};

/** One entry of the list of Sources at the end. */
export const bibliographyEntry = (source: CitedSource, style: CitationStyle): string => {
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

/** The Sources a text cites, once each, ordered by author as a bibliography is. */
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

/** The URL part of a post's file name: "a-busy-day-is-not-a-productive-day". */
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

/** Where a Bridgetown site keeps its posts, from the site folder. */
export const POSTS_FOLDER = ["src", "_posts"] as const;

/** The post's file name in the site: `2026-11-13-a-busy-day-is-not-a-productive-day.md`. */
export const postFileName = (date: string, title: string): string =>
  `${date}-${postSlug(title)}.md`;

const SOURCES_HEADING: Record<string, string> = { da: "Kilder", en: "Sources" };

/** The words for the list of Sources at the end, in the language of the prose. */
export const sourcesHeading = (language: string): string =>
  SOURCES_HEADING[language.toLowerCase().split("-")[0] ?? "en"] ?? "Sources";

/**
 * A Blog post as a Bridgetown post: YAML frontmatter (`layout`, `title`, `date`), the prose with
 * each Reference turned into a kramdown footnote (`[^1]`) or a short Citation linked to the list
 * of Sources at the end. Side notes are footnotes too; the site's theme sets them in the margin.
 */
export const renderBlogPost = (
  project: Pick<WritingProject, "title" | "body" | "referenceForm" | "language">,
  references: ReadonlyArray<ResolvedReference>,
  date: string,
): string => {
  const style: CitationStyle = "chicago";
  const anchor = sourcesHeading(project.language).toLocaleLowerCase("und");
  let body = project.body;
  for (const reference of [...references].reverse()) {
    const before = body.slice(0, reference.start);
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

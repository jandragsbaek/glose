import * as Schema from "effect/Schema";

/**
 * A Source file (`glose: source`), a Note (`glose: note`, or any other Markdown file in the
 * Graph folder). A file without a `source` field is a Note whose Source is not known yet.
 */
export const GraphNodeKind = Schema.Literals(["source", "note"]);
export type GraphNodeKind = typeof GraphNodeKind.Type;

export const GraphNode = Schema.Struct({
  /** The Markdown file's name without `.md`; a Source node's id is its Source id. */
  id: Schema.String,
  kind: GraphNodeKind,
  /** A Source's title, or a Note's file name. */
  title: Schema.String,
  /** The id of a Note's Source; null for a Source, or a Note that names no Source it has. */
  sourceId: Schema.NullOr(Schema.String),
  /** The Markdown after the frontmatter: a Note's text, or a Source's Free text. */
  body: Schema.String,
  /** The file holds AI text: an AI mark in its frontmatter (`ai: true`) or in its text. */
  aiText: Schema.Boolean,
});
export type GraphNode = typeof GraphNode.Type;

/** A Link from the file that holds the wikilink to the file it names. */
export const GraphLink = Schema.Struct({ from: Schema.String, to: Schema.String });
export type GraphLink = typeof GraphLink.Type;

export const GraphView = Schema.Struct({
  nodes: Schema.Array(GraphNode),
  links: Schema.Array(GraphLink),
});
export type GraphView = typeof GraphView.Type;

/**
 * Wikilinks as Obsidian writes them: `[[name]]`, `[[name|shown words]]`, `[[name#heading]]`,
 * and embeds (`![[name]]`), which count as Links too.
 */
export const WIKILINK = /!?\[\[([^[\]\n]+?)\]\]/g;

/** Fenced and inline code. Code shows as written, so a wikilink inside it is not a Link. */
export const MARKDOWN_CODE = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g;

/** The file a wikilink names, and the words it shows. */
export const parseWikilink = (
  inner: string,
): { readonly target: string; readonly label: string } => {
  const [ref = "", alias] = inner.split("|", 2);
  const target = ref.split(/[#^]/, 1)[0]?.trim() ?? "";
  // A path such as `Folder/Name` names the file `Name`: the Graph folder is flat.
  const name = target.replace(/\.md$/i, "").split("/").pop() ?? "";
  return { target: name, label: alias?.trim() || ref.trim() };
};

/** Two names that differ only in case name the same file on macOS and Windows. */
export const linkKey = (name: string): string => name.normalize("NFC").toLocaleLowerCase("und");

/**
 * The AI mark on AI text, an Obsidian callout: `> [!ai]` on paragraphs, `> [!ai-part]` on all
 * the text of a Part, under its heading. Group 1 is the kind; group 2 a title, which is AI text.
 * The heading stays outside the callout, since Obsidian cannot link to a heading inside one.
 */
export const AI_CALLOUT = /^[ \t]*>[ \t]*\[!ai(-part)?\][-+]?(?:[ \t]+(.*?))?[ \t]*$/i;

/** Whether Markdown holds an AI mark outside code, where a callout is shown as written. */
export const hasAiCallout = (markdown: string): boolean =>
  markdown
    .replace(MARKDOWN_CODE, "")
    .split(/\r?\n/)
    .some((line) => AI_CALLOUT.test(line));

/** No Markdown file in the Graph folder has this name. */
export class NoteNotFound extends Schema.TaggedError<NoteNotFound>()("NoteNotFound", {
  id: Schema.String,
}) {}

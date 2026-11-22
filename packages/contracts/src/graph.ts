import * as Schema from "effect/Schema";

import { Growth } from "./growth.ts";
import { NoteProperty } from "./properties.ts";

export const GraphNodeKind = Schema.Literals(["source", "note", "person"]);
export type GraphNodeKind = typeof GraphNodeKind.Type;

export const PersonName = Schema.Struct({
  family: Schema.String,
  given: Schema.NullOr(Schema.String),
});
export type PersonName = typeof PersonName.Type;

export const GraphNode = Schema.Struct({
  id: Schema.String,
  kind: GraphNodeKind,
  title: Schema.String,
  sourceId: Schema.NullOr(Schema.String),
  body: Schema.String,
  aiText: Schema.Boolean,
  aiTitle: Schema.Boolean,
  page: Schema.NullOr(Schema.String),
  growth: Schema.NullOr(Growth),
  created: Schema.NullOr(Schema.String),
  updated: Schema.NullOr(Schema.String),
  tended: Schema.NullOr(Schema.String),
  properties: Schema.Array(NoteProperty),
  person: Schema.optionalKey(PersonName),
});
export type GraphNode = typeof GraphNode.Type;

export const GraphLink = Schema.Struct({ from: Schema.String, to: Schema.String });
export type GraphLink = typeof GraphLink.Type;

export const GraphPassage = Schema.Struct({ id: Schema.String, source: Schema.String });
export type GraphPassage = typeof GraphPassage.Type;

export const GraphView = Schema.Struct({
  nodes: Schema.Array(GraphNode),
  links: Schema.Array(GraphLink),
  passages: Schema.optionalKey(Schema.Array(GraphPassage)),
});
export type GraphView = typeof GraphView.Type;

export const WIKILINK = /!?\[\[([^[\]\n]+?)\]\]/g;

export const MARKDOWN_CODE = /(`{3,})[\s\S]*?(?:\1`*|$)|(~{3,})[\s\S]*?(?:\2~*|$)|`[^`\n]*`/g;

export const parseWikilink = (
  inner: string,
): { readonly target: string; readonly label: string } => {
  const [ref = "", alias] = inner.split("|", 2);
  const target = ref.split(/[#^]/, 1)[0]?.trim() ?? "";
  const name = target.replace(/\.md$/i, "").split("/").pop() ?? "";
  return { target: name, label: alias?.trim() || ref.trim() };
};

export const linkKey = (name: string): string => name.normalize("NFC").toLocaleLowerCase("und");

export const AI_CALLOUT = /^[ \t]*>[ \t]*\[!ai(-part)?\][-+]?(?:[ \t]+(.*?))?[ \t]*$/i;

export const hasAiCallout = (markdown: string): boolean =>
  markdown
    .replace(MARKDOWN_CODE, "")
    .split(/\r?\n/)
    .some((line) => AI_CALLOUT.test(line));

export const textParagraphs = (text: string): ReadonlyArray<string> =>
  text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

export const aiCallout = (text: string, part = false): string =>
  [
    part ? "> [!ai-part]" : "> [!ai]",
    ...text
      .replace(/\r\n?/g, "\n")
      .replace(/^(?:[ \t]*\n)+/, "")
      .trimEnd()
      .split("\n")
      .map((line) => (line.trim() === "" ? ">" : `> ${line}`)),
  ].join("\n");

export const SaveNote = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  aiTitle: Schema.Boolean,
  page: Schema.NullOr(Schema.String),
  body: Schema.String,
  aiNote: Schema.Boolean,
});
export type SaveNote = typeof SaveNote.Type;

export class NoteNotFound extends Schema.TaggedError<NoteNotFound>()("NoteNotFound", {
  id: Schema.String,
}) {}

export class NoteNameTaken extends Schema.TaggedError<NoteNameTaken>()("NoteNameTaken", {
  fileName: Schema.String,
}) {}

export const CreatePerson = PersonName;
export type CreatePerson = typeof CreatePerson.Type;

export const personFileTitle = ({ family, given }: PersonName): string =>
  [given ?? "", family]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

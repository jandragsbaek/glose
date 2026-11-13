import { AI_CALLOUT, aiCallout } from "@glose/contracts";

import { type AiScope, parseNoteText } from "./noteText.ts";

/**
 * A Note's text in the runs the rewrite shows side by side: the user's own Markdown, as
 * written, and each piece of AI text with its mark.
 */
export type Segment =
  | { readonly kind: "own"; readonly at: number; readonly markdown: string }
  | {
      readonly kind: "ai";
      readonly at: number;
      readonly scope: AiScope;
      /** The Markdown as written, mark and all; saved again as it is when nothing changed. */
      readonly markdown: string;
      /** The AI's words without the mark: a callout's title and its text. */
      readonly text: string;
      /** A Part's heading, which the AI wrote too. */
      readonly heading: { readonly level: number; readonly text: string } | null;
    };

const QUOTE_MARKER = /^[ \t]*>[ \t]?/;

/** Markdown without blank lines around it; the indent of its first line stays, as it means something. */
const trimLines = (markdown: string) => markdown.replace(/^(?:[ \t]*\r?\n)+/, "").trimEnd();
const HEADING_LINE = /^[ \t]{0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;

/** The AI's words in a callout: its title, then its lines without their `>`. */
const unquote = (lines: ReadonlyArray<string>) => {
  const [header = "", ...rest] = lines;
  const title = AI_CALLOUT.exec(header)?.[2] ?? "";
  const text = rest.map((line) => line.replace(QUOTE_MARKER, "")).join("\n");
  return [title, text]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join("\n\n");
};

const aiSegment = (markdown: string, at: number, scope: AiScope): Segment => {
  const lines = markdown.split(/\r?\n/);
  if (scope !== "part")
    return { kind: "ai", at, scope, markdown, text: unquote(lines), heading: null };
  // A Part's heading stands above its callout.
  const match = HEADING_LINE.exec(lines.find((line) => HEADING_LINE.test(line)) ?? "");
  return {
    kind: "ai",
    at,
    scope,
    markdown,
    text: unquote(lines.slice(lines.findIndex((line) => AI_CALLOUT.test(line)))),
    heading: match ? { level: match[1]?.length ?? 2, text: match[2] ?? "" } : null,
  };
};

/**
 * The runs of a Note's text, in order. A Note marked as a whole (`ai: true` and no callout) is
 * one run of AI text; otherwise every `[!ai]` callout and every `[!ai-part]` Part with its
 * heading is a run of its own, and the user's Markdown between them is kept as written.
 */
export const noteSegments = (body: string, wholeNoteAi: boolean): ReadonlyArray<Segment> => {
  const blocks = parseNoteText(body, wholeNoteAi);
  if (blocks.length === 1 && blocks[0]?.kind === "ai" && blocks[0].scope === "note") {
    const markdown = body.trim();
    return [{ kind: "ai", at: 0, scope: "note", markdown, text: markdown, heading: null }];
  }
  const segments: Array<Segment> = [];
  let ownAt: number | null = null;
  const flushOwn = (end: number) => {
    if (ownAt === null) return;
    const markdown = trimLines(body.slice(ownAt, end));
    if (markdown !== "") segments.push({ kind: "own", at: ownAt, markdown });
    ownAt = null;
  };
  blocks.forEach((block, index) => {
    const end = blocks[index + 1]?.at ?? body.length;
    if (block.kind !== "ai") {
      // From the start of its line, so an indent before the first word stays.
      ownAt ??= body.lastIndexOf("\n", block.at - 1) + 1;
      return;
    }
    flushOwn(block.at);
    segments.push(aiSegment(body.slice(block.at, end).trim(), block.at, block.scope));
  });
  flushOwn(body.length);
  return segments;
};

/** What the user did with one run. */
export interface SegmentEdit {
  /** The user's own words: for their own run, its Markdown; for AI text, what replaces it. */
  readonly yours: string;
  /** The heading of a Part the user wrote in place of an AI-written one. */
  readonly yourHeading: string;
  /** AI text the user corrected; still the AI's words, so it keeps its mark. */
  readonly corrected: string | null;
}

export const startEdit = (segment: Segment): SegmentEdit => ({
  yours: segment.kind === "own" ? segment.markdown : "",
  yourHeading: "",
  corrected: null,
});

/** AI text the user replaced with their own words. */
export const isRewritten = (edit: SegmentEdit): boolean => edit.yours.trim() !== "";

const headingLine = (level: number, text: string) => `${"#".repeat(level)} ${text.trim()}`;

/** The run as it goes back into the file. */
const composeSegment = (segment: Segment, edit: SegmentEdit): string => {
  if (segment.kind === "own") return trimLines(edit.yours);
  const yours = edit.yours.trim();
  if (yours !== "") {
    // A Part keeps its heading, so its text does not run into the Part above; the user's
    // heading when they wrote one, else the one it had.
    const heading = edit.yourHeading.trim() || segment.heading?.text || "";
    return segment.scope === "part" && heading !== ""
      ? `${headingLine(segment.heading?.level ?? 2, heading)}\n\n${yours}`
      : yours;
  }
  if (edit.corrected === null) return segment.markdown;
  const corrected = edit.corrected.trim();
  if (corrected === "") return "";
  switch (segment.scope) {
    case "paragraphs":
      return aiCallout(corrected);
    case "part":
      return [
        ...(segment.heading === null
          ? []
          : [headingLine(segment.heading.level, segment.heading.text)]),
        aiCallout(corrected, true),
      ].join("\n");
    case "note":
      return corrected;
  }
};

/**
 * The Note's text after the rewrite. `aiNote` is true while the AI's text of a Note marked as
 * a whole stays, since that mark lives in the frontmatter and not in the text.
 */
export const composeBody = (
  segments: ReadonlyArray<Segment>,
  edits: ReadonlyArray<SegmentEdit>,
): { readonly body: string; readonly aiNote: boolean } => {
  const parts = segments.map((segment, index) =>
    composeSegment(segment, edits[index] ?? startEdit(segment)),
  );
  const aiNote = segments.some(
    (segment, index) =>
      segment.kind === "ai" &&
      segment.scope === "note" &&
      !isRewritten(edits[index] ?? startEdit(segment)) &&
      (parts[index] ?? "") !== "",
  );
  return { body: parts.filter((part) => part !== "").join("\n\n"), aiNote };
};

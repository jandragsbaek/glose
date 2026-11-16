import { AI_CALLOUT, aiCallout } from "@glose/contracts";

import { type AiScope, parseNoteText } from "./noteText.ts";

export type Segment =
  | { readonly kind: "own"; readonly at: number; readonly markdown: string }
  | {
      readonly kind: "ai";
      readonly at: number;
      readonly scope: AiScope;
      readonly markdown: string;
      readonly text: string;
      readonly heading: { readonly level: number; readonly text: string } | null;
    };

const QUOTE_MARKER = /^[ \t]*>[ \t]?/;

const trimLines = (markdown: string) => markdown.replace(/^(?:[ \t]*\r?\n)+/, "").trimEnd();
const HEADING_LINE = /^[ \t]{0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;

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
      ownAt ??= body.lastIndexOf("\n", block.at - 1) + 1;
      return;
    }
    flushOwn(block.at);
    segments.push(aiSegment(body.slice(block.at, end).trim(), block.at, block.scope));
  });
  flushOwn(body.length);
  return segments;
};

export interface SegmentEdit {
  readonly yours: string;
  readonly yourHeading: string;
  readonly corrected: string | null;
}

export const startEdit = (segment: Segment): SegmentEdit => ({
  yours: segment.kind === "own" ? segment.markdown : "",
  yourHeading: "",
  corrected: null,
});

export const isRewritten = (edit: SegmentEdit): boolean => edit.yours.trim() !== "";

const headingLine = (level: number, text: string) => `${"#".repeat(level)} ${text.trim()}`;

const composeSegment = (segment: Segment, edit: SegmentEdit): string => {
  if (segment.kind === "own") return trimLines(edit.yours);
  const yours = edit.yours.trim();
  if (yours !== "") {
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

import {
  findInArticle,
  type Language,
  type BookPassage,
  linkKey,
  plainNotes,
  plainStamps,
  type Point,
  type PointLink,
  type SessionEntry,
  youtubeId,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../vault/Graph.ts";
import type * as Passages from "../vault/Passages.ts";
import type * as Sources from "../vault/Sources.ts";
import type { AgentTool, InputItem } from "./agent.ts";
import { articleOf, readArticleTool } from "./articleTools.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";
import { passageWith, readPassagesTool } from "./passageTools.ts";
import { findInNotes, findQuote } from "./quotes.ts";
import { describeSource, listSourcesTool } from "./sourceTools.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

export const MAX_POINTS = 8;

export const MAX_LINKS = 5;

export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run the Extraction step of the Reading Stage for one Source (usually a book).

Goal: help the user pull out the core points of the Source. Each Point becomes a small Note in the user's Graph: one idea, its title a full sentence that states the claim (such as "Spaced practice beats massed practice"), its text, linked to the Notes it relates to. The goal is that the user rewrites all of its text in their own words.

How to work:
- Start with read_source: the Source's bibliographic data and the user's Free text, what they wrote freely about it. When its readingStart is "probe" or "catch-up", the user began with a Probe: call read_probe, which gives every question, the user's Reasoning and answers, how each was judged, and what the Probe found per topic. Propose Points first on what the Probe found: the topics the user knows, and the gaps it taught. Then use search_graph a few times, with different words for the Source's main ideas, and read_note on the Notes that matter, so you know what the user's Graph already holds. Call list_sources when other Sources may matter.
- Propose Points only through propose_points, a few at a time (at most ${MAX_POINTS}), the ones that matter most first. list_points shows the Points already in the Session; do not propose one again.
- An Article or a Course lesson (read_source gives its kind) brings its text: call read_article. Read it all; propose the Source's core points from the text, and first the points the user's Passages mark (what they highlighted while reading, with their own words on it). Use origin "article" for a Point the text states: give the quote, the exact words of the text, copied character for character, and Glose sets its Location from the paragraph. The text is the user's own copy, so do not use origin "ai" for what the text says.
- A book may have Passages: words the user copied from their own copy while reading, each with its page and their own words on it. Call read_passages. A Passage holds the author's words; the user's Notes hold theirs. Propose Points first from the Passages no Note uses yet (usedBy is empty); for a Passage a Note already uses, propose a Point only for a claim that Note does not make, and name that Note in repeats when it does. Use origin "passage" for a Point that rests on a Passage: give the quote, the Passage's exact words, copied character for character, and Glose cites the Passage. A Point the user makes from their Passages has origin "passage" too; when they ask for a draft of it, the draft shows beside their own words, not in place of them.
- A Video (kind "video", a talk or another video on YouTube) brings no text, and you have not seen it: Glose holds no transcript. Its Free text is the user's watch notes, where [12:34] marks the time in the video that the words after it are about. Propose its Points from the notes, with origin "free-text", the notes' exact words as the quote (words after one timestamp, never across two), and that timestamp in timestamp (such as "12:34"); Glose checks the words are there and sets the Point's Location to that time. Use origin "ai" only for what you truly know of the talk, and say so.
- Say where each Point comes from. Origin "free-text" when the user's Free text holds it: give the quote, the exact words of the Free text, copied character for character. Origin "probe" when the user's own Reasoning or answers in the Probe hold it: give the quote, their exact words, copied character for character. Origin "ai" when it comes from your knowledge of the Source and not from the Free text. Never present your knowledge as something the user wrote. If you are unsure what the Source says, say so.
- Use the Graph. When a Note already says the Point, name it in repeats. When a Note disagrees with the Point or pulls against it, name it in pulls_against_note and say how. Propose links to the Notes the Point's Note should link to, each with a short reason. Name only Notes that search_graph or read_note showed you, by their exact names.
- Give each Point a draft of its Note: one to three short paragraphs that state the claim, explain it and stay true to the Source. The user's form starts with it. Glose marks it as AI text, edited or not, until the user says they rewrote it in their own words.
- Write Points and drafts in the language of the Free text.
- The user does the thinking. After you propose, write a short message: what the Points cover and which come from your own knowledge. End each message with one question that makes the user restate, test or sharpen a Point in their own words. Do not lecture, and do not repeat the Points' words in your message.
- Refer to a Point by its number in square brackets, such as [3]. Refer to a Note as a wikilink, such as [[Note name]].
- A user's message may be about one Point; it then starts with "(About point N: ...)". Answer about that Point.
- When the user asks for a new draft of a Point, write it with draft_note. It replaces the text in the user's form. Never call draft_note when the user did not ask for a draft.
- When the user writes a Point as a Note, you hear what they wrote. Comment only when something is wrong, missing or worth linking; propose_links adds Links to a kept Point.
- Write your messages in the language of the user's messages, or the interface language named in the first message. Write plain text, short enough to read in a narrow column.`;

const KICKOFF = "Start the Extraction now.";

export const kickoff = (language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `${KICKOFF} The user's interface language is ${LANGUAGE_NAMES[language]}.`,
});

export const isKickoff = (item: InputItem): boolean =>
  "role" in item &&
  item.role === "developer" &&
  typeof item.content === "string" &&
  item.content.startsWith(KICKOFF);

export const aboutMessage = (point: Point, text: string): string =>
  `(About point ${numberOf(point)}: "${point.title}")\n\n${text}`;

export const decisionsMessage = (decisions: ReadonlyArray<string>): InputItem => ({
  type: "message",
  role: "developer",
  content: `Since your last answer, the user decided on Points:\n${decisions.map((line) => `- ${line}`).join("\n")}`,
});

export const numberOf = (point: Pick<Point, "id">): number => Number(point.id.slice(1));

export type ProposedPoint = Omit<Point, "id" | "state" | "note">;

const NullableString = Schema.NullOr(Schema.String);
const ProposeArguments = Schema.Struct({
  points: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      origin: Schema.Literals(["free-text", "probe", "article", "passage", "ai"]),
      quote: NullableString,
      repeats: NullableString,
      pulls_against_note: NullableString,
      pulls_against_why: NullableString,
      links: Schema.Array(Schema.Struct({ note: Schema.String, why: Schema.String })),
      draft: Schema.String,
      timestamp: Schema.optionalKey(NullableString),
    }),
  ),
});
const LinksArguments = Schema.Struct({
  point: Schema.Number,
  links: Schema.Array(Schema.Struct({ note: Schema.String, why: Schema.String })),
});
const DraftArguments = Schema.Struct({ point: Schema.Number, text: Schema.String });
const decodePropose = Schema.decodeUnknownOption(ProposeArguments);
const decodeLinks = Schema.decodeUnknownOption(LinksArguments);
const decodeDraft = Schema.decodeUnknownOption(DraftArguments);

const LINK_ITEMS = {
  type: "array",
  items: {
    type: "object",
    properties: {
      note: { type: "string", description: "The exact name of a Note in the Graph." },
      why: { type: "string", description: "Why the two Notes belong together, in a sentence." },
    },
    required: ["note", "why"],
    additionalProperties: false,
  },
} as const;

const nullable = (description: string) => ({ type: ["string", "null"], description });

export interface Context {
  readonly sources: Sources.Sources["Service"];
  readonly graph: Graph.Graph["Service"];
  readonly passages: Passages.Passages["Service"];
  readonly source: string;
  readonly points: Effect.Effect<ReadonlyArray<Point>>;
  readonly propose: (points: ReadonlyArray<ProposedPoint>) => Effect.Effect<ReadonlyArray<number>>;
  readonly addLinks: (point: number, links: ReadonlyArray<PointLink>) => Effect.Effect<boolean>;
  readonly setDraft: (point: number, text: string) => Effect.Effect<boolean>;
  readonly probe: Effect.Effect<ReadonlyArray<SessionEntry> | null>;
  readonly probeSummary: (entries: ReadonlyArray<SessionEntry>) => unknown;
  readonly probeWords: (entries: ReadonlyArray<SessionEntry>) => string;
}

export const tools = ({
  sources,
  graph,
  passages,
  source,
  points,
  propose,
  addLinks,
  setDraft,
  probe,
  probeSummary,
  probeWords,
}: Context): AgentTool[] => {
  const resolver = graph.read.pipe(
    Effect.map((view) => {
      const byKey = new Map(view.nodes.map((node) => [linkKey(node.id), node.id]));
      return (name: string | null) => (name === null ? null : (byKey.get(linkKey(name)) ?? null));
    }),
    Effect.orElseSucceed(
      () =>
        (_name: string | null): string | null =>
          null,
    ),
  );

  const checkedLinks = (
    resolve: (name: string | null) => string | null,
    links: ReadonlyArray<{ readonly note: string; readonly why: string }>,
  ) => {
    const seen = new Set<string>();
    return links.flatMap(({ note, why }) => {
      const name = resolve(note);
      if (name === null || seen.has(linkKey(name))) return [];
      seen.add(linkKey(name));
      return [{ note: name, why: why.trim(), added: false }];
    });
  };

  return [
    {
      name: "read_source",
      entry: "read-source",
      description:
        "Read the Source of this Session: its bibliographic data and the user's Free text about it.",
      parameters: NO_ARGUMENTS,
      run: () =>
        sources.get(source).pipe(
          Effect.map((found) => ({
            ...describeSource(found),
            freeText:
              found.kind === "video"
                ? plainStamps(found.freeText, youtubeId(found.url ?? ""))
                : found.freeText,
          })),
          Effect.orElseSucceed(() => ({ error: "The Source could not be read." })),
        ),
    },
    listSourcesTool(sources),
    searchGraphTool(graph),
    readNoteTool(graph),
    readArticleTool(sources, source),
    {
      name: "read_probe",
      entry: "read-probe",
      description:
        "Read the Probe of this Source: each question, the user's Reasoning and answer, how each was judged, and what the Probe found per topic.",
      parameters: NO_ARGUMENTS,
      run: () =>
        probe.pipe(
          Effect.map((entries) =>
            entries === null ? { error: "This Source has no Probe yet." } : probeSummary(entries),
          ),
        ),
    },
    readPassagesTool(passages, source),
    {
      name: "list_points",
      entry: null,
      description:
        "List the Points in this Session: number, title, where it comes from, and what the user did with it (open, kept, written as a Note, dropped).",
      parameters: NO_ARGUMENTS,
      run: () =>
        points.pipe(
          Effect.map((all) => ({
            points: all.map((point) => ({
              number: numberOf(point),
              title: point.title,
              origin: point.origin,
              state: point.state,
              note: point.note,
              hasDraft: point.draft !== null,
            })),
          })),
        ),
    },
    {
      name: "propose_points",
      entry: null,
      description: `Show proposed Points to the user, each with a draft of its Note. The user keeps, edits or drops each one, and writes the kept ones as Notes from your draft or in their own words. At most ${MAX_POINTS} per call.`,
      parameters: {
        type: "object",
        properties: {
          points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The claim, as a full sentence: the Note's title.",
                },
                origin: {
                  type: "string",
                  enum: ["free-text", "probe", "article", "passage", "ai"],
                },
                quote: nullable(
                  "The exact words the Point comes from: the user's in the Free text or in their Reasoning or answers in the Probe, the text's own words for origin article, or a Passage's words for origin passage.",
                ),
                repeats: nullable("A Note that already says this Point."),
                pulls_against_note: nullable("A Note that disagrees with this Point."),
                pulls_against_why: nullable("How that Note and this Point disagree."),
                links: LINK_ITEMS,
                draft: {
                  type: "string",
                  description:
                    "A draft of the Note's text: one to three short paragraphs, plain text. Glose marks it as AI text.",
                },
                timestamp: nullable(
                  "For a Video: the timestamp the quoted words come after in the watch notes, such as 12:34. Null for other Sources.",
                ),
              },
              required: [
                "title",
                "origin",
                "quote",
                "repeats",
                "pulls_against_note",
                "pulls_against_why",
                "links",
                "draft",
                "timestamp",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["points"],
        additionalProperties: false,
      },
      run: Effect.fn("Extraction.proposePoints")(function* (args: unknown) {
        const asked = Option.getOrNull(decodePropose(args))?.points ?? [];
        const resolve = yield* resolver;
        const { freeText, notes } = yield* sources.get(source).pipe(
          Effect.map((found) => {
            if (found.kind !== "video") return { freeText: found.freeText, notes: null };
            const plain = plainNotes(found.freeText, youtubeId(found.url ?? ""));
            return { freeText: plain.text, notes: plain };
          }),
          Effect.orElseSucceed(() => ({ freeText: "", notes: null })),
        );
        const probeEntries = yield* probe;
        const probeText = probeEntries === null ? "" : probeWords(probeEntries);
        const article = yield* articleOf(sources, source);
        const kept = yield* passages
          .list(source)
          .pipe(Effect.orElseSucceed((): ReadonlyArray<BookPassage> => []));
        const existing = new Set((yield* points).map((point) => linkKey(point.title)));
        const proposed: Array<ProposedPoint> = [];
        const unquoted: Array<boolean> = [];
        for (const point of asked) {
          const title = point.title.trim();
          if (title === "" || existing.has(linkKey(title))) continue;
          existing.add(linkKey(title));
          const against = resolve(point.pulls_against_note);
          const inArticle =
            point.origin === "article" && point.quote !== null && article !== null
              ? findInArticle(article, point.quote)
              : null;
          const inPassage =
            point.origin === "passage" && point.quote !== null
              ? passageWith(kept, point.quote)
              : null;
          const inNotes =
            notes !== null && point.origin === "free-text" && point.quote !== null
              ? findInNotes(notes, point.quote, point.timestamp ?? null)
              : null;
          const quote =
            point.quote === null
              ? null
              : point.origin === "article"
                ? (inArticle?.text.replace(/\s+/g, " ") ?? null)
                : point.origin === "passage"
                  ? (inPassage?.text ?? null)
                  : notes !== null && point.origin === "free-text"
                    ? (inNotes?.text ?? null)
                    : findQuote(point.origin === "probe" ? probeText : freeText, point.quote);
          unquoted.push(point.quote !== null && quote === null);
          proposed.push({
            title,
            origin:
              (point.origin === "article" && article === null) ||
              (point.origin === "passage" && inPassage === null)
                ? "ai"
                : point.origin,
            quote,
            page:
              inArticle !== null
                ? `¶ ${inArticle.n}`
                : inPassage !== null
                  ? inPassage.passage.page
                  : (inNotes?.page ?? null),
            ...(inPassage === null
              ? {}
              : {
                  aiTitle: true,
                  passages: [
                    {
                      id: inPassage.passage.id,
                      page: inPassage.passage.page,
                      words: inPassage.passage.words,
                    },
                  ],
                }),
            repeats: resolve(point.repeats),
            pullsAgainst:
              against === null
                ? null
                : { note: against, why: (point.pulls_against_why ?? "").trim() },
            links: checkedLinks(resolve, point.links).slice(0, MAX_LINKS),
            draft: point.draft.trim() === "" ? null : point.draft.trim(),
          });
        }
        if (proposed.length === 0) {
          return { error: "Give at least one new Point with a title." };
        }
        const shown = proposed.slice(0, MAX_POINTS);
        const numbers = yield* propose(shown);
        const dropped = shown.flatMap((_, index) =>
          unquoted[index] === true
            ? [
                `The quote for point ${numbers[index]} is not word for word in its origin, so it is not shown.`,
              ]
            : [],
        );
        return {
          shown: numbers,
          ...(proposed.length > shown.length
            ? { skipped: `Only the first ${MAX_POINTS} were shown.` }
            : {}),
          ...(dropped.length > 0 ? { notes: dropped } : {}),
          next: "The user now decides on each Point. You will hear what they kept, wrote and dropped.",
        };
      }),
    },
    {
      name: "propose_links",
      entry: null,
      description: `Propose more Links for a Point the user kept or has open, each to a Note that exists, with a reason. At most ${MAX_LINKS} per Point.`,
      parameters: {
        type: "object",
        properties: {
          point: { type: "number", description: "The Point's number." },
          links: LINK_ITEMS,
        },
        required: ["point", "links"],
        additionalProperties: false,
      },
      run: Effect.fn("Extraction.proposeLinks")(function* (args: unknown) {
        const asked = Option.getOrNull(decodeLinks(args));
        if (asked === null) return { error: "Give a Point's number and Links." };
        const links = checkedLinks(yield* resolver, asked.links);
        if (links.length === 0) return { error: "None of these names a Note in the Graph." };
        const added = yield* addLinks(asked.point, links);
        return added
          ? { shown: links.map((link) => link.note) }
          : { error: `Point ${asked.point} is not open or kept.` };
      }),
    },
    {
      name: "draft_note",
      entry: null,
      description:
        "Give a Point a new draft of its Note text, only when the user asked for one. It replaces the text in the user's form, marked as AI text.",
      parameters: {
        type: "object",
        properties: {
          point: { type: "number", description: "The Point's number." },
          text: { type: "string", description: "One to three short paragraphs, plain text." },
        },
        required: ["point", "text"],
        additionalProperties: false,
      },
      run: Effect.fn("Extraction.draftNote")(function* (args: unknown) {
        const asked = Option.getOrNull(decodeDraft(args));
        if (asked === null || asked.text.trim() === "") {
          return { error: "Give a Point's number and the draft." };
        }
        const set = yield* setDraft(asked.point, asked.text.trim());
        return set
          ? { shown: true, next: "The user edits the draft or rewrites it in their own words." }
          : { error: `Point ${asked.point} is not open or kept.` };
      }),
    },
  ];
};

import {
  type Language,
  linkKey,
  type Point,
  type PointLink,
  type SessionEntry,
  type Source,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../graph/Graph.ts";
import type * as Sources from "../graph/Sources.ts";
import type { AgentTool, InputItem } from "./agent.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

/** Points in one call; more at once is more than a user can judge with care. */
export const MAX_POINTS = 8;

/** Proposed Links of one Point. */
export const MAX_LINKS = 5;

/** The rules of an Extraction Session. They follow docs/ideas.md: the user does the thinking. */
export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run the Extraction step of the Reading Stage for one Source (usually a book).

Goal: help the user pull out the core points of the Source. Each Point becomes a small Note in the user's Graph: one idea, its title a full sentence that states the claim (such as "Spaced practice beats massed practice"), its text, linked to the Notes it relates to. The goal is that the user rewrites all of its text in their own words.

How to work:
- Start with read_source: the Source's bibliographic data and the user's Free text, what they wrote freely about it. When its readingStart is "probe" or "catch-up", the user began with a Probe: call read_probe, which gives every question, the user's Reasoning and answers, how each was judged, and what the Probe found per topic. Propose Points first on what the Probe found: the topics the user knows, and the gaps it taught. Then use search_graph a few times, with different words for the Source's main ideas, and read_note on the Notes that matter, so you know what the user's Graph already holds. Call list_sources when other Sources may matter.
- Propose Points only through propose_points, a few at a time (at most ${MAX_POINTS}), the ones that matter most first. list_points shows the Points already in the Session; do not propose one again.
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

/** The hidden first message that starts the Session. */
export const kickoff = (language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `Start the Extraction now. The user's interface language is ${LANGUAGE_NAMES[language]}.`,
});

/** A user's message about one Point, as the model reads it. */
export const aboutMessage = (point: Point, text: string): string =>
  `(About point ${numberOf(point)}: "${point.title}")\n\n${text}`;

/** What the user did with Points since the AI last took a turn. */
export const decisionsMessage = (decisions: ReadonlyArray<string>): InputItem => ({
  type: "message",
  role: "developer",
  content: `Since your last answer, the user decided on Points:\n${decisions.map((line) => `- ${line}`).join("\n")}`,
});

/** The number the user sees: `p3` is point 3. */
export const numberOf = (point: Pick<Point, "id">): number => Number(point.id.slice(1));

const describe = (source: Source) => ({
  id: source.id,
  author: { family: source.familyName, given: source.givenName },
  title: source.title,
  firstPublished: source.firstPublished,
  edition: source.edition,
  editionYear: source.editionYear,
  publisher: source.publisher,
  translator: source.translator,
  readingStep: source.readingStep,
  readingStart: source.readingStart,
});

/** A Point as the AI proposes it, before Glose checks its quote and the Notes it names. */
export type ProposedPoint = Omit<Point, "id" | "state" | "note" | "page">;

const NullableString = Schema.NullOr(Schema.String);
const ProposeArguments = Schema.Struct({
  points: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      origin: Schema.Literals(["free-text", "probe", "ai"]),
      quote: NullableString,
      repeats: NullableString,
      pulls_against_note: NullableString,
      pulls_against_why: NullableString,
      links: Schema.Array(Schema.Struct({ note: Schema.String, why: Schema.String })),
      draft: Schema.String,
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

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The quote as the Free text has it, found without regard to case, spacing or the quotation
 * marks around it; null when the Free text does not hold those words. A quote must match the
 * user's words exactly, so the AI's paraphrase never passes for them.
 */
export const findQuote = (freeText: string, quote: string): string | null => {
  const words = quote
    .trim()
    .replace(/^["'“”‘’«»„…\s]+|["'“”‘’«»„…\s]+$/g, "")
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return null;
  const match = new RegExp(words.map(escape).join("\\s+"), "iu").exec(freeText);
  return match === null ? null : match[0];
};

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
  /** The Source the Session extracts from. */
  readonly source: string;
  /** The Points in the Session now. */
  readonly points: Effect.Effect<ReadonlyArray<Point>>;
  /** Shows Points to the user; answers with their numbers. */
  readonly propose: (points: ReadonlyArray<ProposedPoint>) => Effect.Effect<ReadonlyArray<number>>;
  /** Adds proposed Links to a Point; false when it has none of that number to add to. */
  readonly addLinks: (point: number, links: ReadonlyArray<PointLink>) => Effect.Effect<boolean>;
  /** Gives a Point the AI's draft of its Note text; false when there is no such Point. */
  readonly setDraft: (point: number, text: string) => Effect.Effect<boolean>;
  /** The entries of the Source's Probe, or null when it has none. */
  readonly probe: Effect.Effect<ReadonlyArray<SessionEntry> | null>;
  /** What the Probe found, for the model; and the user's own words in it, to check quotes. */
  readonly probeSummary: (entries: ReadonlyArray<SessionEntry>) => unknown;
  readonly probeWords: (entries: ReadonlyArray<SessionEntry>) => string;
}

export const tools = ({
  sources,
  graph,
  source,
  points,
  propose,
  addLinks,
  setDraft,
  probe,
  probeSummary,
  probeWords,
}: Context): AgentTool[] => {
  /** The Graph's name for a Note the AI named, or null when there is no such file. */
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
          Effect.map((found) => ({ ...describe(found), freeText: found.freeText })),
          Effect.orElseSucceed(() => ({ error: "The Source could not be read." })),
        ),
    },
    {
      name: "list_sources",
      entry: "list-sources",
      description:
        "List every Source in the user's Graph, with bibliographic data and reading step, without Free text.",
      parameters: NO_ARGUMENTS,
      run: () =>
        sources.list.pipe(
          Effect.map((all) => ({ sources: all.map(describe) })),
          Effect.orElseSucceed(() => ({ error: "The Sources could not be read." })),
        ),
    },
    searchGraphTool(graph),
    readNoteTool(graph),
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
                origin: { type: "string", enum: ["free-text", "probe", "ai"] },
                quote: nullable(
                  "The user's exact words the Point comes from: in the Free text, or in their Reasoning or answers in the Probe.",
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
        const freeText = yield* sources.get(source).pipe(
          Effect.map((found) => found.freeText),
          Effect.orElseSucceed(() => ""),
        );
        const probeEntries = yield* probe;
        const probeText = probeEntries === null ? "" : probeWords(probeEntries);
        const existing = new Set((yield* points).map((point) => linkKey(point.title)));
        const proposed: Array<ProposedPoint> = [];
        /** Points whose quote is not in the Free text, by their place in `proposed`. */
        const unquoted: Array<boolean> = [];
        for (const point of asked) {
          const title = point.title.trim();
          if (title === "" || existing.has(linkKey(title))) continue;
          existing.add(linkKey(title));
          const against = resolve(point.pulls_against_note);
          const quote =
            point.quote === null
              ? null
              : findQuote(point.origin === "probe" ? probeText : freeText, point.quote);
          unquoted.push(point.quote !== null && quote === null);
          proposed.push({
            title,
            origin: point.origin,
            quote,
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
                `The quote for point ${numbers[index]} is not in the user's words, so it is not shown.`,
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

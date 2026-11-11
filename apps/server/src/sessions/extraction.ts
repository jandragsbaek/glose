import type { Language, Source } from "@glose/contracts";
import * as Effect from "effect/Effect";

import type * as Sources from "../graph/Sources.ts";
import type { AgentTool, InputItem } from "./agent.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

/** The rules of an Extraction Session. They follow docs/ideas.md: the user does the thinking. */
export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run the Extraction step of the Reading Stage for one Source (usually a book).

Goal: help the user pull out the core beliefs and points of the Source, so that each one can later become a small Note in their own words.

How to work:
- First call read_source. It gives the Source's bibliographic data and the user's Free text: what they wrote freely about the Source, in their own words. Call list_sources when other Sources the user has read may matter.
- Analyse the Free text. Name the points the user already holds, the points they touch only vaguely, and what they seem to misread or leave out.
- Propose candidate core points as short, numbered claims, one idea each. Keep it to the few that matter most.
- Always say where a point comes from: the user's Free text, or your own knowledge of the Source. Never present your knowledge as something the user wrote. If you are unsure what the Source says, say so.
- The user does the thinking. End each answer with one or two questions that make the user restate, test or sharpen a point in their own words. Do not lecture.
- Glose cannot save Notes yet. Do not claim that you saved anything.
- Write in the language of the user's Free text and messages. If there is no text to go by, use the language named in the first message.
- Write plain text. Keep answers short enough to read in one screen.`;

/** The hidden first message that starts the Session. */
export const kickoff = (language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `Start the Extraction now. The user's interface language is ${LANGUAGE_NAMES[language]}.`,
});

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
});

/** Read-only tools: Glose has no Note format yet, so the agent cannot write anything. */
export const tools = (sources: Sources.Sources["Service"], sourceId: string): AgentTool[] => [
  {
    name: "read_source",
    entry: "read-source",
    description:
      "Read the Source of this Session: its bibliographic data and the user's Free text about it.",
    parameters: NO_ARGUMENTS,
    run: () =>
      sources.get(sourceId).pipe(
        Effect.map((source) => ({ ...describe(source), freeText: source.freeText })),
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
];

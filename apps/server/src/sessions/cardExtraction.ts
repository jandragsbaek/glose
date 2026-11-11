import { type CardText, type Language, linkKey } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Cards from "../cards/Cards.ts";
import type * as Graph from "../graph/Graph.ts";
import type { AgentTool, InputItem } from "./agent.ts";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

/** Proposed Cards in one call; more at once is more than a user can judge with care. */
export const MAX_PROPOSALS = 10;

/** The rules of a Card Extraction Session. The Review never leans on the AI; this step may. */
export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run Card Extraction: you propose Cards made from one Note, for spaced-repetition Review (FSRS, as in Anki).

A Card is one question and its answer. The user keeps, edits or drops each Card you propose; only kept Cards are saved. Kept Cards stay marked as AI text until the user rewrites them.

How to work:
- First call read_note with the Note's name, and list_cards to see the Cards the Note already has. Do not propose a Card that repeats one of them. Call read_note on a linked Note only when a Card needs its context.
- If the user chose a passage, make Cards from that passage only.
- Make every Card answerable from the Note (or the passage). Do not add facts that are not in it. If the Note is too thin or vague for a good Card, say so instead.
- Good Cards: one idea each; a question that is clear without the Note open, so name the subject in it; a short answer, one or two sentences at most; no yes/no questions; no long lists to recite. Ask for understanding (why, how, what follows) as well as for facts.
- Propose Cards only through propose_cards, a few at a time (at most ${MAX_PROPOSALS}). Do not repeat their text in your message.
- After you propose, write one or two short sentences: what the Cards cover, and what you left out and why. Do not lecture.
- When the user asks for changes (harder, fewer, another angle), propose new Cards; you cannot change a proposed Card.
- Write the Cards in the language of the Note. Write your messages in the language of the user's messages, or the interface language named in the first message.
- Write plain text.`;

/** The hidden first message that starts the Session. */
export const kickoff = (note: string, language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `Start Card Extraction for the Note named "${note}". The user's interface language is ${LANGUAGE_NAMES[language]}.`,
});

/** The passage the user chose, as the model reads it. */
export const passageMessage = (passage: string): InputItem => ({
  type: "message",
  role: "user",
  content: `Make Cards from this passage of the Note only:\n\n"""\n${passage}\n"""`,
});

/** What the user did with proposed Cards since the AI last took a turn. */
export const decisionsMessage = (decisions: ReadonlyArray<string>): InputItem => ({
  type: "message",
  role: "developer",
  content: `Since your last answer, the user decided on proposed Cards:\n${decisions.map((line) => `- ${line}`).join("\n")}`,
});

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const ReadNoteArguments = Schema.Struct({ name: Schema.String });
const ProposeArguments = Schema.Struct({
  cards: Schema.Array(Schema.Struct({ question: Schema.String, answer: Schema.String })),
});
const decodeReadNote = Schema.decodeUnknownOption(ReadNoteArguments);
const decodePropose = Schema.decodeUnknownOption(ProposeArguments);

export interface Context {
  readonly graph: Graph.Graph["Service"];
  readonly cards: Cards.Cards["Service"];
  /** The Note the Session makes Cards from. */
  readonly note: string;
  /** Shows the proposed Cards to the user. */
  readonly propose: (cards: ReadonlyArray<CardText>) => Effect.Effect<void>;
}

export const tools = ({ graph, cards, note, propose }: Context): AgentTool[] => [
  {
    name: "read_note",
    entry: "read-note",
    description:
      "Read a Note in the user's Graph by name: its Markdown text, its Source, and the Notes it links to.",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "The Note's name." } },
      required: ["name"],
      additionalProperties: false,
    },
    run: (args) =>
      Option.match(decodeReadNote(args), {
        onNone: () => Effect.succeed({ error: "Give the Note's name." }),
        onSome: ({ name }) =>
          graph.read.pipe(
            Effect.map((view) => {
              const node = view.nodes.find((other) => linkKey(other.id) === linkKey(name));
              if (node === undefined) return { error: `There is no Note named ${name}.` };
              const titles = new Map(view.nodes.map((other) => [other.id, other.title]));
              return {
                name: node.id,
                kind: node.kind,
                text: node.body,
                source: node.sourceId === null ? null : (titles.get(node.sourceId) ?? null),
                links: view.links.filter((link) => link.from === node.id).map((link) => link.to),
                containsAiText: node.aiText,
              };
            }),
            Effect.orElseSucceed(() => ({ error: "The Graph could not be read." })),
          ),
      }),
  },
  {
    name: "list_cards",
    entry: "list-cards",
    description: "List the Cards already made from this Session's Note.",
    parameters: NO_ARGUMENTS,
    run: () =>
      cards.list.pipe(
        Effect.map((all) => ({
          cards: all
            .filter((card) => card.from !== null && linkKey(card.from) === linkKey(note))
            .map(({ question, answer, ai }) => ({ question, answer, aiWritten: ai })),
        })),
        Effect.orElseSucceed(() => ({ error: "The Cards could not be read." })),
      ),
  },
  {
    name: "propose_cards",
    entry: null,
    description: `Show proposed Cards to the user, who keeps, edits or drops each one. At most ${MAX_PROPOSALS} per call.`,
    parameters: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
    run: (args) => {
      const proposed = Option.getOrNull(decodePropose(args))
        ?.cards.map(({ question, answer }) => ({
          question: question.trim(),
          answer: answer.trim(),
        }))
        .filter(({ question }) => question !== "");
      if (proposed === undefined || proposed.length === 0) {
        return Effect.succeed({ error: "Give at least one Card with a question." });
      }
      const shown = proposed.slice(0, MAX_PROPOSALS);
      return propose(shown).pipe(
        Effect.as({
          shown: shown.length,
          ...(proposed.length > shown.length
            ? { skipped: `Only the first ${MAX_PROPOSALS} were shown.` }
            : {}),
          next: "The user now decides on each Card. You will hear what they kept and dropped.",
        }),
      );
    },
  },
];

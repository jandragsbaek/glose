import {
  isKnown,
  type Language,
  linkKey,
  openQuestion,
  probeFindings,
  type ReadingStart,
  type SourceKind,
  ReasoningVerdict,
  ResultVerdict,
  type SessionEntry,
  TaughtKind,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Graph from "../graph/Graph.ts";
import type * as Sources from "../graph/Sources.ts";
import type { AgentTool, InputItem } from "./agent.ts";
import { findQuote } from "./extraction.ts";
import { articleOf, readArticleTool } from "./articleTools.ts";
import { readNoteTool, searchGraphTool } from "./graphTools.ts";

const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", da: "Danish" };

export const INSTRUCTIONS = `You are the AI in Glose, a desktop app where a person learns from what they read. You run the Probe of the Reading Stage for one Source (usually a book): one adaptive conversation that finds what the user knows about it, what they do not know, and what they still must learn.

The loop:
1. Ask ONE question with ask_question, then end your turn. The user answers with their Reasoning (how they got there, in their own words) and their answer (the end result).
2. Judge every answer with judge_answer. Judge the Reasoning and the result apart: the Reasoning can be sound while the result is wrong, or the other way round. Say why in one short sentence each. When one sentence of their Reasoning shows the misunderstanding, give its exact words as quote, copied character for character. When the user gave no Reasoning, its verdict is "none".
3. When the answer shows a gap (the result is not right, or the Reasoning is not sound), teach that part with teach (kind "gap"): short, plain, true to the Source, aimed at the exact misunderstanding. Then ask about the same topic again in other words, with again_of set to the question you repeat. A gap closes only when the user answers it.
4. When the user asks to be taught instead of answering, teach the topic (kind "gap"), then ask again in other words.
5. When the answer shows no gap, move on to another topic that matters in the Source.

How to work:
- Start with read_source. Use list_notes, search_graph and read_note to see what the user's Graph already holds about the Source.
- Cover the Source's main ideas, one topic at a time, the most important first. Name each topic in a few words; use the same name for every question on it.
- Ask questions that make the user explain, apply or connect, not recall a word: why, how, what follows, what would change. One question at a time; never a list of questions.
- Your teaching comes from your knowledge of the Source, not from the user's copy. If you are unsure what the Source says, say so in the teaching.
- An Article or a Course lesson brings its text: read it with read_article. Then your questions and your teaching come from the text, the user's own copy. When you teach, give the paragraph your teaching rests on in teach's paragraph, so the user can read it there.
- Go deeper: a user's message may start with "(Go deeper on ¶ N)". The user is reading and marked that Passage. Ask about that Passage only, one question at a time, and teach its gap as always. When the user's answers show they understand it, call close_passage, say so in one short sentence, and end your turn. Do not move on to another topic then: the Probe of the whole Source comes later, when the user asks for it.
- When you have covered the Source's main ideas (often after 8 to 15 questions), call mark_covered and tell the user they can finish the Probe. Keep going if they answer more.
- Your messages are optional and short: one or two sentences at most. Never repeat in a message the question, the judgment or the teaching; they show by themselves.
- Write in the language the user answers in; before their first answer, in the interface language named in the first message. Write plain text.`;

const START_NOTES: Record<ReadingStart, string> = {
  write:
    "The user started by writing Free text, then made Notes in Extraction. Question them on the Source; list_notes shows the Notes they wrote, so you can test what the Notes claim.",
  probe:
    "The user read the Source and chose to be questioned first. They have no Notes from it yet; what you find feeds Extraction, which makes the Notes after the Probe.",
  "catch-up":
    'The user read the Source a while ago, or only in part, and chose to be questioned first. Before the first question on each topic, explain the topic briefly with teach (kind "intro"), then ask. What you find feeds Extraction, which makes the Notes after the Probe.',
};

const TEXT_NOTE =
  "This Source is an Article or a Course lesson, read in Glose: read_article gives its text and the Passages the user marked.";

export const kickoff = (
  language: Language,
  start: ReadingStart,
  kind: SourceKind = "book",
): InputItem => ({
  type: "message",
  role: "developer",
  content: `Start the Probe now. The user's interface language is ${LANGUAGE_NAMES[language]}. ${START_NOTES[start]}${kind === "book" ? "" : ` ${TEXT_NOTE}`}`,
});

export const readingKickoff = (language: Language): InputItem => ({
  type: "message",
  role: "developer",
  content: `The user is reading this Source in Glose and asked to go deeper on one Passage. The user's interface language is ${LANGUAGE_NAMES[language]}. ${TEXT_NOTE} Work only on the Passage in the next message; the Probe of the whole Source comes later.`,
});

export const focusMessage = (focus: {
  readonly paragraph: number;
  readonly text: string;
  readonly words: string | null;
}): string =>
  [
    `(Go deeper on ¶ ${focus.paragraph}) I marked this Passage while reading:`,
    `"${focus.text}"`,
    ...(focus.words === null ? [] : [`My words on it:\n${focus.words}`]),
    "Question me on it.",
  ].join("\n\n");

export const continueMessage: InputItem = {
  type: "message",
  role: "developer",
  content:
    "The user has finished reading and asks for the Probe of the whole Source now. Cover its main ideas you have not asked about yet, the most important first.",
};

type Focus = Extract<SessionEntry, { _tag: "ProbeFocus" }>;

export const openFocus = (entries: ReadonlyArray<SessionEntry>): Focus | null => {
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (entry._tag === "ProbeFocusDone") return null;
    if (entry._tag === "ProbeFocus") return entry;
  }
  return null;
};

export const answerMessage = (answer: Extract<SessionEntry, { _tag: "ProbeAnswer" }>): string =>
  answer.teachMe
    ? `(Answer to question ${answer.question}) I do not know. Please teach me.${answer.reasoning === "" ? "" : `\n\nWhat I thought:\n${answer.reasoning}`}`
    : [
        `(Answer to question ${answer.question})`,
        `My Reasoning:\n${answer.reasoning === "" ? "(none given)" : answer.reasoning}`,
        `My answer:\n${answer.answer === "" ? "(none given)" : answer.answer}`,
      ].join("\n\n");

type Question = Extract<SessionEntry, { _tag: "ProbeQuestion" }>;
type Answer = Extract<SessionEntry, { _tag: "ProbeAnswer" }>;

const questionsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.filter((entry): entry is Question => entry._tag === "ProbeQuestion");

const answerOf = (entries: ReadonlyArray<SessionEntry>, question: number) =>
  entries.find(
    (entry): entry is Answer => entry._tag === "ProbeAnswer" && entry.question === question,
  );

const isJudged = (entries: ReadonlyArray<SessionEntry>, question: number) =>
  entries.some((entry) => entry._tag === "ProbeJudgment" && entry.question === question);

const AskArguments = Schema.Struct({
  topic: Schema.String,
  question: Schema.String,
  again_of: Schema.NullOr(Schema.Number),
});
const JudgeArguments = Schema.Struct({
  question: Schema.Number,
  reasoning_verdict: ReasoningVerdict,
  reasoning_why: Schema.String,
  result_verdict: ResultVerdict,
  result_why: Schema.String,
  quote: Schema.NullOr(Schema.String),
});
const TeachArguments = Schema.Struct({
  kind: TaughtKind,
  topic: Schema.String,
  question: Schema.NullOr(Schema.Number),
  text: Schema.String,
  paragraph: Schema.optionalKey(Schema.NullOr(Schema.Number)),
});
const decodeAsk = Schema.decodeUnknownOption(AskArguments);
const decodeJudge = Schema.decodeUnknownOption(JudgeArguments);
const decodeTeach = Schema.decodeUnknownOption(TeachArguments);

export interface Context {
  readonly sources: Sources.Sources["Service"];
  readonly graph: Graph.Graph["Service"];
  readonly source: string;
  readonly update: <A>(
    change: (entries: ReadonlyArray<SessionEntry>) => readonly [A, ReadonlyArray<SessionEntry>],
  ) => Effect.Effect<A>;
}

type Outcome = { readonly error: string } | Readonly<Record<string, unknown>>;

export const tools = ({ sources, graph, source, update }: Context): AgentTool[] => {
  const paragraphs = articleOf(sources, source).pipe(
    Effect.map((article) => article?.units.length ?? 0),
  );
  return [
    {
      name: "read_source",
      entry: "read-source",
      description:
        "Read the Source of this Probe: its bibliographic data, how the user started it, and their Free text.",
      parameters: NO_ARGUMENTS,
      run: () =>
        sources.get(source).pipe(
          Effect.map((found) => ({
            id: found.id,
            kind: found.kind,
            author: { family: found.familyName, given: found.givenName },
            otherAuthors: found.otherAuthors,
            title: found.title,
            appearedIn: found.container,
            lesson: found.part,
            firstPublished: found.firstPublished,
            edition: found.edition,
            translator: found.translator,
            readingStart: found.readingStart,
            readingStep: found.readingStep,
            freeText: found.freeText,
          })),
          Effect.orElseSucceed(() => ({ error: "The Source could not be read." })),
        ),
    },
    {
      name: "list_notes",
      entry: "list-notes",
      description: "List the Notes the user made from this Source, with the start of each.",
      parameters: NO_ARGUMENTS,
      run: () =>
        graph.read.pipe(
          Effect.map((view) => ({
            notes: view.nodes
              .filter(
                (node) =>
                  node.kind === "note" &&
                  node.sourceId !== null &&
                  linkKey(node.sourceId) === linkKey(source),
              )
              .map((node) => ({
                name: node.id,
                page: node.page,
                start: node.body.replace(/\s+/g, " ").trim().slice(0, 240),
              })),
          })),
          Effect.orElseSucceed(() => ({ error: "The Graph could not be read." })),
        ),
    },
    searchGraphTool(graph),
    readNoteTool(graph),
    readArticleTool(sources, source),
    {
      name: "ask_question",
      entry: null,
      description:
        "Ask the user one question, then end your turn. again_of is the number of the question this one asks again after teaching, else null.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "The topic of the Source, in a few words; the same for every question on it.",
          },
          question: { type: "string", description: "One question, plain text." },
          again_of: { type: ["number", "null"], description: "The question this one asks again." },
        },
        required: ["topic", "question", "again_of"],
        additionalProperties: false,
      },
      run: (args: unknown) =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
          const asked = Option.getOrNull(decodeAsk(args));
          if (asked === null || asked.topic.trim() === "" || asked.question.trim() === "") {
            return [{ error: "Give a topic and a question." }, entries];
          }
          const open = openQuestion(entries);
          if (open !== null) {
            return [
              {
                error: `Question ${open.number} has no answer yet. End your turn; the user answers.`,
              },
              entries,
            ];
          }
          const numbers = questionsOf(entries).map((question) => question.number);
          const number = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
          const again =
            asked.again_of !== null && numbers.includes(asked.again_of) ? asked.again_of : null;
          const repeated = questionsOf(entries).find((question) => question.number === again);
          const focus = openFocus(entries);
          const paragraph = repeated?.paragraph ?? focus?.paragraph;
          const passage = repeated?.passage ?? focus?.text;
          const entry: Question = {
            _tag: "ProbeQuestion",
            number,
            topic: asked.topic.trim(),
            text: asked.question.trim(),
            again,
            ...(paragraph === undefined ? {} : { paragraph }),
            ...(passage === undefined ? {} : { passage }),
          };
          return [
            {
              shown: number,
              next: "End your turn now. The user answers with Reasoning and an answer.",
            },
            [...entries, entry],
          ];
        }),
    },
    {
      name: "judge_answer",
      entry: null,
      description:
        "Judge the user's answer to a question: the Reasoning and the result apart, each with why in one sentence. quote: the exact words of their Reasoning the judgment points at, or null.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "number", description: "The question's number." },
          reasoning_verdict: { type: "string", enum: [...ReasoningVerdict.literals] },
          reasoning_why: { type: "string", description: "Why, in one sentence." },
          result_verdict: { type: "string", enum: [...ResultVerdict.literals] },
          result_why: { type: "string", description: "Why, in one sentence." },
          quote: {
            type: ["string", "null"],
            description: "Exact words of the user's Reasoning that show the misunderstanding.",
          },
        },
        required: [
          "question",
          "reasoning_verdict",
          "reasoning_why",
          "result_verdict",
          "result_why",
          "quote",
        ],
        additionalProperties: false,
      },
      run: (args: unknown) =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
          const asked = Option.getOrNull(decodeJudge(args));
          if (asked === null) return [{ error: "Give the question and both verdicts." }, entries];
          const answer = answerOf(entries, asked.question);
          if (answer === undefined) {
            return [{ error: `Question ${asked.question} has no answer to judge.` }, entries];
          }
          if (isJudged(entries, asked.question)) {
            return [{ error: `Question ${asked.question} is judged already.` }, entries];
          }
          const quote = asked.quote === null ? null : findQuote(answer.reasoning, asked.quote);
          const judgment: Extract<SessionEntry, { _tag: "ProbeJudgment" }> = {
            _tag: "ProbeJudgment",
            question: asked.question,
            reasoning: answer.reasoning === "" ? "none" : asked.reasoning_verdict,
            reasoningWhy: asked.reasoning_why.trim(),
            result: asked.result_verdict,
            resultWhy: asked.result_why.trim(),
            quote,
          };
          return [
            {
              shown: true,
              ...(asked.quote !== null && quote === null
                ? { note: "The quote is not in the user's Reasoning, so it is not shown." }
                : {}),
              next: isKnown(judgment)
                ? "No gap: move on to another topic."
                : "A gap: teach it with teach, then ask again with again_of.",
            },
            [...entries, judgment],
          ];
        }),
    },
    {
      name: "teach",
      entry: null,
      description:
        'Teach the user, from your knowledge of the Source. kind "gap": the part an answer got wrong (question: its number). kind "intro": a topic before its first question, on a catch-up start (question: null).',
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...TaughtKind.literals] },
          topic: { type: "string", description: "The topic, as named in its questions." },
          question: { type: ["number", "null"], description: "The question that showed the gap." },
          text: { type: "string", description: "One to three short paragraphs, plain text." },
          paragraph: {
            type: ["number", "null"],
            description:
              "For an Article or Course lesson: the paragraph of the text the teaching rests on. Else null.",
          },
        },
        required: ["kind", "topic", "question", "text", "paragraph"],
        additionalProperties: false,
      },
      run: (args: unknown) =>
        Effect.flatMap(paragraphs, (count) =>
          update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
            const asked = Option.getOrNull(decodeTeach(args));
            if (asked === null || asked.text.trim() === "") {
              return [{ error: "Give the kind, the topic and the text." }, entries];
            }
            const question =
              asked.question !== null &&
              questionsOf(entries).some((q) => q.number === asked.question)
                ? asked.question
                : null;
            const paragraph =
              asked.paragraph !== null &&
              asked.paragraph !== undefined &&
              Number.isInteger(asked.paragraph) &&
              asked.paragraph >= 1 &&
              asked.paragraph <= count
                ? asked.paragraph
                : null;
            const entry: Extract<SessionEntry, { _tag: "ProbeTaught" }> = {
              _tag: "ProbeTaught",
              kind: asked.kind,
              topic: asked.topic.trim(),
              question,
              text: asked.text.trim(),
              ...(paragraph === null ? {} : { paragraph }),
            };
            return [
              { shown: true, next: "Now ask a question with ask_question." },
              [...entries, entry],
            ];
          }),
        ),
    },
    {
      name: "close_passage",
      entry: null,
      description:
        "Say that the user now understands the Passage they asked to go deeper on. Then say so in one short sentence and end your turn; do not ask about another topic.",
      parameters: NO_ARGUMENTS,
      run: () =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
          const focus = openFocus(entries);
          if (focus === null) return [{ error: "No Passage is open." }, entries];
          if (openQuestion(entries) !== null) {
            return [
              { error: "A question is still open. End your turn; the user answers." },
              entries,
            ];
          }
          return [
            { shown: true, next: "End your turn now." },
            [...entries, { _tag: "ProbeFocusDone", paragraph: focus.paragraph, text: focus.text }],
          ];
        }),
    },
    {
      name: "mark_covered",
      entry: null,
      description:
        "Say that you have covered the Source's main ideas. Glose offers the user to finish the Probe.",
      parameters: NO_ARGUMENTS,
      run: () =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] =>
          entries.some((entry) => entry._tag === "ProbeCovered")
            ? [{ shown: true }, entries]
            : [{ shown: true }, [...entries, { _tag: "ProbeCovered" }]],
        ),
    },
  ];
};

export const userWords = (entries: ReadonlyArray<SessionEntry>): string =>
  entries
    .flatMap((entry) => (entry._tag === "ProbeAnswer" ? [entry.reasoning, entry.answer] : []))
    .filter((text) => text !== "")
    .join("\n\n");

export const forExtraction = (entries: ReadonlyArray<SessionEntry>) => ({
  findings: probeFindings(entries).map(({ topic, state }) => ({ topic, state })),
  questions: questionsOf(entries).map((question) => {
    const answer = answerOf(entries, question.number);
    const judgment = entries.find(
      (entry) => entry._tag === "ProbeJudgment" && entry.question === question.number,
    );
    return {
      number: question.number,
      topic: question.topic,
      question: question.text,
      reasoning: answer?.reasoning ?? null,
      answer: answer?.answer ?? null,
      askedToBeTaught: answer?.teachMe ?? false,
      judged:
        judgment?._tag === "ProbeJudgment"
          ? { reasoning: judgment.reasoning, result: judgment.result }
          : null,
    };
  }),
});

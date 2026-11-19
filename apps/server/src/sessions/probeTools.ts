import {
  ChoiceSelect,
  openQuestion,
  planOf,
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
import type { AgentTool } from "./agent.ts";
import { articleOf } from "./articleTools.ts";
import { answerOf, choiceKey, judgeAnswer, questionsOf } from "./probeJudging.ts";

export { answerOf, questionsOf };

export const NO_ARGUMENTS = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

type Focus = Extract<SessionEntry, { _tag: "ProbeFocus" }>;

export const openFocus = (entries: ReadonlyArray<SessionEntry>): Focus | null => {
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (entry._tag === "ProbeFocusDone") return null;
    if (entry._tag === "ProbeFocus") return entry;
  }
  return null;
};

type Question = Extract<SessionEntry, { _tag: "ProbeQuestion" }>;

const AskArguments = Schema.Struct({
  topic: Schema.String,
  question: Schema.String,
  again_of: Schema.NullOr(Schema.Number),
  form: Schema.optionalKey(Schema.Literals(["open", "choice"])),
  select: Schema.optionalKey(Schema.NullOr(ChoiceSelect)),
  options: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(
        Schema.Struct({
          text: Schema.String,
          right: Schema.Boolean,
          tests: Schema.NullOr(Schema.String),
        }),
      ),
    ),
  ),
});
const HintArguments = Schema.Struct({ question: Schema.Number, text: Schema.String });
const PlanArguments = Schema.Struct({ topics: Schema.Array(Schema.String) });
const TeachArguments = Schema.Struct({
  kind: TaughtKind,
  topic: Schema.String,
  question: Schema.NullOr(Schema.Number),
  text: Schema.String,
  paragraph: Schema.optionalKey(Schema.NullOr(Schema.Number)),
});
const decodeAsk = Schema.decodeUnknownOption(AskArguments);
const decodeTeach = Schema.decodeUnknownOption(TeachArguments);
const decodeHint = Schema.decodeUnknownOption(HintArguments);
const decodePlan = Schema.decodeUnknownOption(PlanArguments);

type Asked = typeof AskArguments.Type;

const MAX_TOPICS = 16;

export const choiceOf = (
  asked: Asked,
): Question["choice"] | { readonly error: string } | undefined =>
  asked.form === "choice" ? choiceKey(asked.select ?? "one", asked.options ?? []) : undefined;

export interface Context {
  readonly sources: Sources.Sources["Service"];
  readonly graph: Graph.Graph["Service"];
  readonly source: string;
  readonly update: <A>(
    change: (entries: ReadonlyArray<SessionEntry>) => readonly [A, ReadonlyArray<SessionEntry>],
  ) => Effect.Effect<A>;
}

type Outcome = { readonly error: string } | Readonly<Record<string, unknown>>;

export const probeTools = ({ sources, source, update }: Context): AgentTool[] => {
  const paragraphs = articleOf(sources, source).pipe(
    Effect.map((article) => article?.units.length ?? 0),
  );
  return [
    {
      name: "ask_question",
      entry: null,
      description:
        'Ask the user one question, then end your turn. again_of is the number of the question this one asks again after teaching, else null. form "open" (options and select null) or "choice" (2 to 5 options).',
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
          form: { type: "string", enum: ["open", "choice"] },
          select: {
            type: ["string", "null"],
            enum: ["one", "many", null],
            description: 'For a choice: "one" right option, or "many" (choose all that apply).',
          },
          options: {
            type: ["array", "null"],
            description: "For a choice: the options in the order shown. Else null.",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The option, short, plain text." },
                right: { type: "boolean" },
                tests: {
                  type: ["string", "null"],
                  description:
                    "For a wrong option: the misconception it tests, in a few words. Null for a right one.",
                },
              },
              required: ["text", "right", "tests"],
              additionalProperties: false,
            },
          },
        },
        required: ["topic", "question", "again_of", "form", "select", "options"],
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
          const choice = choiceOf(asked);
          if (choice !== undefined && "error" in choice) return [{ error: choice.error }, entries];
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
            ...(choice === undefined ? {} : { choice }),
          };
          const plan = planOf(entries);
          const planned =
            plan === null ||
            plan.some((topic) => topic.trim().toLowerCase() === entry.topic.toLowerCase());
          return [
            {
              shown: number,
              ...(planned
                ? {}
                : {
                    note: "This topic is not in your plan. Use the plan's name for it, or revise the plan with plan_topics.",
                  }),
              next:
                choice === undefined
                  ? "End your turn now. The user answers in one text: their Reasoning, ending on their answer."
                  : "End your turn now. The user chooses, with their Reasoning.",
            },
            [...entries, entry],
          ];
        }),
    },
    {
      name: "judge_answer",
      entry: null,
      description:
        "Judge the user's answer to a question: the Reasoning and the result apart, each with why in one sentence. quote: the user's own words the judgment points at, exactly, or null. A choice's result must match Glose's own check of the choice. Call it again on a judged question only when the user disputed that judgment and is right.",
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
            description: "Exact words the user wrote that show the misunderstanding.",
          },
          corrected_options: {
            type: ["array", "null"],
            description:
              "Only when judging a choice question again because its key was wrong: for each option, in order, whether it is right and, if wrong, what it tests. Else null.",
            items: {
              type: "object",
              properties: {
                right: { type: "boolean" },
                tests: { type: ["string", "null"] },
              },
              required: ["right", "tests"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "question",
          "reasoning_verdict",
          "reasoning_why",
          "result_verdict",
          "result_why",
          "quote",
          "corrected_options",
        ],
        additionalProperties: false,
      },
      run: (args: unknown) => update((entries) => judgeAnswer(entries, args)),
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
      name: "plan_topics",
      entry: null,
      description:
        "Set the topics of the Source you plan to cover, the most important first. Call it again to revise the plan; the latest plan stands.",
      parameters: {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: { type: "string" },
            description: "Each topic in a few words, as you will name it in its questions.",
          },
        },
        required: ["topics"],
        additionalProperties: false,
      },
      run: (args: unknown) =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
          const asked = Option.getOrNull(decodePlan(args));
          const seen = new Set<string>();
          const topics = (asked?.topics ?? [])
            .map((topic) => topic.trim())
            .filter((topic) => {
              const key = topic.toLowerCase();
              if (topic === "" || seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, MAX_TOPICS);
          if (topics.length === 0) return [{ error: "Give at least one topic." }, entries];
          return [
            { shown: topics.length, next: "Now ask the first question with ask_question." },
            [...entries, { _tag: "ProbePlan", topics }],
          ];
        }),
    },
    {
      name: "give_hint",
      entry: null,
      description:
        "Give the user one hint for the open question they asked a hint for: a nudge, a smaller question or where to look, never the answer. Then end your turn; the question stays open.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "number", description: "The open question's number." },
          text: { type: "string", description: "The hint, one or two sentences, plain text." },
        },
        required: ["question", "text"],
        additionalProperties: false,
      },
      run: (args: unknown) =>
        update((entries): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
          const asked = Option.getOrNull(decodeHint(args));
          if (asked === null || asked.text.trim() === "") {
            return [{ error: "Give the question and the hint." }, entries];
          }
          const open = openQuestion(entries);
          if (open === null || open.number !== asked.question) {
            return [{ error: `Question ${asked.question} is not open.` }, entries];
          }
          return [
            { shown: true, next: "End your turn now. The question stays open." },
            [...entries, { _tag: "ProbeHint", question: asked.question, text: asked.text.trim() }],
          ];
        }),
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

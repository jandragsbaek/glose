import {
  answerState,
  answerWords,
  type ChoiceSelect,
  choiceResult,
  judgmentsOf,
  openQuestion,
  probeFindings,
  probeTally,
  type ProbeChoice,
  ReasoningVerdict,
  ResultVerdict,
  type SessionEntry,
} from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { findQuote } from "./quotes.ts";

type Question = Extract<SessionEntry, { _tag: "ProbeQuestion" }>;
type Answer = Extract<SessionEntry, { _tag: "ProbeAnswer" }>;
type Judgment = Extract<SessionEntry, { _tag: "ProbeJudgment" }>;
type Outcome = { readonly error: string } | Readonly<Record<string, unknown>>;

export const questionsOf = (entries: ReadonlyArray<SessionEntry>) =>
  entries.filter((entry): entry is Question => entry._tag === "ProbeQuestion");

export const answerOf = (entries: ReadonlyArray<SessionEntry>, question: number) =>
  entries.find(
    (entry): entry is Answer => entry._tag === "ProbeAnswer" && entry.question === question,
  );

const JudgeArguments = Schema.Struct({
  question: Schema.Number,
  reasoning_verdict: ReasoningVerdict,
  reasoning_why: Schema.String,
  result_verdict: ResultVerdict,
  result_why: Schema.String,
  quote: Schema.NullOr(Schema.String),
  corrected_options: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(Schema.Struct({ right: Schema.Boolean, tests: Schema.NullOr(Schema.String) })),
    ),
  ),
});
const decodeJudge = Schema.decodeUnknownOption(JudgeArguments);

const isUserTurn = (entry: SessionEntry) =>
  entry._tag === "UserMessage" || entry._tag === "ProbeAnswer" || entry._tag === "ProbeHintAsked";

const mayJudge = (entries: ReadonlyArray<SessionEntry>, question: number) => {
  const judged = entries.findLastIndex(
    (entry) => entry._tag === "ProbeJudgment" && entry.question === question,
  );
  if (judged === -1) return true;
  const turn = entries.findLastIndex(isUserTurn);
  const dispute = entries[turn];
  return turn > judged && dispute?._tag === "UserMessage" && dispute.question === question;
};

const topicsNow = (entries: ReadonlyArray<SessionEntry>) => {
  const findings = probeFindings(entries);
  return {
    topics: findings.map(({ topic, state }) => ({ topic, state })),
    tally: probeTally(findings),
  };
};

const MAX_OPTIONS = 5;

interface KeyedOption {
  readonly text: string;
  readonly right: boolean;
  readonly tests: string | null;
}

export const choiceKey = (
  select: ChoiceSelect,
  given: ReadonlyArray<KeyedOption>,
): ProbeChoice | { readonly error: string } => {
  const options = given.map((option) => ({
    text: option.text.trim(),
    right: option.right,
    tests: option.tests?.trim() || null,
  }));
  if (options.length < 2 || options.length > MAX_OPTIONS) {
    return { error: `A choice question has 2 to ${MAX_OPTIONS} options.` };
  }
  if (options.some((option) => option.text === "")) return { error: "Every option needs text." };
  const texts = new Set(options.map((option) => option.text.toLowerCase()));
  if (texts.size !== options.length) return { error: "Two options are the same." };
  const right = options.flatMap((option, index) => (option.right ? [index] : []));
  if (right.length === 0) return { error: "Mark at least one option right." };
  if (select === "one" && right.length !== 1) {
    return { error: 'With select "one", exactly one option is right; use "many" for more.' };
  }
  if (right.length === options.length) return { error: "At least one option must be wrong." };
  if (options.some((option) => !option.right && option.tests === null)) {
    return { error: "Every wrong option needs tests: the misconception it tests." };
  }
  return {
    select,
    options: options.map((option) => option.text),
    right,
    tests: options.map((option) => (option.right ? null : option.tests)),
  };
};

export const correctedKey = (
  choice: ProbeChoice,
  corrected: ReadonlyArray<{ readonly right: boolean; readonly tests: string | null }>,
): ProbeChoice | { readonly error: string } =>
  corrected.length === choice.options.length
    ? choiceKey(
        choice.select,
        choice.options.map((text, index) => ({ text, ...corrected[index]! })),
      )
    : {
        error: `corrected_options needs one entry for each of the ${choice.options.length} options, in order.`,
      };

const stateStep = (judgment: Judgment, answer: Answer) => {
  switch (answerState(judgment, answer)) {
    case "known":
      return "No gap: move on to another topic.";
    case "unconfirmed":
      return "Right, but not confirmed: a guess, or a choice with no Reasoning. Do not count it known; later, ask about this topic again in another form, usually open.";
    case "gap":
      return "A gap: teach it with teach, then ask again with again_of.";
  }
};

const nextStep = (again: boolean, judgment: Judgment, answer: Answer, open: number | null) =>
  !again
    ? stateStep(judgment, answer)
    : open === null
      ? `Judged again: say so in one sentence. ${stateStep(judgment, answer)}`
      : `Judged again: say so in one sentence, and end your turn. Question ${open} stays open; after the user answers it, ${answerState(judgment, answer) === "gap" ? "teach this gap and ask about it again" : "go on"}.`;

export const judgeAnswer = (
  entries: ReadonlyArray<SessionEntry>,
  args: unknown,
): readonly [Outcome, ReadonlyArray<SessionEntry>] => {
  const asked = Option.getOrNull(decodeJudge(args));
  if (asked === null) return [{ error: "Give the question and both verdicts." }, entries];
  const answer = answerOf(entries, asked.question);
  if (answer === undefined) {
    return [{ error: `Question ${asked.question} has no answer to judge.` }, entries];
  }
  if (!mayJudge(entries, asked.question)) {
    return [
      {
        error: `Question ${asked.question} is judged already. Judge it again only in the turn after the user disputes that judgment.`,
      },
      entries,
    ];
  }
  const again = judgmentsOf(entries, asked.question).length > 0;
  const question = questionsOf(entries).find((q) => q.number === asked.question);
  const correction = asked.corrected_options ?? null;
  if (correction !== null && (!again || question?.choice === undefined)) {
    return [
      {
        error:
          "corrected_options only corrects the key of a choice question you judge again after a dispute. Give null.",
      },
      entries,
    ];
  }
  const corrected =
    correction === null || question?.choice === undefined
      ? undefined
      : correctedKey(question.choice, correction);
  if (corrected !== undefined && "error" in corrected) return [corrected, entries];
  const choice = corrected ?? question?.choice;
  const checked =
    choice?.right === undefined || answer.teachMe
      ? null
      : choiceResult(choice.select, choice.right, answer.choice ?? []);
  if (checked !== null && checked !== asked.result_verdict) {
    return [
      {
        error: `Glose's check of the choice says the result is ${checked}. Call judge_answer again with result_verdict "${checked}" and a result_why that fits it.${again ? " If the key itself was wrong, give corrected_options instead." : ""}`,
      },
      entries,
    ];
  }
  const words = answerWords(answer);
  const quote = asked.quote === null ? null : findQuote(words, asked.quote);
  const judgment: Judgment = {
    _tag: "ProbeJudgment",
    question: asked.question,
    reasoning: words === "" ? "none" : asked.reasoning_verdict,
    reasoningWhy: asked.reasoning_why.trim(),
    result: asked.result_verdict,
    resultWhy: asked.result_why.trim(),
    quote,
  };
  const keyed =
    corrected === undefined
      ? entries
      : entries.map((entry) =>
          entry._tag === "ProbeQuestion" && entry.number === asked.question
            ? { ...entry, choice: corrected }
            : entry,
        );
  const after = [...keyed, judgment];
  return [
    {
      shown: true,
      ...(asked.quote !== null && quote === null
        ? { note: "The quote is not in the user's words, so it is not shown." }
        : {}),
      next: nextStep(again, judgment, answer, openQuestion(entries)?.number ?? null),
      ...topicsNow(after),
    },
    after,
  ];
};

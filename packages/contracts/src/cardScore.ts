import * as Schema from "effect/Schema";

import type { CardText } from "./card.ts";

/**
 * The Checks of a Card, after what research says a good retrieval prompt is (docs/ideas.md,
 * "Card Checks", names the sources). Code runs the rule Checks at once, also offline; the AI
 * runs the rest, which need the meaning of the words.
 */
export const RULE_CHECKS = [
  "has-answer",
  "recall",
  "not-broad",
  "concise",
  "no-list",
  "no-giveaway",
  "distinct",
] as const;

export const AI_CHECKS = [
  "one-answer",
  "specific",
  "self-contained",
  "one-idea",
  "true-to-note",
] as const;

export const CheckId = Schema.Literals([...RULE_CHECKS, ...AI_CHECKS]);
export type CheckId = typeof CheckId.Type;
export type RuleCheckId = (typeof RULE_CHECKS)[number];
export type AiCheckId = (typeof AI_CHECKS)[number];

export const Verdict = Schema.Literals(["pass", "warn", "fail"]);
export type Verdict = typeof Verdict.Type;

export const Check = Schema.Struct({
  id: CheckId,
  verdict: Verdict,
  /** The AI's reason, in the interface language; null for a rule Check or a pass. */
  note: Schema.NullOr(Schema.String),
});
export type Check = typeof Check.Type;

/** One word for all the Checks: `poor` with a failed Check, `fix` with a warning, else `good`. */
export const Grade = Schema.Literals(["good", "fix", "poor"]);
export type Grade = typeof Grade.Type;

/**
 * Where the AI Checks are: `done`; `pending` while the AI works or waits to; `off` without a
 * ChatGPT connection that may use the plan; `failed` when the AI could not answer.
 */
export const JudgeState = Schema.Literals(["done", "pending", "off", "failed"]);
export type JudgeState = typeof JudgeState.Type;

export const CardScore = Schema.Struct({
  grade: Grade,
  checks: Schema.Array(Check),
  judge: JudgeState,
});
export type CardScore = typeof CardScore.Type;

export const gradeOf = (checks: ReadonlyArray<Check>): Grade =>
  checks.some((check) => check.verdict === "fail")
    ? "poor"
    : checks.some((check) => check.verdict === "warn")
      ? "fix"
      : "good";

export const scoreOf = (checks: ReadonlyArray<Check>, judge: JudgeState): CardScore => ({
  grade: gradeOf(checks),
  checks,
  judge,
});

/** Above these word counts a side of a Card warns, and above twice as many it fails. */
export const QUESTION_WORDS = 30;
export const ANSWER_WORDS = 30;

/** Question words in common with another Card's question that make two Cards confusable. */
const DISTINCT_OVERLAP = 0.7;
/** Share of the answer's words that, found in the question, give the answer away. */
const GIVEAWAY_SHARE = 0.8;

const words = (text: string) => text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Words long enough to carry meaning in English or Danish, without a stop-word list. */
const contentWords = (text: string) => new Set(words(text).filter((word) => word.length >= 4));

/** Questions that a yes or no answers, which the reader can guess half the time. */
const YES_NO_START =
  /^(is|are|was|were|am|do|does|did|can|could|will|would|shall|should|has|have|had|may|might|must|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|can't|couldn't|won't|wouldn't|shouldn't|hasn't|haven't|er|var|kan|kunne|vil|ville|skal|skulle|har|havde|gør|gjorde|må|måtte|bør|burde|findes|fandtes|bliver|blev)(?![\p{L}\p{N}])/iu;
const TRUE_OR_FALSE = /\b(true or false|sandt eller falsk|rigtigt eller forkert)\b/iu;
const YES_NO_ANSWER = /^(yes|no|ja|nej|true|false|sandt|falsk)\b(?![\p{L}\p{N}])/iu;

/** Prompts that ask for an essay, not one answer. (`\b` knows no letters past ASCII, as in "må".) */
const BROAD_START =
  /^(explain|describe|discuss|summari[sz]e|tell me|talk about|write about|what do you know|give an overview|forklar|beskriv|diskuter|opsummer|fortæl|skriv om|hvad ved du|giv et overblik)(?![\p{L}\p{N}])/iu;

const LIST_QUESTION =
  /\b(list|enumerate|name all|name the (three|four|five|six|seven|eight|nine|ten|\d+)|what are the (three|four|five|six|seven|eight|nine|ten|\d+)|nævn|opregn|hvad er de (tre|fire|fem|seks|syv|otte|ni|ti|\d+))\b/iu;
const LIST_LINE = /^\s*([-*+]|\d+[.)])\s+\S/gmu;

const verdictByCount = (count: number, limit: number): Verdict =>
  count > limit * 2 ? "fail" : count > limit ? "warn" : "pass";

const worst = (...verdicts: ReadonlyArray<Verdict>): Verdict =>
  verdicts.includes("fail") ? "fail" : verdicts.includes("warn") ? "warn" : "pass";

const rule = (id: RuleCheckId, verdict: Verdict): Check => ({ id, verdict, note: null });

const overlap = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
};

/**
 * The rule Checks of one Card. `others` are the Cards it could be confused with in a Review,
 * such as the other Cards from its Note.
 */
export const ruleChecks = (card: CardText, others: ReadonlyArray<CardText> = []): Check[] => {
  const question = card.question.trim();
  const answer = card.answer.trim();
  const questionWords = contentWords(question);
  const answerWords = contentWords(answer);

  const listLines = answer.match(LIST_LINE)?.length ?? 0;
  const commaItems = answer.split(/[,;]/u).map((item) => words(item).length);
  const shortItems = commaItems.length >= 3 && commaItems.every((count) => count > 0 && count <= 4);

  const shared = [...answerWords].filter((word) => questionWords.has(word)).length;
  const givenAway = answerWords.size > 0 && shared / answerWords.size >= GIVEAWAY_SHARE;

  const confusable = others.some(
    (other) =>
      (other.question.trim() !== question || other.answer.trim() !== answer) &&
      overlap(questionWords, contentWords(other.question)) >= DISTINCT_OVERLAP,
  );

  return [
    rule("has-answer", answer === "" ? "fail" : "pass"),
    rule(
      "recall",
      YES_NO_START.test(question) || TRUE_OR_FALSE.test(question) || YES_NO_ANSWER.test(answer)
        ? "fail"
        : "pass",
    ),
    rule("not-broad", BROAD_START.test(question) ? "warn" : "pass"),
    rule(
      "concise",
      worst(
        verdictByCount(words(question).length, QUESTION_WORDS),
        verdictByCount(words(answer).length, ANSWER_WORDS),
      ),
    ),
    rule(
      "no-list",
      listLines >= 3 ? "fail" : shortItems || LIST_QUESTION.test(question) ? "warn" : "pass",
    ),
    rule("no-giveaway", givenAway ? "warn" : "pass"),
    rule("distinct", confusable ? "warn" : "pass"),
  ];
};

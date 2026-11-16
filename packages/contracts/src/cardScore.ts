import * as Schema from "effect/Schema";

import type { CardText } from "./card.ts";

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
  note: Schema.NullOr(Schema.String),
});
export type Check = typeof Check.Type;

export const Grade = Schema.Literals(["good", "fix", "poor"]);
export type Grade = typeof Grade.Type;

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

export const QUESTION_WORDS = 30;
export const ANSWER_WORDS = 30;

const DISTINCT_OVERLAP = 0.7;
const GIVEAWAY_SHARE = 0.8;

const words = (text: string) => text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

const contentWords = (text: string) => new Set(words(text).filter((word) => word.length >= 4));

const YES_NO_START =
  /^(is|are|was|were|am|do|does|did|can|could|will|would|shall|should|has|have|had|may|might|must|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|can't|couldn't|won't|wouldn't|shouldn't|hasn't|haven't|er|var|kan|kunne|vil|ville|skal|skulle|har|havde|gør|gjorde|må|måtte|bør|burde|findes|fandtes|bliver|blev)(?![\p{L}\p{N}])/iu;
const TRUE_OR_FALSE = /\b(true or false|sandt eller falsk|rigtigt eller forkert)\b/iu;
const YES_NO_ANSWER = /^(yes|no|ja|nej|true|false|sandt|falsk)\b(?![\p{L}\p{N}])/iu;

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

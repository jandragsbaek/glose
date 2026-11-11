import { assert, describe, it } from "@effect/vitest";

import { type CardText } from "./card.ts";
import { type CheckId, gradeOf, ruleChecks, type Verdict } from "./cardScore.ts";

/** The rule Checks that do not pass, as `id: verdict`. */
const faults = (card: CardText, others: ReadonlyArray<CardText> = []) =>
  ruleChecks(card, others)
    .filter((check) => check.verdict !== "pass")
    .map((check) => `${check.id}: ${check.verdict}`);

const card = (question: string, answer: string): CardText => ({ question, answer });

const words = (n: number) => Array.from({ length: n }, (_, index) => `word${index}`).join(" ");

describe("ruleChecks", () => {
  it("passes a focused question with a short answer", () => {
    assert.deepStrictEqual(
      faults(card("What does attention residue lower?", "Performance on the next task.")),
      [],
    );
    assert.deepStrictEqual(
      faults(card("Hvad sænker opmærksomhedsrest?", "Præstationen på den næste opgave.")),
      [],
    );
  });

  it("fails questions that a yes, a no or a guess between two answers", () => {
    for (const question of [
      "Does attention linger after a switch?",
      "Is residue bad?",
      "Attention lingers: true or false?",
      "Må man skifte opgave?",
      "Har Leroy ret?",
    ]) {
      assert.deepStrictEqual(faults(card(question, "Sophie Leroy.")), ["recall: fail"], question);
    }
    assert.deepStrictEqual(faults(card("What lingers after a switch?", "Yes, attention.")), [
      "recall: fail",
    ]);
  });

  it("warns about prompts that ask for an essay", () => {
    for (const question of ["Explain attention residue.", "Forklar opmærksomhedsrest."]) {
      assert.deepStrictEqual(faults(card(question, "It lingers.")), ["not-broad: warn"]);
    }
  });

  it("fails a Card without an answer", () => {
    assert.deepStrictEqual(faults(card("What lingers after a switch?", "")), ["has-answer: fail"]);
  });

  it("warns about a long side and fails one twice as long", () => {
    assert.deepStrictEqual(faults(card("What lingers?", words(31))), ["concise: warn"]);
    assert.deepStrictEqual(faults(card("What lingers?", words(61))), ["concise: fail"]);
    assert.deepStrictEqual(faults(card(`${words(31)}?`, "Attention.")), ["concise: warn"]);
  });

  it("flags lists to recite", () => {
    assert.deepStrictEqual(faults(card("Which costs?", "- time\n- focus\n- errors")), [
      "no-list: fail",
    ]);
    assert.deepStrictEqual(faults(card("Which costs?", "Time, focus, errors")), ["no-list: warn"]);
    assert.deepStrictEqual(faults(card("Name the three costs of switching.", "Several.")), [
      "no-list: warn",
    ]);
  });

  it("warns when the question gives the answer away", () => {
    assert.deepStrictEqual(
      faults(card("Does attention residue lower performance?", "Attention residue.")),
      ["recall: fail", "no-giveaway: warn"],
    );
  });

  it("warns when another Card from the Note asks nearly the same", () => {
    const one = card("What does attention residue lower after switching?", "Performance.");
    const other = card("What does attention residue lower after task switching?", "Focus.");
    assert.deepStrictEqual(faults(one, [other]), ["distinct: warn"]);
    assert.deepStrictEqual(faults(one, [one]), []);
  });
});

describe("gradeOf", () => {
  const check = (id: CheckId, verdict: Verdict) => ({ id, verdict, note: null });

  it("is the worst verdict", () => {
    assert.strictEqual(gradeOf([check("recall", "pass")]), "good");
    assert.strictEqual(gradeOf([check("recall", "pass"), check("concise", "warn")]), "fix");
    assert.strictEqual(gradeOf([check("concise", "warn"), check("one-answer", "fail")]), "poor");
  });
});

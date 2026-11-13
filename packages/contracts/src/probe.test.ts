import { assert, describe, it } from "@effect/vitest";

import { openQuestion, probeFindings, probeTally } from "./probe.ts";
import type { SessionEntry } from "./session.ts";
import { nextReadingStep, readingStepsOf } from "./source.ts";

const question = (number: number, topic: string, again: number | null = null): SessionEntry => ({
  _tag: "ProbeQuestion",
  number,
  topic,
  text: `Question ${number}?`,
  again,
});

const answer = (question: number, teachMe = false): SessionEntry => ({
  _tag: "ProbeAnswer",
  question,
  reasoning: "Because.",
  answer: teachMe ? "" : "This.",
  teachMe,
});

const judged = (
  question: number,
  reasoning: "sound" | "partly-sound" | "flawed" | "none",
  result: "right" | "partly-right" | "wrong",
): SessionEntry => ({
  _tag: "ProbeJudgment",
  question,
  reasoning,
  reasoningWhy: "",
  result,
  resultWhy: "",
  quote: null,
});

const taught = (
  question: number | null,
  topic: string,
  kind: "gap" | "intro" = "gap",
): SessionEntry => ({
  _tag: "ProbeTaught",
  kind,
  topic,
  question,
  text: "It works like this.",
});

describe("probeFindings", () => {
  it("follows each topic through answers, judgments and teaching", () => {
    const entries: ReadonlyArray<SessionEntry> = [
      // Known at once.
      question(1, "Deep work"),
      answer(1),
      judged(1, "sound", "right"),
      // A gap, taught, then answered right: the same topic, named in another case.
      question(2, "Attention residue"),
      answer(2),
      judged(2, "sound", "partly-right"),
      taught(2, "Attention residue"),
      question(3, "attention residue", 2),
      answer(3),
      judged(3, "sound", "right"),
      // A right result reached by flawed Reasoning is a gap, and stays one untaught.
      question(4, "Shallow work"),
      answer(4),
      judged(4, "flawed", "right"),
      // Asked to be taught, and taught: waits to be asked again.
      question(5, "Boredom"),
      answer(5, true),
      taught(5, "Boredom"),
      // An intro on a catch-up start teaches before the question; it is no gap.
      taught(null, "Social media", "intro"),
      question(6, "Social media"),
    ];
    const findings = probeFindings(entries);
    assert.deepStrictEqual(
      findings.map(({ topic, state, questions }) => [topic, state, questions]),
      [
        ["Deep work", "known", [1]],
        ["Attention residue", "known-after-teaching", [2, 3]],
        ["Shallow work", "gap", [4]],
        ["Boredom", "taught", [5]],
        ["Social media", "asking", [6]],
      ],
    );
    assert.deepStrictEqual(probeTally(findings), {
      known: 1,
      afterTeaching: 1,
      taught: 1,
      open: 1,
    });
  });
});

describe("openQuestion", () => {
  it("is the last question while it has no answer, and none once the Probe is finished", () => {
    const asked = [question(1, "A"), answer(1), judged(1, "sound", "right"), question(2, "B")];
    assert.strictEqual(openQuestion(asked)?.number, 2);
    assert.isNull(openQuestion([...asked, answer(2)]));
    assert.isNull(openQuestion([...asked, { _tag: "ProbeFinished", at: 1 }]));
    assert.isNull(openQuestion([]));
  });
});

describe("Reading steps", () => {
  it("orders the steps by where the user starts", () => {
    assert.deepStrictEqual(readingStepsOf("write"), ["free-text", "extraction", "probe"]);
    assert.deepStrictEqual(readingStepsOf("catch-up"), ["probe", "extraction"]);
    assert.strictEqual(nextReadingStep("write", "extraction"), "probe");
    assert.strictEqual(nextReadingStep("write", "probe"), "done");
    assert.strictEqual(nextReadingStep("probe", "probe"), "extraction");
    assert.strictEqual(nextReadingStep("probe", "extraction"), "done");
    assert.strictEqual(nextReadingStep("probe", "done"), "done");
  });
});

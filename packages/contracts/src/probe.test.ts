import { assert, describe, it } from "@effect/vitest";

import { choiceResult, openQuestion, probeFindings, probeTally, publicEntries } from "./probe.ts";
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
      question(1, "Deep work"),
      answer(1),
      judged(1, "sound", "right"),
      question(2, "Attention residue"),
      answer(2),
      judged(2, "sound", "partly-right"),
      taught(2, "Attention residue"),
      question(3, "attention residue", 2),
      answer(3),
      judged(3, "sound", "right"),
      question(4, "Shallow work"),
      answer(4),
      judged(4, "flawed", "right"),
      question(5, "Boredom"),
      answer(5, true),
      taught(5, "Boredom"),
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
      unconfirmed: 0,
      asked: 5,
      topics: 5,
    });
  });

  it("adds the planned topics not asked yet, and counts a hint as help", () => {
    const entries: ReadonlyArray<SessionEntry> = [
      { _tag: "ProbePlan", topics: ["Deep work", "Residue"] },
      { _tag: "ProbePlan", topics: ["Deep work", "Residue", "Boredom"] },
      question(1, "deep work"),
      { _tag: "ProbeHintAsked", question: 1 },
      { _tag: "ProbeHint", question: 1, text: "Think of the cost of a switch." },
      answer(1),
      judged(1, "sound", "right"),
    ];
    const findings = probeFindings(entries);
    assert.deepStrictEqual(
      findings.map(({ topic, state }) => [topic, state]),
      [
        ["deep work", "known-after-teaching"],
        ["Residue", "not-asked"],
        ["Boredom", "not-asked"],
      ],
    );
    assert.deepInclude(probeTally(findings), { asked: 1, topics: 3 });
  });

  it("lets a later judgment stand, but not one of an older question of the topic", () => {
    const entries: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      answer(1),
      judged(1, "sound", "wrong"),
      { _tag: "UserMessage", text: "I think I was right." },
    ];
    const disputed: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      answer(1),
      judged(1, "sound", "wrong"),
      { _tag: "UserMessage", text: "I think I was right." },
      judged(1, "sound", "right"),
    ];
    assert.strictEqual(probeFindings(entries)[0]?.state, "gap");
    assert.strictEqual(probeFindings(disputed)[0]?.state, "known");
    const older: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      answer(1),
      judged(1, "sound", "right"),
      question(2, "Residue"),
      answer(2),
      judged(2, "flawed", "wrong"),
      { _tag: "UserMessage", text: "Q1 was wrong after all?" },
      judged(1, "sound", "right"),
    ];
    assert.strictEqual(probeFindings(older)[0]?.state, "gap");
  });
});

describe("probeFindings and how sure", () => {
  it("does not count a right guess, or a right choice with no Reasoning, as known", () => {
    const guess: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      {
        _tag: "ProbeAnswer",
        question: 1,
        reasoning: "Because.",
        answer: "This.",
        teachMe: false,
        confidence: "guess",
      },
      judged(1, "sound", "right"),
    ];
    const bareChoice: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      { _tag: "ProbeAnswer", question: 1, reasoning: "", answer: "", teachMe: false, choice: [0] },
      judged(1, "none", "right"),
    ];
    const bareOpen: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      { _tag: "ProbeAnswer", question: 1, reasoning: "", answer: "This.", teachMe: false },
      judged(1, "none", "right"),
    ];
    assert.strictEqual(probeFindings(guess)[0]?.state, "unconfirmed");
    assert.strictEqual(probeFindings(bareChoice)[0]?.state, "unconfirmed");
    assert.strictEqual(probeFindings(bareOpen)[0]?.state, "known");
    assert.strictEqual(probeTally(probeFindings(guess)).unconfirmed, 1);
  });
});

describe("choiceResult", () => {
  it("is right only for the exact set, partly right for an overlap of many", () => {
    assert.strictEqual(choiceResult("one", [2], [2]), "right");
    assert.strictEqual(choiceResult("one", [2], [1]), "wrong");
    assert.strictEqual(choiceResult("many", [0, 2], [2, 0]), "right");
    assert.strictEqual(choiceResult("many", [0, 2], [0]), "partly-right");
    assert.strictEqual(choiceResult("many", [0, 2], [0, 1, 2]), "partly-right");
    assert.strictEqual(choiceResult("many", [0, 2], [1]), "wrong");
  });
});

describe("publicEntries", () => {
  const choiceQuestion: SessionEntry = {
    _tag: "ProbeQuestion",
    number: 1,
    topic: "Residue",
    text: "Which is it?",
    again: null,
    choice: { select: "one", options: ["A", "B"], right: [0], tests: [null, "mix-up"] },
  };

  it("keeps a choice question's key out until it is answered", () => {
    const open = publicEntries([choiceQuestion])[0];
    assert.deepStrictEqual(open?._tag === "ProbeQuestion" ? open.choice : null, {
      select: "one",
      options: ["A", "B"],
    });
    const answered = publicEntries([
      choiceQuestion,
      { ...(answer(1) as Extract<SessionEntry, { _tag: "ProbeAnswer" }>), choice: [1] },
    ])[0];
    assert.deepInclude(answered?._tag === "ProbeQuestion" ? answered.choice : {}, { right: [0] });
  });

  it("keeps the AI's reasoning summaries since the last answer out, even before its question lands", () => {
    const streaming: ReadonlyArray<SessionEntry> = [
      question(1, "Residue"),
      answer(1),
      { _tag: "Thinking", text: "Make A the right option.", ms: 1000 },
    ];
    assert.deepInclude(publicEntries(streaming)[2], { text: "" });
    assert.deepInclude(publicEntries([...streaming, { _tag: "ProbeFinished", at: 1 }])[2], {
      text: "Make A the right option.",
    });
    const deeperAfterFinish = publicEntries([
      ...streaming,
      { _tag: "ProbeFinished", at: 1 },
      { _tag: "Thinking", text: "B is right.", ms: 1000 },
      { ...choiceQuestion, number: 2 } as SessionEntry,
    ]);
    assert.deepInclude(deeperAfterFinish[4], { text: "" });
    const later = deeperAfterFinish[5];
    assert.deepStrictEqual(later?._tag === "ProbeQuestion" ? later.choice : null, {
      select: "one",
      options: ["A", "B"],
    });
  });

  it("keeps the AI's reasoning summaries out while a choice's key is hidden", () => {
    const thinking = (text: string): SessionEntry => ({ _tag: "Thinking", text, ms: 1000 });
    const entries: ReadonlyArray<SessionEntry> = [
      thinking("Plan the topics."),
      question(1, "Residue"),
      answer(1),
      thinking("Make A the right option."),
      { ...choiceQuestion, number: 2 } as SessionEntry,
      thinking("A hint without the answer."),
    ];
    assert.deepStrictEqual(
      publicEntries(entries).flatMap((entry) => (entry._tag === "Thinking" ? [entry.text] : [])),
      ["Plan the topics.", "", ""],
    );
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

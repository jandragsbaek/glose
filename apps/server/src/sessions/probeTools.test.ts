import { assert, describe, it } from "@effect/vitest";
import type { SessionEntry } from "@glose/contracts";

import { validChoice } from "./probe.ts";
import { correctedKey, judgeAnswer } from "./probeJudging.ts";
import { choiceOf } from "./probeTools.ts";

const option = (
  text: string,
  right: boolean,
  tests: string | null = right ? null : "a mix-up",
) => ({
  text,
  right,
  tests,
});

const ask = (select: "one" | "many", options: ReadonlyArray<ReturnType<typeof option>>) => ({
  topic: "Residue",
  question: "Which?",
  again_of: null,
  form: "choice" as const,
  select,
  options,
});

describe("choiceOf", () => {
  it("refuses a choice that cannot test a misconception fairly", () => {
    const refusals: ReadonlyArray<[string, ReturnType<typeof ask>]> = [
      ["one option", ask("one", [option("A", true)])],
      [
        "six options",
        ask(
          "one",
          ["A", "B", "C", "D", "E", "F"].map((t, i) => option(t, i === 0)),
        ),
      ],
      ["two the same", ask("one", [option("Time", true), option("time", false)])],
      ["none right", ask("one", [option("A", false), option("B", false)])],
      ["two right for one", ask("one", [option("A", true), option("B", true), option("C", false)])],
      ["all right", ask("many", [option("A", true), option("B", true)])],
      ["a wrong option tests nothing", ask("one", [option("A", true), option("B", false, " ")])],
    ];
    for (const [why, asked] of refusals) {
      const result = choiceOf(asked);
      assert.isTrue(result !== undefined && "error" in result, why);
    }
  });

  it("keeps the key: the right options, and what each wrong one tests", () => {
    assert.deepStrictEqual(
      choiceOf(ask("many", [option("A", true), option("B", false, "fatigue"), option("C", true)])),
      { select: "many", options: ["A", "B", "C"], right: [0, 2], tests: [null, "fatigue", null] },
    );
  });
});

describe("validChoice", () => {
  const question = (select: "one" | "many") => ({
    _tag: "ProbeQuestion" as const,
    number: 1,
    topic: "Residue",
    text: "Which?",
    again: null,
    choice: { select, options: ["A", "B", "C"] },
  });

  it("takes options that exist, one for choose one, sorted and once each", () => {
    assert.deepStrictEqual(validChoice(question("many"), [2, 0, 2]), [0, 2]);
    assert.deepStrictEqual(validChoice(question("one"), [1]), [1]);
    assert.isUndefined(validChoice(question("one"), [0, 1]));
    assert.isUndefined(validChoice(question("many"), [3]));
    assert.isUndefined(validChoice(question("many"), []));
    assert.isUndefined(validChoice(question("many"), [0.5]));
  });
});

describe("correctedKey", () => {
  const choice = {
    select: "one" as const,
    options: ["Worse work", "Lost time", "Tiredness"],
    right: [0],
    tests: [null, "time", "fatigue"],
  };
  const wrong = (tests: string | null = "a mix-up") => ({ right: false, tests });
  const right = { right: true, tests: null };

  it("holds a corrected key to the rules of a new one", () => {
    const refusals: ReadonlyArray<
      [string, ReadonlyArray<{ right: boolean; tests: string | null }>]
    > = [
      ["too few entries", [right, wrong()]],
      ["two right for one", [right, right, wrong()]],
      ["none right", [wrong(), wrong(), wrong()]],
      ["a wrong option tests nothing", [wrong(null), right, wrong()]],
    ];
    for (const [why, corrected] of refusals) {
      assert.property(correctedKey(choice, corrected), "error", why);
    }
    assert.deepStrictEqual(correctedKey(choice, [wrong("quality only"), right, wrong("fatigue")]), {
      ...choice,
      right: [1],
      tests: ["quality only", null, "fatigue"],
    });
  });
});

describe("judgeAnswer", () => {
  const entries: ReadonlyArray<SessionEntry> = [
    { _tag: "ProbeQuestion", number: 1, topic: "Residue", text: "Why?", again: null },
    { _tag: "ProbeAnswer", question: 1, reasoning: "Because.", answer: "Time.", teachMe: false },
    {
      _tag: "ProbeJudgment",
      question: 1,
      reasoning: "sound",
      reasoningWhy: "",
      result: "wrong",
      resultWhy: "",
      quote: null,
    },
    { _tag: "UserMessage", text: "I was right.", question: 1 },
  ];
  const judge = {
    question: 1,
    reasoning_verdict: "sound",
    reasoning_why: "Yes.",
    result_verdict: "right",
    result_why: "Yes.",
    quote: null,
    corrected_options: null,
  };

  it("judges again only in the turn after a dispute of that question", () => {
    const [allowed, after] = judgeAnswer(entries, judge);
    assert.notProperty(allowed, "error");
    assert.strictEqual(after.length, entries.length + 1);
    const closedBy: ReadonlyArray<SessionEntry> = [
      { _tag: "ProbeHintAsked", question: 2 },
      { _tag: "UserMessage", text: "What does this mean?", question: 2 },
      { _tag: "ProbeAnswer", question: 2, reasoning: "", answer: "So.", teachMe: false },
    ];
    for (const later of closedBy) {
      const [refused, unchanged] = judgeAnswer([...entries, later], judge);
      assert.property(refused, "error", later._tag);
      assert.strictEqual(unchanged.length, entries.length + 1);
    }
  });
});

import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { BOOK_TEXT_DETAILS } from "@glose/contracts";

import * as Sources from "../vault/Sources.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect("goes deeper on one Passage of an Article, and not while a question is open", () =>
    Effect.gen(function* () {
      const { fake, layer } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("ask_question", {
          topic: "Residue",
          question: "Why does the next task suffer?",
          again_of: null,
        }),
        answer("Over to you."),
      );

      const { question, refused } = yield* Effect.gen(function* () {
        const sources = yield* Sources.Sources;
        const sessions = yield* Sessions;
        const article = yield* sources.importText({
          ...BOOK_TEXT_DETAILS,
          kind: "article",
          familyName: "Leroy",
          givenName: null,
          title: "Attention residue",
          firstPublished: 2009,
          edition: null,
          editionYear: null,
          publisher: null,
          translator: null,
          container: "A journal",
          markdown:
            "Part of the mind ==stays on the old task== after a switch, and ==the next task suffers==.\n",
        });
        const { id } = yield* sessions.goDeeper({ source: article.id, passage: "1.1" });
        yield* afterTurn(id);
        const refused = yield* sessions
          .goDeeper({ source: article.id, passage: "1.2" })
          .pipe(Effect.flip);
        const view = yield* sessions.watch(id).pipe(Stream.runHead, Effect.map(Option.getOrThrow));
        return {
          question: view.entries.find((entry) => entry._tag === "ProbeQuestion"),
          refused: refused._tag,
        };
      }).pipe(Effect.provide(layer));

      assert.deepInclude(question, { paragraph: 1, passage: "stays on the old task" });
      assert.strictEqual(refused, "SessionBusy", "a second Passage waits for the open question");
    }),
  );

  it.effect(
    "runs a Probe: asks, judges Reasoning and result apart from one answer, teaches the gap, asks again, and keeps a record",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId, bodies } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("ask_question", {
            topic: "Attention residue",
            question: "What lingers after a switch?",
            again_of: null,
          }),
          answer("Over to you."),
          toolCall("judge_answer", {
            question: 1,
            reasoning_verdict: "sound",
            reasoning_why: "You found the cause.",
            result_verdict: "partly-right",
            result_why: "The cost is worse work, not time.",
            quote: "so i LOSE time",
          }),
          toolCall("teach", {
            kind: "gap",
            topic: "Attention residue",
            question: 1,
            text: "Leroy found that the next task suffers.",
          }),
          toolCall("ask_question", {
            topic: "Attention residue",
            question: "What happens to the next hour?",
            again_of: 1,
          }),
          answer("Try again."),
        );

        const session = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "probe", subject: sourceId });
          yield* afterTurn(id);
          yield* sessions.answerProbe({
            id,
            question: 1,
            reasoning: "",
            answer: "Part of my mind stays on the old task, so I lose time to refocus.",
            teachMe: false,
          });
          yield* afterTurn(id);
          const late = yield* sessions
            .answerProbe({ id, question: 1, reasoning: "", answer: "Again.", teachMe: false })
            .pipe(Effect.flip);
          assert.strictEqual(late._tag, "QuestionNotOpen");
          yield* sessions.finishProbe(id);
          return yield* sessions.watch(id).pipe(Stream.runHead, Effect.map(Option.getOrThrow));
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(
          session.entries.map((entry) => entry._tag),
          [
            "ProbeQuestion",
            "AiMessage",
            "ProbeAnswer",
            "ProbeJudgment",
            "ProbeTaught",
            "ProbeQuestion",
            "AiMessage",
            "ProbeFinished",
          ],
        );
        assert.deepStrictEqual(session.entries[3], {
          _tag: "ProbeJudgment",
          question: 1,
          reasoning: "sound",
          reasoningWhy: "You found the cause.",
          result: "partly-right",
          resultWhy: "The cost is worse work, not time.",
          quote: "so I lose time",
        });
        assert.deepStrictEqual(session.entries[5], {
          _tag: "ProbeQuestion",
          number: 2,
          topic: "Attention residue",
          text: "What happens to the next hour?",
          again: 1,
        });

        const [first] = bodies();
        assert.include(JSON.stringify(first!.input[0]), "Start the Probe now.");
        assert.deepStrictEqual(bodies()[2]!.input.at(-1), {
          type: "message",
          role: "user",
          content:
            "(Answer to question 1)\n\nMy answer, with how I got there:\nPart of my mind stays on the old task, so I lose time to refocus.",
        });

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const record = yield* fs.readFileString(path.join(vaultFolder, "Probes", `${sourceId}.md`));
        assert.include(record, "glose: probe\n");
        assert.include(record, `source: "[[${sourceId}]]"`);
        assert.include(record, "## Q1 · Attention residue\n\nWhat lingers after a switch?");
        assert.include(
          record,
          "**Your answer:** Part of my mind stays on the old task, so I lose time to refocus.",
        );
        assert.include(
          record,
          "> [!ai] Judged\n> Reasoning sound. You found the cause.\n>\n> Result partly right.",
        );
        assert.include(record, "> [!ai] Taught · Attention residue\n> Leroy found");
        assert.include(record, "## Q2 · Attention residue (Q1 again)");
        assert.include(
          record,
          "## What the Probe found\n\n- Attention residue: Taught, not confirmed yet",
        );
        assert.match(record, /finished: \d{4}-\d{2}-\d{2}/);
      }).pipe(Effect.scoped),
  );

  it.effect(
    "asks a choice question: plans, talks and hints while it is open, checks the choice in code, and judges again after a dispute",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId, bodies } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST, MODEL_LIST, MODEL_LIST, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("plan_topics", { topics: ["Attention residue", "Deep work", "deep work "] }),
          toolCall("ask_question", {
            topic: "Attention residue",
            question: "What does a switch cost?",
            again_of: null,
            form: "choice",
            select: "one",
            options: [
              { text: "Worse work on the next task", right: true, tests: null },
              { text: "Lost time only", right: false, tests: "sees the cost as time" },
              { text: "Tiredness", right: false, tests: "confuses residue with fatigue" },
            ],
          }),
          answer("Choose one."),
          answer("A change from one task to another."),
          toolCall("give_hint", { question: 1, text: "Think of the quality, not the clock." }),
          answer("Over to you."),
        );

        const session = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "probe", subject: sourceId });
          yield* afterTurn(id);
          const early = yield* (yield* FileSystem.FileSystem).readFileString(
            (yield* Path.Path).join(vaultFolder, "Probes", `${sourceId}.md`),
          );
          assert.include(early, "B. Lost time only");
          assert.notInclude(early, "(right)", "the record keeps the key until the answer");
          yield* sessions.send({ id, text: "What is a switch here?" });
          yield* afterTurn(id);
          yield* sessions.askHint({ id, question: 1 });
          yield* afterTurn(id);
          const two = yield* sessions
            .answerProbe({
              id,
              question: 1,
              reasoning: "",
              answer: "",
              teachMe: false,
              choice: [0, 1],
            })
            .pipe(Effect.flip);
          assert.strictEqual(two._tag, "QuestionNotOpen", "choose one takes one option");
          fake.answer(
            RESPONSES,
            toolCall("judge_answer", {
              question: 1,
              reasoning_verdict: "partly-sound",
              reasoning_why: "Time is part of it.",
              result_verdict: "right",
              result_why: "Exactly right.",
              quote: null,
              corrected_options: null,
            }),
            toolCall("judge_answer", {
              question: 1,
              reasoning_verdict: "partly-sound",
              reasoning_why: "Time is part of it.",
              result_verdict: "wrong",
              result_why: "Time is lost, but the work suffers more.",
              quote: null,
              corrected_options: null,
            }),
            toolCall("judge_answer", {
              question: 1,
              reasoning_verdict: "sound",
              reasoning_why: "Twice.",
              result_verdict: "wrong",
              result_why: "Twice.",
              quote: null,
              corrected_options: null,
            }),
            answer("Let us look at it."),
          );
          yield* sessions.answerProbe({
            id,
            question: 1,
            reasoning: "Switching costs time.",
            answer: "ignored",
            teachMe: false,
            choice: [1],
            confidence: "sure",
          });
          yield* afterTurn(id);
          fake.answer(
            RESPONSES,
            toolCall("judge_answer", {
              question: 1,
              reasoning_verdict: "sound",
              reasoning_why: "Your point on time holds.",
              result_verdict: "right",
              result_why: "In this book, lost time is the cost the study measured.",
              quote: null,
              corrected_options: [
                { right: false, tests: "sees quality as the only cost" },
                { right: true, tests: null },
                { right: false, tests: "confuses residue with fatigue" },
              ],
            }),
            answer("Judged again: my key was wrong."),
          );
          yield* sessions.send({ id, text: "But time is lost too!", judgment: 1 });
          yield* afterTurn(id);
          yield* sessions.finishProbe(id);
          return yield* sessions.watch(id).pipe(Stream.runHead, Effect.map(Option.getOrThrow));
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(
          session.entries.map((entry) => entry._tag),
          [
            "ProbePlan",
            "ProbeQuestion",
            "AiMessage",
            "UserMessage",
            "AiMessage",
            "ProbeHintAsked",
            "ProbeHint",
            "AiMessage",
            "ProbeAnswer",
            "ProbeJudgment",
            "AiMessage",
            "UserMessage",
            "ProbeJudgment",
            "AiMessage",
            "ProbeFinished",
          ],
        );
        assert.deepStrictEqual(session.entries[0], {
          _tag: "ProbePlan",
          topics: ["Attention residue", "Deep work"],
        });
        assert.deepInclude(session.entries[3], { text: "What is a switch here?", question: 1 });
        assert.deepInclude(session.entries[8], {
          answer: "",
          choice: [1],
          confidence: "sure",
        });
        assert.deepInclude(session.entries[9], {
          result: "wrong",
          reasoning: "partly-sound",
          resultWhy: "Time is lost, but the work suffers more.",
        });
        assert.deepInclude(session.entries[11], { text: "But time is lost too!", question: 1 });
        assert.deepInclude(session.entries[12], { result: "right", reasoning: "sound" });
        assert.deepInclude(
          session.entries[1]?._tag === "ProbeQuestion" ? session.entries[1].choice : {},
          {
            right: [1],
            tests: ["sees quality as the only cost", null, "confuses residue with fatigue"],
          },
        );

        const inputs = bodies().map((body) => body.input.at(-1));
        assert.deepInclude(inputs, {
          type: "message",
          role: "user",
          content: "(While question 1 is open) What is a switch here?",
        });
        assert.deepInclude(inputs, {
          type: "message",
          role: "user",
          content: "(Hint for question 1) Give me a hint, not the answer.",
        });
        assert.deepInclude(inputs, {
          type: "message",
          role: "user",
          content:
            "(Answer to question 1)\n\nMy Reasoning:\nSwitching costs time.\n\nMy choice:\nB) Lost time only\n\nHow sure I am: sure\n\nGlose checked the choice: wrong. A chosen option tests: sees the cost as time.",
        });
        const outputs = bodies()
          .flatMap((body) => body.input)
          .filter((item) => item.type === "function_call_output")
          .map((item) => String(item["output"]));
        assert.isTrue(
          outputs.some((output) => output.includes("check of the choice says the result is wrong")),
          "a choice's result follows Glose's check",
        );
        assert.isTrue(
          outputs.some((output) => output.includes("judged already")),
          "a second judgment needs a dispute first",
        );
        assert.deepInclude(inputs, {
          type: "message",
          role: "user",
          content: "(About your judgment of question 1) But time is lost too!",
        });

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const record = yield* fs.readFileString(path.join(vaultFolder, "Probes", `${sourceId}.md`));
        assert.include(
          record,
          "A. Worse work on the next task *(tests: sees quality as the only cost)*\nB. Lost time only *(right)*",
        );
        assert.include(record, "**Your choice:** B\n\n**How sure:** Sure");
        assert.include(record, "> [!ai] Hint\n> Think of the quality, not the clock.");
        assert.include(record, "**You · Q1:** But time is lost too!");
        assert.include(record, "> [!ai] AI\n> Judged again: my key was wrong.");
        assert.include(record, "> [!ai] Judged again · Q1\n> Reasoning sound.");
        assert.include(record, "- Attention residue: Known after help\n- Deep work: Not asked");
      }).pipe(Effect.scoped),
  );

  it.effect("lets Extraction read the Probe and quote only the user's own words from it", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId, bodies } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("ask_question", { topic: "Residue", question: "Why?", again_of: null }),
        answer("Go."),
        answer("Taught."),
      );
      const points = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "probe", subject: sourceId });
        yield* afterTurn(id);
        yield* sessions.answerProbe({
          id,
          question: 1,
          reasoning: "Part of my mind stays on the old task.",
          answer: "",
          teachMe: true,
        });
        yield* afterTurn(id);
        fake.answer(
          RESPONSES,
          toolCall("read_probe"),
          toolCall("propose_points", {
            points: ["Part of my mind stays on the old task", "Leroy ran the study in 2009"].map(
              (quote) => ({
                title: `Point: ${quote}`,
                origin: "probe",
                quote,
                repeats: null,
                pulls_against_note: null,
                pulls_against_why: null,
                links: [],
                draft: "A draft.",
              }),
            ),
          }),
          answer("Two points."),
        );
        const extraction = yield* sessions.start({ kind: "extraction", subject: sourceId });
        const done = yield* afterTurn(extraction.id);
        return done.entries.flatMap((entry) => (entry._tag === "Points" ? entry.points : []));
      }).pipe(Effect.provide(layer));

      assert.deepStrictEqual(
        points.map((point) => [point.origin, point.quote]),
        [
          ["probe", "Part of my mind stays on the old task"],
          ["probe", null],
        ],
      );
      const probeOutput = bodies()
        .flatMap((body) => body.input)
        .find(
          (item) =>
            item.type === "function_call_output" && String(item["output"]).includes("findings"),
        );
      assert.include(String(probeOutput?.["output"]), "Part of my mind stays on the old task.");
      assert.include(String(probeOutput?.["output"]), '"askedToBeTaught":true');
    }).pipe(Effect.scoped),
  );
});

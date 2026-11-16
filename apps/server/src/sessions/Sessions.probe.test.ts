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
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect(
    "runs a Probe: asks, judges Reasoning and result apart, teaches the gap, asks again, and keeps a record",
    () =>
      Effect.gen(function* () {
        const { fake, layer, graphFolder, sourceId, bodies } = yield* setUp;
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
            reasoning: "Part of my mind stays on the old task, so I lose time.",
            answer: "Time to refocus.",
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
            "(Answer to question 1)\n\nMy Reasoning:\nPart of my mind stays on the old task, so I lose time.\n\nMy answer:\nTime to refocus.",
        });

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const record = yield* fs.readFileString(path.join(graphFolder, "Probes", `${sourceId}.md`));
        assert.include(record, "glose: probe\n");
        assert.include(record, `source: "[[${sourceId}]]"`);
        assert.include(record, "## Q1 · Attention residue\n\nWhat lingers after a switch?");
        assert.include(
          record,
          "**Your Reasoning:** Part of my mind stays on the old task, so I lose time.",
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

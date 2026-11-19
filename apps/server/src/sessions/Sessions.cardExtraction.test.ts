import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as Cards from "../cards/Cards.ts";
import {
  afterTurn,
  answer,
  type Body,
  isChecks,
  MODEL_LIST,
  MODELS,
  NOTE,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect("proposes Cards from a passage of a Note, and saves the ones the user keeps", () =>
    Effect.gen(function* () {
      const { fake, layer, vaultFolder, bodies } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("read_note", { name: NOTE }),
        toolCall("propose_cards", {
          cards: [
            { question: "Who found attention residue?", answer: "Leroy." },
            { question: "  ", answer: "A Card without a question is not shown." },
            { question: "What lingers after a switch?", answer: "Attention." },
          ],
        }),
        answer("Two Cards on the finding."),
        answer("Harder ones."),
      );

      const session = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({
          kind: "card-extraction",
          subject: NOTE.toLowerCase(),
          passage: "Leroy found that attention lingers.",
        });
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));

      assert.strictEqual(session.subject, NOTE);
      const withoutScores = session.entries.map((entry) =>
        entry._tag === "CardProposals"
          ? { ...entry, proposals: entry.proposals.map(({ score: _score, ...rest }) => rest) }
          : entry,
      );
      assert.deepStrictEqual(withoutScores, [
        { _tag: "Passage", text: "Leroy found that attention lingers." },
        { _tag: "ToolUse", tool: "read-note", detail: NOTE },
        {
          _tag: "CardProposals",
          proposals: [
            {
              id: "p1",
              question: "Who found attention residue?",
              answer: "Leroy.",
              state: "open",
              card: null,
            },
            {
              id: "p2",
              question: "What lingers after a switch?",
              answer: "Attention.",
              state: "open",
              card: null,
            },
          ],
        },
        { _tag: "AiMessage", text: "Two Cards on the finding." },
      ]);
      const [first, afterRead] = bodies();
      assert.include(
        String(first!.input.at(-1)?.["content"]),
        "Leroy found that attention lingers.",
      );
      const noteRead = afterRead!.input.find((item) => item.type === "function_call_output");
      assert.include(String(noteRead?.["output"]), "Leroy found that attention lingers.");

      const kept = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const card = yield* sessions.keepProposal({
          id: session.id,
          proposal: "p1",
          question: "Who found attention residue?",
          answer: "Sophie Leroy, in 2009.",
        });
        yield* sessions.dropProposal({ id: session.id, proposal: "p2" });
        const again = yield* Effect.exit(
          sessions.keepProposal({ id: session.id, proposal: "p2", question: "Q?", answer: "" }),
        );
        assert.isTrue(again._tag === "Failure");
        return card;
      }).pipe(Effect.provide(layer));

      const after = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        yield* sessions.send({ id: session.id, text: "Harder, please." });
        const done = yield* afterTurn(session.id);
        return { card: kept, done, cards: yield* (yield* Cards.Cards).list };
      }).pipe(Effect.provide(layer));

      assert.deepInclude(after.card, { from: NOTE, ai: true, answer: "Sophie Leroy, in 2009." });
      assert.deepStrictEqual(after.cards, [after.card]);
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      assert.isTrue(yield* fs.exists(path.join(vaultFolder, "Cards", `${after.card.file}.md`)));
      const proposals = after.done.entries.flatMap((entry) =>
        entry._tag === "CardProposals" ? entry.proposals : [],
      );
      assert.deepStrictEqual(
        proposals.map(({ state, card }) => [state, card]),
        [
          ["kept", after.card.file],
          ["dropped", null],
        ],
      );

      const [decisions, message] = bodies().at(-1)!.input.slice(-2);
      assert.strictEqual(decisions?.["role"], "developer");
      assert.include(String(decisions?.["content"]), "Sophie Leroy, in 2009.");
      assert.include(String(decisions?.["content"]), 'Dropped "What lingers after a switch?"');
      assert.deepStrictEqual(message, {
        type: "message",
        role: "user",
        content: "Harder, please.",
      });
    }).pipe(Effect.scoped),
  );

  it.effect(
    "checks proposed Cards: rules at once, then the AI answers each question blind and judges",
    () =>
      Effect.gen(function* () {
        const { fake, layer } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("propose_cards", {
            cards: [
              { question: "Does attention linger after a switch?", answer: "Yes." },
              {
                question: "What did Leroy find about switching tasks?",
                answer: "Attention lingers.",
              },
            ],
          }),
          answer("Two Cards."),
        );
        const verdict = (verdictOf: "pass" | "warn" | "fail", note = "") => ({
          verdict: verdictOf,
          note,
        });
        const passing = {
          "one-answer": verdict("pass"),
          specific: verdict("pass"),
          "self-contained": verdict("pass"),
          "one-idea": verdict("pass"),
          "true-to-note": verdict("pass"),
        };
        fake.answerMatching(
          RESPONSES,
          isChecks,
          answer(
            JSON.stringify({
              cards: [
                { id: "1", answers: ["Yes."] },
                { id: "2", answers: ["Attention lingers.", "Performance drops."] },
              ],
            }),
          ),
          answer(
            JSON.stringify({
              cards: [
                { id: "1", checks: passing },
                {
                  id: "2",
                  checks: {
                    ...passing,
                    "one-answer": verdict("fail", "Ask what lingers, not what Leroy found."),
                  },
                },
              ],
            }),
          ),
        );

        const session = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "card-extraction", subject: NOTE });
          return yield* sessions.watch(id).pipe(
            Stream.filter(
              (now) =>
                !now.working &&
                now.entries.some(
                  (entry) =>
                    entry._tag === "CardProposals" &&
                    entry.proposals.every((proposal) => proposal.score?.judge === "done"),
                ),
            ),
            Stream.runHead,
            Effect.map(Option.getOrThrow),
          );
        }).pipe(Effect.provide(layer));

        const [yesNo, broad] = session.entries.flatMap((entry) =>
          entry._tag === "CardProposals" ? entry.proposals : [],
        );
        const failed = (proposal: typeof yesNo) =>
          proposal?.score?.checks.filter((check) => check.verdict !== "pass");
        assert.strictEqual(yesNo?.score?.grade, "poor");
        assert.deepStrictEqual(failed(yesNo), [{ id: "recall", verdict: "fail", note: null }]);
        assert.strictEqual(broad?.score?.grade, "poor");
        assert.deepStrictEqual(failed(broad), [
          {
            id: "one-answer",
            verdict: "fail",
            note: "Ask what lingers, not what Leroy found.",
          },
        ]);

        const [blind, judge] = fake.requests.filter(
          (request) => request.url === RESPONSES && isChecks(request.body),
        );
        const blindInput = JSON.stringify((JSON.parse(blind!.body) as Body).input);
        assert.include(blindInput, "What did Leroy find about switching tasks?");
        assert.include(blindInput, "Leroy found that attention lingers.");
        assert.notInclude(blindInput, "expectedAnswer");
        const judgeInput = JSON.stringify((JSON.parse(judge!.body) as Body).input);
        assert.include(judgeInput, "expectedAnswer");
        assert.include(judgeInput, "Performance drops.");
      }).pipe(Effect.scoped),
  );

  it.effect("tries failed Card Checks again when the user opens the Session again", () =>
    Effect.gen(function* () {
      const { fake, layer } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("propose_cards", {
          cards: [{ question: "What did Leroy find about switching?", answer: "It lingers." }],
        }),
        answer("One Card."),
      );
      const judgeOf = (session: { readonly entries: ReadonlyArray<unknown> }) =>
        (
          session.entries as Array<{
            _tag: string;
            proposals?: Array<{ score?: { judge: string } }>;
          }>
        ).flatMap((entry) => entry.proposals ?? [])[0]?.score?.judge;

      const final = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "card-extraction", subject: NOTE });
        yield* sessions.watch(id).pipe(
          Stream.filter((now) => judgeOf(now) === "failed"),
          Stream.runHead,
        );
        const passing = { verdict: "pass", note: "" };
        fake.answer(MODELS, MODEL_LIST);
        fake.answerMatching(
          RESPONSES,
          isChecks,
          answer(JSON.stringify({ cards: [{ id: "1", answers: ["It lingers."] }] })),
          answer(
            JSON.stringify({
              cards: [
                {
                  id: "1",
                  checks: {
                    "one-answer": passing,
                    specific: passing,
                    "self-contained": passing,
                    "one-idea": passing,
                    "true-to-note": passing,
                  },
                },
              ],
            }),
          ),
        );
        yield* sessions.find({ kind: "card-extraction", subject: NOTE });
        return yield* sessions.watch(id).pipe(
          Stream.filter((now) => judgeOf(now) === "done"),
          Stream.runHead,
          Effect.map(Option.getOrThrow),
        );
      }).pipe(Effect.provide(layer));
      assert.strictEqual(judgeOf(final), "done");
    }).pipe(Effect.scoped),
  );
});

import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { localDay } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { Passages } from "../vault/Passages.ts";
import { Sessions } from "./Sessions.ts";

const EPOCH_DAY = localDay(0);

it.layer(NodeServices.layer)("Sessions with a book's Passages", (it) => {
  it.effect(
    "rests Points on a book's Passages, from the AI or the user, and cites them in the Note",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("read_passages", {}),
          toolCall("propose_points", {
            points: [
              {
                title: "Labour is used up as it is made",
                origin: "passage",
                quote: "labour leaves   nothing behind",
                repeats: null,
                pulls_against_note: null,
                pulls_against_why: null,
                links: [],
                draft: "What labour makes is consumed.",
              },
              {
                title: "A claim no Passage holds",
                origin: "passage",
                quote: "Words the user never copied",
                repeats: null,
                pulls_against_note: null,
                pulls_against_why: null,
                links: [],
                draft: "",
              },
            ],
          }),
          answer("Start with [1]."),
        );

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const result = yield* Effect.gen(function* () {
          const passages = yield* Passages;
          const labour = yield* passages.create({
            source: sourceId,
            page: "87",
            words: "Labour leaves nothing behind.",
            yourWords: "",
          });
          const world = yield* passages.create({
            source: sourceId,
            page: "xii",
            words: "Work [builds] a world.",
            yourWords: "",
          });
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
          const proposed = yield* afterTurn(id);
          const added = yield* sessions.addBookPassagesPoint({
            source: sourceId,
            passages: [world.id, labour.id],
            title: "What we make outlasts us, what we labour does not",
          });
          const name = yield* sessions.writePoint({
            id: added.session,
            point: added.point,
            title: "What we make outlasts us, what we labour does not",
            text: "Two kinds of making.",
            aiText: false,
            page: null,
            links: [],
          });
          yield* sessions.keepPoint({ id, point: "p1", title: "Labour is used up as it is made" });
          const proposedName = yield* sessions.writePoint({
            id,
            point: "p1",
            title: "Labour is used up as it is made",
            text: "Mine.",
            aiText: false,
            page: "87",
            links: [],
          });
          return { proposed, added, name, labour, world, id, proposedName };
        }).pipe(Effect.provide(layer));

        const points = result.proposed.entries.flatMap((entry) =>
          entry._tag === "Points" ? entry.points : [],
        );
        assert.deepStrictEqual(
          points.map(({ origin, quote, page, passages }) => ({ origin, quote, page, passages })),
          [
            {
              origin: "passage",
              quote: "Labour leaves nothing behind",
              page: "87",
              passages: [
                { id: result.labour.id, page: "87", words: "Labour leaves nothing behind." },
              ],
            },
            { origin: "ai", quote: null, page: null, passages: undefined },
          ],
        );
        assert.strictEqual(result.added.session, result.id);
        assert.strictEqual(
          yield* fs.readFileString(path.join(vaultFolder, `${result.name}.md`)),
          [
            "---",
            "glose: note",
            `source: "[[${sourceId}]]"`,
            "growth: seed",
            `created: ${EPOCH_DAY}`,
            `updated: ${EPOCH_DAY}`,
            "---",
            "",
            "Two kinds of making.",
            "",
            `[^q1]: “Work \\[builds\\] a world.” [[${result.world.id}|p. xii]]`,
            "",
            `[^q2]: “Labour leaves nothing behind.” [[${result.labour.id}|p. 87]]`,
            "",
          ].join("\n"),
        );
        const proposedNote = yield* fs.readFileString(
          path.join(vaultFolder, `${result.proposedName}.md`),
        );
        assert.include(proposedNote, "ai-title: true");
        assert.include(
          proposedNote,
          `[^q1]: “Labour leaves nothing behind.” [[${result.labour.id}|p. 87]]`,
        );
        const cited = yield* Effect.provide(
          Passages.use((passages) => passages.list(sourceId)),
          layer,
        );
        assert.deepStrictEqual(
          cited.map(({ id, usedBy }) => [id, [...usedBy].sort()]),
          [
            [result.labour.id, [result.name, result.proposedName].sort()],
            [result.world.id, [result.name]],
          ],
        );
      }).pipe(Effect.scoped),
  );
  it.effect("starts the Extraction in a Session the Passages desk made", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId, bodies } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        answer("A draft is beside your words."),
        answer("Here are the book's points."),
      );
      const session = yield* Effect.gen(function* () {
        const passage = yield* (yield* Passages).create({
          source: sourceId,
          page: "87",
          words: "Labour leaves nothing behind.",
          yourWords: "",
        });
        const sessions = yield* Sessions;
        const added = yield* sessions.addBookPassagesPoint({
          source: sourceId,
          passages: [passage.id],
          title: "Labour is used up",
        });
        yield* sessions.send({ id: added.session, text: "Draft it, please.", about: added.point });
        yield* afterTurn(added.session);
        const before = yield* sessions.find({ kind: "extraction", subject: sourceId });
        assert.strictEqual(before?.started, false);
        const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
        assert.strictEqual(id, added.session);
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));
      assert.deepStrictEqual(session.entries.at(-1), {
        _tag: "AiMessage",
        text: "Here are the book's points.",
      });
      assert.isTrue(session.started);
      assert.notInclude(JSON.stringify(bodies()[0]!.input), "Start the Extraction now.");
      assert.include(JSON.stringify(bodies()[1]!.input), "Start the Extraction now.");
    }).pipe(Effect.scoped),
  );
});

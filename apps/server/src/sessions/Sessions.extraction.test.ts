import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  NOTE,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect(
    "proposes Points with Graph flags, keeps only true quotes and real Notes, and writes a kept Point as a Note",
    () =>
      Effect.gen(function* () {
        const { fake, layer, graphFolder, sourceId, bodies } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("search_graph", { query: "attention lingers" }),
          toolCall("propose_points", {
            points: [
              {
                title: "Labour leaves nothing behind",
                origin: "free-text",
                quote: "“labour  leaves nothing behind”",
                repeats: null,
                pulls_against_note: null,
                pulls_against_why: null,
                links: [
                  { note: NOTE.toLowerCase(), why: "Both are about what remains." },
                  { note: "A Note that does not exist", why: "Made up." },
                ],
                draft: "  ",
              },
              {
                title: "Work builds a lasting world",
                origin: "ai",
                quote: "Work builds a world.",
                repeats: NOTE,
                pulls_against_note: "Nowhere",
                pulls_against_why: "Made up.",
                links: [],
                draft: " Work outlasts the worker.\n\nWhat it makes stays. ",
              },
            ],
          }),
          answer("Start with [1]."),
          answer("Good."),
        );

        const session = yield* Effect.gen(function* () {
          const { id } = yield* (yield* Sessions).start({ kind: "extraction", subject: sourceId });
          return yield* afterTurn(id);
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(session.entries, [
          { _tag: "ToolUse", tool: "search-graph", detail: "attention lingers" },
          {
            _tag: "Points",
            points: [
              {
                id: "p1",
                title: "Labour leaves nothing behind",
                origin: "free-text",
                quote: "Labour leaves nothing behind",
                repeats: null,
                pullsAgainst: null,
                links: [{ note: NOTE, why: "Both are about what remains.", added: false }],
                draft: null,
                state: "open",
                note: null,
                page: null,
              },
              {
                id: "p2",
                title: "Work builds a lasting world",
                origin: "ai",
                quote: null,
                repeats: NOTE,
                pullsAgainst: null,
                links: [],
                draft: "Work outlasts the worker.\n\nWhat it makes stays.",
                state: "open",
                note: null,
                page: null,
              },
            ],
          },
          { _tag: "AiMessage", text: "Start with [1]." },
        ]);
        const searched = bodies()[1]!.input.find((item) => item.type === "function_call_output");
        assert.include(String(searched?.["output"]), NOTE);

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const note = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          yield* sessions.keepPoint({
            id: session.id,
            point: "p1",
            title: "Labour leaves nothing",
          });
          const name = yield* sessions.writePoint({
            id: session.id,
            point: "p1",
            title: "Labour leaves nothing",
            text: "My own words.",
            aiText: false,
            page: "7",
            links: [NOTE.toUpperCase(), "Not proposed"],
          });
          yield* sessions.keepPoint({
            id: session.id,
            point: "p2",
            title: "Work builds a lasting world",
          });
          const drafted = yield* sessions.writePoint({
            id: session.id,
            point: "p2",
            title: "Work builds a lasting world",
            text: "Work outlasts the worker.\n\nWhat it makes stays, for a time.",
            aiText: true,
            page: null,
            links: [],
          });
          yield* sessions.addPoint({ id: session.id, title: "labour leaves nothing" });
          const taken = yield* Effect.flip(
            sessions.writePoint({
              id: session.id,
              point: "p3",
              title: "labour leaves nothing",
              text: "Twice.",
              aiText: false,
              page: null,
              links: [],
            }),
          );
          assert.strictEqual(taken._tag, "NoteNameTaken");
          yield* sessions.send({ id: session.id, text: "Is this right?", about: "p1" });
          yield* afterTurn(session.id);
          return { name, drafted };
        }).pipe(Effect.provide(layer));

        assert.strictEqual(note.name, "Labour leaves nothing");
        assert.strictEqual(
          yield* fs.readFileString(path.join(graphFolder, `${note.name}.md`)),
          [
            "---",
            "glose: note",
            `source: "[[${sourceId}]]"`,
            'page: "7"',
            "ai: true",
            "ai-title: true",
            "---",
            "",
            "My own words.",
            "",
            `Related: [[${NOTE}]]`,
            "",
          ].join("\n"),
        );
        assert.strictEqual(
          yield* fs.readFileString(path.join(graphFolder, `${note.drafted}.md`)),
          [
            "---",
            "glose: note",
            `source: "[[${sourceId}]]"`,
            "ai: true",
            "ai-title: true",
            "---",
            "",
            "> [!ai]",
            "> Work outlasts the worker.",
            ">",
            "> What it makes stays, for a time.",
            "",
          ].join("\n"),
        );
        const next = bodies().at(-1)!.input;
        const decisions = String(next.at(-2)?.["content"]);
        assert.include(decisions, 'Kept point 1 "Labour leaves nothing behind"');
        assert.include(decisions, "Wrote point 1");
        assert.include(decisions, 'In their own words: """My own words."""');
        assert.include(decisions, "Wrote point 2");
        assert.include(
          decisions,
          'It keeps your draft, edited by them and marked as AI text: """Work outlasts the worker.\n\nWhat it makes stays, for a time."""',
        );
        assert.include(decisions, 'Added point 3 "labour leaves nothing" in their own words');
        assert.deepStrictEqual(next.at(-1), {
          type: "message",
          role: "user",
          content: '(About point 1: "Labour leaves nothing")\n\nIs this right?',
        });
      }).pipe(Effect.scoped),
  );
});

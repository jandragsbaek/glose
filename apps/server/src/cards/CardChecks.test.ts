import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as Server from "../server.ts";
import * as Settings from "../settings/Settings.ts";
import { writeCredentials } from "../testkit/credentials.ts";
import { makeDirs } from "../testkit/graph.ts";
import { FAKE_OPENAI, makeFakeOpenAi, type Answer } from "../testkit/openai.ts";
import { CardChecks } from "./CardChecks.ts";
import { Cards } from "./Cards.ts";

const RESPONSES = `${FAKE_OPENAI.apiUrl}/responses`;
const MODELS = `${FAKE_OPENAI.apiUrl}/models`;
const MODEL_LIST: Answer = {
  status: 200,
  body: { models: [{ slug: "gpt-test", display_name: "GPT Test", visibility: "list" }] },
};
const NOTE = "Attention residue lowers performance";

/** A streamed answer whose text is this JSON, as a structured answer arrives. */
const json = (value: unknown): Answer => ({
  status: 200,
  sse: true,
  body: [
    {
      type: "response.output_item.done",
      item: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: JSON.stringify(value) }],
      },
    },
    { type: "response.completed", response: {} },
  ],
});

const PASS = { verdict: "pass", note: "" };

/** A Graph with one Note and two Cards from it; signed in to ChatGPT when asked. */
const setUp = (signedIn: boolean, { expired = false } = {}) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const fake = yield* makeFakeOpenAi;
    if (signedIn) {
      yield* writeCredentials(dirs, {
        hostId: "urn:uuid:host-1",
        active: "user-1",
        accounts: [
          {
            subject: "user-1",
            email: "reader@example.com",
            clientId: "oaiapp_1",
            tokens: {
              idToken: "id-1",
              accessToken: "access-1",
              refreshToken: "refresh-1",
              // An expired token makes Glose refresh it before the AI Checks.
              expiresAt: expired ? 0 : 10_000_000_000,
              scopes: ["chatgpt.tokens.use.direct"],
            },
            planNoticeSeen: true,
          },
        ],
      });
    }
    // A new layer is a new start of Glose over the same folders.
    const start = () =>
      Server.layerApp.pipe(
        Layer.provide(fake.layer),
        Layer.provide(NodeServices.layer),
        Layer.provide(ServerConfig.layerTest(dirs)),
      );
    const graphFolder = path.join(dirs.homeDir, "Glose");
    const files = yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        graphFolder,
        action: "create",
      });
      yield* (yield* FileSystem.FileSystem).writeFileString(
        path.join(graphFolder, `${NOTE}.md`),
        "---\nglose: note\n---\n\nLeroy found that attention lingers after a task switch.\n",
      );
      const cards = yield* Cards;
      const first = yield* cards.create({
        from: NOTE,
        question: "Who found that attention lingers after a task switch?",
        answer: "Sophie Leroy.",
        ai: true,
      });
      const second = yield* cards.create({
        from: NOTE,
        question: "Is attention residue real?",
        answer: "Yes.",
        ai: false,
      });
      return [first.file, second.file] as const;
    }).pipe(Effect.provide(start()));
    const scored = Effect.gen(function* () {
      return yield* (yield* CardChecks).score(yield* (yield* Cards).list);
    });
    const checkRequests = () => fake.requests.filter((request) => request.url === RESPONSES);
    return { fake, start, files, scored, checkRequests };
  });

it.layer(NodeServices.layer)("CardChecks", (it) => {
  it.effect("scores Cards by rules at once, and leaves the AI Checks off without ChatGPT", () =>
    Effect.gen(function* () {
      const { start, files, scored, checkRequests } = yield* setUp(false);
      const all = yield* Effect.gen(function* () {
        yield* (yield* CardChecks).judgeFiles(files);
        return yield* scored;
      }).pipe(Effect.provide(start()));
      const [good, yesNo] = files.map((file) => all.find((card) => card.file === file));
      assert.deepStrictEqual(
        [good?.score.grade, good?.score.judge, yesNo?.score.grade, yesNo?.score.judge],
        ["good", "off", "poor", "off"],
      );
      assert.lengthOf(checkRequests(), 0);
    }).pipe(Effect.scoped),
  );

  it.effect("runs the AI Checks of the Cards asked for once, and keeps them past a restart", () =>
    Effect.gen(function* () {
      const { fake, start, files, scored, checkRequests } = yield* setUp(true);
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        json({ cards: [{ id: "1", answers: ["Sophie Leroy."] }] }),
        json({
          cards: [
            {
              id: "1",
              checks: {
                "one-answer": PASS,
                specific: PASS,
                "self-contained": PASS,
                "one-idea": PASS,
                "true-to-note": { verdict: "warn", note: "The Note names no first name." },
              },
            },
          ],
        }),
      );

      const before = yield* scored.pipe(Effect.provide(start()));
      assert.deepStrictEqual(
        before.map((card) => card.score.judge),
        ["pending", "pending"],
      );

      yield* CardChecks.use((checks) => checks.judgeFiles([files[0]])).pipe(
        Effect.provide(start()),
      );
      const after = yield* scored.pipe(Effect.provide(start()));
      const first = after.find((card) => card.file === files[0]);
      assert.strictEqual(first?.score.judge, "done");
      assert.strictEqual(first?.score.grade, "fix");
      assert.deepInclude(first?.score.checks ?? [], {
        id: "true-to-note",
        verdict: "warn",
        note: "The Note names no first name.",
      });
      assert.strictEqual(after.find((card) => card.file === files[1])?.score.judge, "pending");
      // One blind call and one judge call; the restart read the rest from the cache.
      assert.lengthOf(checkRequests(), 2);

      // Changed words are a new Card to the AI.
      yield* Cards.use((cards) =>
        cards.update({
          file: files[0],
          question: "Who found attention residue?",
          answer: "Leroy.",
        }),
      ).pipe(Effect.provide(start()));
      const edited = yield* scored.pipe(Effect.provide(start()));
      assert.strictEqual(edited.find((card) => card.file === files[0])?.score.judge, "pending");
    }).pipe(Effect.scoped),
  );

  it.effect("says when the AI Checks failed, so Recall does not ask again at once", () =>
    Effect.gen(function* () {
      const { fake, start, files, scored } = yield* setUp(true);
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, { status: 500, body: { detail: "down" } });
      const after = yield* Effect.gen(function* () {
        yield* (yield* CardChecks).judgeFiles([files[0]]);
        return yield* scored;
      }).pipe(Effect.provide(start()));
      assert.strictEqual(after.find((card) => card.file === files[0])?.score.judge, "failed");
    }).pipe(Effect.scoped),
  );

  it.effect("says the AI Checks failed when the sign-in cannot be refreshed, not pending", () =>
    Effect.gen(function* () {
      const { fake, start, files, scored } = yield* setUp(true, { expired: true });
      fake.answer(FAKE_OPENAI.tokenUrl, { status: 503, body: { detail: "down" } });
      const after = yield* Effect.gen(function* () {
        yield* (yield* CardChecks).judgeFiles([files[0]]);
        return yield* scored;
      }).pipe(Effect.provide(start()));
      // Pending would make Recall ask again at once, again and again.
      assert.strictEqual(after.find((card) => card.file === files[0])?.score.judge, "failed");
    }).pipe(Effect.scoped),
  );
});

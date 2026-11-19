import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import { ChatGpt } from "../chatgpt/ChatGpt.ts";
import { FAKE_OPENAI } from "../testkit/openai.ts";
import {
  afterTurn,
  answer,
  answering,
  type Body,
  halfAnswer,
  MODEL_LIST,
  MODELS,
  RESPONSES,
  setUp,
  toolCall,
} from "../testkit/sessions.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect(
    "runs an Extraction turn with a tool call, keeps it in the Vault, and continues it",
    () =>
      Effect.gen(function* () {
        const { fake, layer, vaultFolder, sourceId, bodies } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
        fake.answer(RESPONSES, toolCall("read_source"), answer("Your point: labour."));

        const first = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
          return yield* afterTurn(id);
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(first.entries, [
          { _tag: "ToolUse", tool: "read-source" },
          { _tag: "AiMessage", text: "Your point: labour." },
        ]);
        assert.strictEqual(first.model, "gpt-test");
        assert.isNull(first.problem);

        const [toolRound, answerRound] = bodies();
        assert.strictEqual(toolRound!.model, "gpt-test");
        assert.isFalse(toolRound!.store);
        assert.isTrue(toolRound!.stream);
        assert.deepStrictEqual(
          toolRound!.tools.map((tool) => [tool.type, tool.name]),
          [["namespace", "glose"]],
        );
        const call = answerRound!.input.find((item) => item.type === "function_call");
        const output = answerRound!.input.find((item) => item.type === "function_call_output");
        assert.strictEqual(call?.["call_id"], "call_1");
        assert.isUndefined(call?.["id"]);
        assert.include(String(output?.["output"]), "Labour leaves nothing behind.");

        fake.answer(RESPONSES, answer("Say it without 'durable'."));
        const second = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const found = yield* sessions.find({ kind: "extraction", subject: sourceId });
          assert.deepStrictEqual(found?.entries, first.entries);
          yield* sessions.send({ id: first.id, text: "Is it about durability?" });
          return yield* afterTurn(first.id);
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(second.entries.slice(2), [
          { _tag: "UserMessage", text: "Is it about durability?" },
          { _tag: "AiMessage", text: "Say it without 'durable'." },
        ]);
        const followUp = bodies()[2]!;
        assert.deepStrictEqual(
          followUp.input.slice(0, answerRound!.input.length),
          answerRound!.input,
        );
        assert.deepStrictEqual(followUp.input.at(-1), {
          type: "message",
          role: "user",
          content: "Is it about durability?",
        });

        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const files = yield* fs.readDirectory(path.join(vaultFolder, ".glose", "sessions"));
        assert.deepStrictEqual(files, [`${first.id}.json`]);
      }).pipe(Effect.scoped),
  );

  it.effect("keeps what the AI already said when the user stops a turn", () =>
    Effect.gen(function* () {
      const { fake, layer, vaultFolder, sourceId } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, halfAnswer);
      const id = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
        yield* answering(id);
        yield* sessions.stop(id);
        return id;
      }).pipe(Effect.provide(layer));

      const found = yield* Sessions.use((sessions) =>
        sessions.find({ kind: "extraction", subject: sourceId }),
      ).pipe(Effect.provide(layer));
      assert.deepStrictEqual(found?.entries, [{ _tag: "AiMessage", text: "Half an ans" }]);
      assert.isFalse(found?.working);
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const saved = JSON.parse(
        yield* fs.readFileString(path.join(vaultFolder, ".glose", "sessions", `${id}.json`)),
      );
      assert.deepStrictEqual(saved.items.at(-1), {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Half an ans" }],
      });
    }).pipe(Effect.scoped),
  );

  it.effect("stops a running turn before signing out of ChatGPT", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, halfAnswer);
      fake.answer(FAKE_OPENAI.revokeUrl, { status: 200, body: {} });
      const session = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
        yield* answering(id);
        yield* (yield* ChatGpt).disconnect;
        return yield* sessions.watch(id).pipe(Stream.runHead, Effect.map(Option.getOrThrow));
      }).pipe(Effect.provide(layer));
      assert.isFalse(session.working);
      const urls = fake.requests.map((request) => request.url);
      assert.deepStrictEqual(urls.slice(urls.indexOf(RESPONSES)), [
        RESPONSES,
        FAKE_OPENAI.revokeUrl,
      ]);
    }).pipe(Effect.scoped),
  );

  it.effect("stops a turn at the usage limit and says so", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, {
        status: 429,
        body: { error: { code: "subscription_sharing_usage_limit_exceeded", message: "limit" } },
      });
      const session = yield* Effect.gen(function* () {
        const { id } = yield* (yield* Sessions).start({ kind: "extraction", subject: sourceId });
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));
      assert.strictEqual(session.problem, "usage-limit");
      assert.deepStrictEqual(session.entries, []);
    }).pipe(Effect.scoped),
  );

  it.effect("reads a Session that an earlier Glose kept for a Source", () =>
    Effect.gen(function* () {
      const { layer, vaultFolder, sourceId } = yield* setUp;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const folder = path.join(vaultFolder, ".glose", "sessions");
      yield* fs.makeDirectory(folder, { recursive: true });
      yield* fs.writeFileString(
        path.join(folder, "old.json"),
        JSON.stringify({
          version: 1,
          id: "old",
          kind: "extraction",
          sourceId,
          model: "gpt-test",
          created: 1,
          entries: [{ _tag: "AiMessage", text: "Kept from before." }],
          items: [],
        }),
      );
      const found = yield* Sessions.use((sessions) =>
        sessions.find({ kind: "extraction", subject: sourceId }),
      ).pipe(Effect.provide(layer));
      assert.strictEqual(found?.subject, sourceId);
      assert.deepStrictEqual(found?.entries, [{ _tag: "AiMessage", text: "Kept from before." }]);
    }).pipe(Effect.scoped),
  );

  it.effect("shows the AI's reasoning summary as Thinking before its answer", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId, bodies } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, {
        status: 200,
        sse: true,
        body: [
          {
            type: "response.output_item.done",
            item: {
              id: "rs_1",
              type: "reasoning",
              summary: [
                { type: "summary_text", text: "**Reading** the Free text first." },
                { type: "summary_text", text: "Then the Graph." },
              ],
              encrypted_content: "secret",
            },
          },
          ...answer("Here are the points.").body,
        ],
      });
      const session = yield* Effect.gen(function* () {
        const { id } = yield* (yield* Sessions).start({ kind: "extraction", subject: sourceId });
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));

      const [thinking, message] = session.entries;
      assert.deepStrictEqual(
        thinking?._tag === "Thinking" ? thinking.text : null,
        "**Reading** the Free text first.\n\nThen the Graph.",
      );
      assert.deepStrictEqual(message, { _tag: "AiMessage", text: "Here are the points." });
      const [body] = bodies() as ReadonlyArray<Body & { readonly reasoning?: unknown }>;
      assert.deepStrictEqual(body?.reasoning, { summary: "auto" });
    }).pipe(Effect.scoped),
  );

  it.effect("goes on without reasoning summaries when ChatGPT refuses them", () =>
    Effect.gen(function* () {
      const { fake, layer, sourceId, bodies } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        {
          status: 400,
          body: {
            error: {
              code: "unsupported_parameter",
              message:
                "Unsupported parameter: 'reasoning.summary' is not supported with this model.",
            },
          },
        },
        answer("Without a summary."),
        answer("Still without."),
      );
      const session = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "extraction", subject: sourceId });
        yield* afterTurn(id);
        yield* sessions.send({ id, text: "Go on." });
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));

      assert.isNull(session.problem);
      assert.deepStrictEqual(session.entries.at(-1), { _tag: "AiMessage", text: "Still without." });
      const asked = (bodies() as ReadonlyArray<Body & { readonly reasoning?: unknown }>).map(
        (body) => body.reasoning,
      );
      assert.deepStrictEqual(asked, [{ summary: "auto" }, undefined, undefined]);
    }).pipe(Effect.scoped),
  );
});

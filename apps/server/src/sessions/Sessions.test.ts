import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ServerConfig from "../config.ts";
import * as Sources from "../graph/Sources.ts";
import * as Server from "../server.ts";
import * as Settings from "../settings/Settings.ts";
import { writeCredentials } from "../testkit/credentials.ts";
import { makeDirs } from "../testkit/graph.ts";
import { FAKE_OPENAI, makeFakeOpenAi } from "../testkit/openai.ts";
import { ChatGpt } from "../chatgpt/ChatGpt.ts";
import { Sessions } from "./Sessions.ts";

const RESPONSES = `${FAKE_OPENAI.apiUrl}/responses`;
const MODELS = `${FAKE_OPENAI.apiUrl}/models`;

const SOURCE = {
  familyName: "Arendt",
  givenName: "Hannah",
  title: "The Human Condition",
  firstPublished: 1958,
  edition: null,
  editionYear: null,
  publisher: null,
  translator: null,
};

/** Streamed answers as OpenAI sends them. */
const toolCall = (name: string) => ({
  status: 200,
  sse: true,
  body: [
    {
      type: "response.output_item.done",
      item: {
        id: "fc_1",
        type: "function_call",
        call_id: "call_1",
        namespace: "glose",
        name,
        arguments: "{}",
      },
    },
    { type: "response.completed", response: {} },
  ],
});

const answer = (text: string) => ({
  status: 200,
  sse: true,
  body: [
    { type: "response.output_text.delta", delta: text.slice(0, 4) },
    { type: "response.output_text.delta", delta: text.slice(4) },
    {
      type: "response.output_item.done",
      item: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
      },
    },
    { type: "response.completed", response: {} },
  ],
});

/** An answer that has begun to arrive and is not finished. */
const halfAnswer = {
  status: 200,
  sse: true,
  open: true,
  body: [{ type: "response.output_text.delta", delta: "Half an ans" }],
};

/** The Session once the AI has begun to answer. */
const answering = (id: string) =>
  Sessions.use((sessions) =>
    sessions.watch(id).pipe(
      Stream.filter((session) => session.draft !== ""),
      Stream.runHead,
    ),
  );

const MODEL_LIST = {
  status: 200,
  body: { models: [{ slug: "gpt-test", display_name: "GPT Test", visibility: "list" }] },
};

type Body = {
  readonly model: string;
  readonly store: boolean;
  readonly stream: boolean;
  readonly tools: ReadonlyArray<{ readonly type: string; readonly name: string }>;
  readonly input: ReadonlyArray<Record<string, unknown>>;
};

/** A computer signed in to ChatGPT, with a Graph that holds one Source with Free text. */
const setUp = Effect.gen(function* () {
  const dirs = yield* makeDirs;
  const path = yield* Path.Path;
  const fake = yield* makeFakeOpenAi;
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
          expiresAt: 10_000_000_000,
          scopes: ["chatgpt.tokens.use.direct"],
        },
        planNoticeSeen: true,
      },
    ],
  });
  const layer = Server.layerApp.pipe(
    Layer.provide(fake.layer),
    Layer.provide(NodeServices.layer),
    Layer.provide(ServerConfig.layerTest(dirs)),
  );
  const graphFolder = path.join(dirs.homeDir, "Glose");
  const sourceId = yield* Effect.gen(function* () {
    yield* (yield* Settings.Settings).completeSetup({
      language: "en",
      graphFolder,
      action: "create",
    });
    const sources = yield* Sources.Sources;
    const source = yield* sources.create(SOURCE);
    yield* sources.saveFreeText({
      id: source.id,
      freeText: "Labour leaves nothing behind.",
      finish: true,
    });
    return source.id;
  }).pipe(Effect.provide(layer));
  const bodies = () =>
    fake.requests
      .filter((request) => request.url === RESPONSES)
      .map((request) => JSON.parse(request.body) as Body);
  return { fake, layer, graphFolder, sourceId, bodies };
});

/** The Session once the AI's turn is over. */
const afterTurn = (id: string) =>
  Sessions.use((sessions) =>
    sessions.watch(id).pipe(
      Stream.filter((session) => !session.working),
      Stream.runHead,
      Effect.map(Option.getOrThrow),
    ),
  );

it.layer(NodeServices.layer)("Sessions", (it) => {
  it.effect(
    "runs an Extraction turn with a tool call, keeps it in the Graph, and continues it",
    () =>
      Effect.gen(function* () {
        const { fake, layer, graphFolder, sourceId, bodies } = yield* setUp;
        fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
        fake.answer(RESPONSES, toolCall("read_source"), answer("Your point: labour."));

        const first = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const { id } = yield* sessions.start({ kind: "extraction", sourceId });
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
        // The tool answer reaches the model, and the model's own item goes back without its id.
        const call = answerRound!.input.find((item) => item.type === "function_call");
        const output = answerRound!.input.find((item) => item.type === "function_call_output");
        assert.strictEqual(call?.["call_id"], "call_1");
        assert.isUndefined(call?.["id"]);
        assert.include(String(output?.["output"]), "Labour leaves nothing behind.");

        // A restarted app finds the Session in the Graph folder and continues where it stopped.
        fake.answer(RESPONSES, answer("Say it without 'durable'."));
        const second = yield* Effect.gen(function* () {
          const sessions = yield* Sessions;
          const found = yield* sessions.find({ kind: "extraction", sourceId });
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
        const files = yield* fs.readDirectory(path.join(graphFolder, ".glose", "sessions"));
        assert.deepStrictEqual(files, [`${first.id}.json`]);
      }).pipe(Effect.scoped),
  );

  it.effect("keeps what the AI already said when the user stops a turn", () =>
    Effect.gen(function* () {
      const { fake, layer, graphFolder, sourceId } = yield* setUp;
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, halfAnswer);
      const id = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const { id } = yield* sessions.start({ kind: "extraction", sourceId });
        yield* answering(id);
        yield* sessions.stop(id);
        return id;
      }).pipe(Effect.provide(layer));

      // After a restart, the Session still shows the partial answer, and the model will see it.
      const found = yield* Sessions.use((sessions) =>
        sessions.find({ kind: "extraction", sourceId }),
      ).pipe(Effect.provide(layer));
      assert.deepStrictEqual(found?.entries, [{ _tag: "AiMessage", text: "Half an ans" }]);
      assert.isFalse(found?.working);
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const saved = JSON.parse(
        yield* fs.readFileString(path.join(graphFolder, ".glose", "sessions", `${id}.json`)),
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
        const { id } = yield* sessions.start({ kind: "extraction", sourceId });
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
        const { id } = yield* (yield* Sessions).start({ kind: "extraction", sourceId });
        return yield* afterTurn(id);
      }).pipe(Effect.provide(layer));
      assert.strictEqual(session.problem, "usage-limit");
      assert.deepStrictEqual(session.entries, []);
    }).pipe(Effect.scoped),
  );
});

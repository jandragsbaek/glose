import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ServerConfig from "../config.ts";
import * as Sources from "../vault/Sources.ts";
import * as Server from "../server.ts";
import { Sessions } from "../sessions/Sessions.ts";
import * as WebPages from "../research/WebPages.ts";
import * as Settings from "../settings/Settings.ts";
import { writeCredentials } from "./credentials.ts";
import { makeDirs } from "./services.ts";
import { FAKE_OPENAI, makeFakeOpenAi } from "./openai.ts";

export const RESPONSES = `${FAKE_OPENAI.apiUrl}/responses`;
export const MODELS = `${FAKE_OPENAI.apiUrl}/models`;

export const NOTE = "Attention residue lowers performance";

export const isChecks = (body: string) => body.includes('"json_schema"');

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

export const toolCall = (name: string, args: unknown = {}) => ({
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
        arguments: JSON.stringify(args),
      },
    },
    { type: "response.completed", response: {} },
  ],
});

export const answer = (text: string) => ({
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

export const halfAnswer = {
  status: 200,
  sse: true,
  open: true,
  body: [{ type: "response.output_text.delta", delta: "Half an ans" }],
};

export const answering = (id: string) =>
  Sessions.use((sessions) =>
    sessions.watch(id).pipe(
      Stream.filter((session) => session.draft !== ""),
      Stream.runHead,
    ),
  );

export const MODEL_LIST = {
  status: 200,
  body: { models: [{ slug: "gpt-test", display_name: "GPT Test", visibility: "list" }] },
};

export type Body = {
  readonly model: string;
  readonly store: boolean;
  readonly stream: boolean;
  readonly tools: ReadonlyArray<{ readonly type: string; readonly name: string }>;
  readonly input: ReadonlyArray<Record<string, unknown>>;
};

export const setUpWithPages = (pages: ReadonlyMap<string, WebPages.WebPage>) =>
  setUpOn(WebPages.layerTest(pages));

const setUpOn = Effect.fn("testkit.setUpOn")(function* (webPages: Layer.Layer<WebPages.WebPages>) {
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
  const layer = Server.layerAppWith(webPages).pipe(
    Layer.provide(fake.layer),
    Layer.provide(NodeServices.layer),
    Layer.provide(ServerConfig.layerTest(dirs)),
  );
  const vaultFolder = path.join(dirs.homeDir, "Glose");
  const sourceId = yield* Effect.gen(function* () {
    yield* (yield* Settings.Settings).completeSetup({
      language: "en",
      vaultFolder,
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
  yield* (yield* FileSystem.FileSystem).writeFileString(
    path.join(vaultFolder, `${NOTE}.md`),
    `---\nglose: note\nsource: "[[${sourceId}]]"\n---\n\nLeroy found that attention lingers.\n`,
  );
  fake.answerMatching(RESPONSES, isChecks);
  const bodies = () =>
    fake.requests
      .filter((request) => request.url === RESPONSES && !isChecks(request.body))
      .map((request) => JSON.parse(request.body) as Body);
  return { fake, layer, vaultFolder, sourceId, bodies };
});

export const setUp = setUpOn(WebPages.layer);

export const afterTurn = (id: string) =>
  Sessions.use((sessions) =>
    sessions.watch(id).pipe(
      Stream.filter((session) => !session.working),
      Stream.runHead,
      Effect.map(Option.getOrThrow),
    ),
  );

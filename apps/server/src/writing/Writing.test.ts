import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import type { WritingProjectFields } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import * as ServerConfig from "../config.ts";
import * as Graph from "../graph/Graph.ts";
import * as Server from "../server.ts";
import * as Settings from "../settings/Settings.ts";
import { writeCredentials } from "../testkit/credentials.ts";
import { makeDirs } from "../testkit/graph.ts";
import { type Answer, FAKE_OPENAI, makeFakeOpenAi } from "../testkit/openai.ts";
import { Writing } from "./Writing.ts";

const NEWPORT = [
  "---",
  "glose: source",
  "author-family: Newport",
  "author-given: Cal",
  "title: Deep Work",
  "first-published: 2016",
  "publisher: Grand Central Publishing",
  "---",
  "",
].join("\n");

const NOTE = "Busyness is a proxy for productivity";

const POST: WritingProjectFields = {
  title: "A busy day is not a productive day",
  type: "blog-post",
  language: "en",
  referenceForm: "footnotes",
  citationStyle: "chicago",
  body: `Newport has a name for this.[[${NOTE}]]{p. 64}`,
};

/** This computer signed in to ChatGPT before Glose started. */
const signIn = (dirs: { readonly dataDir: string }) =>
  writeCredentials(dirs, {
    hostId: "urn:uuid:host-1",
    active: "user-1",
    accounts: [
      {
        subject: "user-1",
        email: "writer@example.com",
        clientId: "oaiapp_1",
        tokens: {
          idToken: "id-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          expiresAt: 4_000_000_000_000,
          scopes: ["chatgpt.tokens.use.direct"],
        },
        planNoticeSeen: true,
      },
    ],
  });

/** A Graph with one Source and one Note from it, and the site of a Bridgetown blog. */
const setUp = (signedIn = false) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    if (signedIn) yield* signIn(dirs);
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const fake = yield* makeFakeOpenAi;
    const graphFolder = path.join(dirs.homeDir, "Glose");
    const site = path.join(dirs.homeDir, "blog");
    yield* fs.makeDirectory(path.join(site, "src"), { recursive: true });
    const layer = Server.layerApp.pipe(
      Layer.provide(fake.layer),
      Layer.provide(NodeServices.layer),
      Layer.provide(ServerConfig.layerTest(dirs)),
    );
    yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        graphFolder,
        action: "create",
      });
      yield* fs.writeFileString(path.join(graphFolder, "Newport 2016 Deep Work.md"), NEWPORT);
      yield* fs.writeFileString(
        path.join(graphFolder, `${NOTE}.md`),
        `---\nglose: note\nsource: "[[Newport 2016 Deep Work]]"\npage: "64"\n---\n\nBusyness stands in for productivity.\n`,
      );
    }).pipe(Effect.provide(layer));
    return { dirs, fake, graphFolder, site, layer };
  });

it.layer(NodeServices.layer)("Writing", (it) => {
  it.effect("keeps a Writing project as Markdown in the Writing folder, outside the Graph", () =>
    Effect.gen(function* () {
      const { graphFolder, layer } = yield* setUp();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const created = yield* writing.create(POST);
        const markdown = yield* fs.readFileString(
          path.join(graphFolder, "Writing", `${created.id}.md`),
        );
        assert.strictEqual(
          markdown,
          [
            "---",
            "glose: writing-project",
            "title: A busy day is not a productive day",
            "type: blog-post",
            "language: en",
            "reference-form: footnotes",
            "---",
            "",
            `Newport has a name for this.[[${NOTE}]]{p. 64}`,
            "",
          ].join("\n"),
        );
        const view = yield* (yield* Graph.Graph).read;
        assert.notInclude(
          view.nodes.map((node) => node.id),
          created.id,
        );
        assert.deepStrictEqual(
          (yield* writing.list).map((project) => project.title),
          [POST.title],
        );
      }).pipe(Effect.provide(layer));
    }).pipe(Effect.scoped),
  );

  it.effect("renames the file with the title, and refuses a title another project has", () =>
    Effect.gen(function* () {
      const { layer } = yield* setUp();
      yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const first = yield* writing.create(POST);
        yield* writing.create({ ...POST, title: "Clutter in my own sentences" });
        const renamed = yield* writing.save({ ...first, title: "Busy is not productive?" });
        assert.strictEqual(renamed.id, "Busy is not productive");
        assert.strictEqual(renamed.title, "Busy is not productive?");
        const taken = yield* writing
          .save({ ...renamed, title: "clutter in my own sentences" })
          .pipe(Effect.flip);
        assert.strictEqual(taken._tag, "WritingProjectNameTaken");
        assert.deepStrictEqual((yield* writing.list).map((project) => project.id).sort(), [
          "Busy is not productive",
          "Clutter in my own sentences",
        ]);
      }).pipe(Effect.provide(layer));
    }).pipe(Effect.scoped),
  );

  it.effect("publishes a Blog post into the Bridgetown site and asks before replacing it", () =>
    Effect.gen(function* () {
      const { site, layer } = yield* setUp();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* TestClock.setTime(new Date(2026, 10, 13, 9, 30).getTime());
      yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const settings = yield* Settings.Settings;
        const post = yield* writing.create(POST);

        const notSet = yield* writing.publish({ id: post.id, replace: false }).pipe(Effect.flip);
        assert.strictEqual(notSet._tag, "SiteFolderNotSet");
        const notBridgetown = yield* settings
          .setSiteFolder(path.join(site, "src"))
          .pipe(Effect.flip);
        assert.deepStrictEqual(
          [notBridgetown._tag, "reason" in notBridgetown ? notBridgetown.reason : null],
          ["SiteFolderUnavailable", "not-bridgetown"],
        );
        yield* settings.setSiteFolder(site);

        const record = yield* writing.publish({ id: post.id, replace: false });
        const file = path.join(
          site,
          "src",
          "_posts",
          "2026-11-13-a-busy-day-is-not-a-productive-day.md",
        );
        assert.deepStrictEqual(record, { date: "2026-11-13", file });
        assert.strictEqual(
          yield* fs.readFileString(file),
          [
            "---",
            "layout: post",
            'title: "A busy day is not a productive day"',
            "date: 2026-11-13",
            "---",
            "",
            "Newport has a name for this.[^1]",
            "",
            "[^1]: Cal Newport, *Deep Work* (Grand Central Publishing, 2016), 64.",
            "",
          ].join("\n"),
        );
        assert.deepStrictEqual((yield* writing.get(post.id)).published, record);

        // A day later the post keeps its date, so it names the same file.
        yield* TestClock.adjust("1 day");
        const exists = yield* writing.publish({ id: post.id, replace: false }).pipe(Effect.flip);
        assert.deepStrictEqual(
          [exists._tag, "file" in exists ? exists.file : null],
          ["PublicationExists", file],
        );
        assert.deepStrictEqual(yield* writing.publish({ id: post.id, replace: true }), record);
      }).pipe(Effect.provide(layer));
    }).pipe(Effect.scoped),
  );

  it.effect("keeps the AI's review to what the app can show", () =>
    Effect.gen(function* () {
      const { layer: offline } = yield* setUp();
      const off = yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const post = yield* writing.create({
          ...POST,
          body: "Most people check their email every six minutes. I prefer one deep hour.",
        });
        return yield* writing.review(post.id).pipe(Effect.flip);
      }).pipe(Effect.provide(offline));
      assert.deepStrictEqual(
        [off._tag, off._tag === "WritingReviewUnavailable" ? off.reason : null],
        ["WritingReviewUnavailable", "off"],
      );

      const { fake, layer } = yield* setUp(true);
      const review = {
        claims: [
          { excerpt: "every six minutes", reason: "A number from research, cited nowhere." },
          { excerpt: "not in the post", reason: "Dropped: the app cannot find it." },
        ],
        suggestions: [
          { excerpt: "one deep hour", noteId: NOTE.toLowerCase(), reason: "Supports this." },
          { excerpt: "one deep hour", noteId: "A Note the Graph lacks", reason: "Dropped." },
        ],
        questions: [{ excerpt: "nowhere to be found", question: "What do you protect it from?" }],
      };
      const text: Answer = {
        status: 200,
        sse: true,
        body: [
          {
            type: "response.output_item.done",
            item: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: JSON.stringify(review) }],
            },
          },
          { type: "response.completed", response: {} },
        ],
      };
      fake.answer(`${FAKE_OPENAI.apiUrl}/models`, {
        status: 200,
        body: { models: [{ slug: "gpt-test", display_name: "GPT Test", visibility: "list" }] },
      });
      fake.answer(`${FAKE_OPENAI.apiUrl}/responses`, text);
      const result = yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const post = yield* writing.create({
          ...POST,
          body: "Most people check their email every six minutes. I prefer one deep hour.",
        });
        return yield* writing.review(post.id);
      }).pipe(Effect.provide(layer));

      assert.deepStrictEqual(result, {
        claims: review.claims.slice(0, 1),
        suggestions: [{ excerpt: "one deep hour", noteId: NOTE, reason: "Supports this." }],
        questions: [{ excerpt: null, question: "What do you protect it from?" }],
      });
      const request = fake.requests.find((each) => each.url.endsWith("/responses"));
      assert.include(request?.body ?? "", "never write, rewrite");
      assert.include(request?.body ?? "", "Busyness stands in for productivity.");
    }).pipe(Effect.scoped),
  );
});

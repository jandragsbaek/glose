import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { localDay, type WritingProjectFields } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import * as ServerConfig from "../config.ts";
import * as Graph from "../vault/Graph.ts";
import * as Server from "../server.ts";
import * as Settings from "../settings/Settings.ts";
import { writeCredentials } from "../testkit/credentials.ts";
import { makeDirs } from "../testkit/services.ts";
import { type Answer, FAKE_OPENAI, makeFakeOpenAi } from "../testkit/openai.ts";
import { Writing } from "./Writing.ts";

const EPOCH_DAY = localDay(0);
const DAY = 24 * 60 * 60 * 1000;

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
  tries: [],
};

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

const setUp = (signedIn = false) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    if (signedIn) yield* signIn(dirs);
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const fake = yield* makeFakeOpenAi;
    const vaultFolder = path.join(dirs.homeDir, "Glose");
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
        vaultFolder,
        action: "create",
      });
      yield* fs.writeFileString(path.join(vaultFolder, "Newport 2016 Deep Work.md"), NEWPORT);
      yield* fs.writeFileString(
        path.join(vaultFolder, `${NOTE}.md`),
        `---\nglose: note\nsource: "[[Newport 2016 Deep Work]]"\npage: "64"\n---\n\nBusyness stands in for productivity.\n`,
      );
    }).pipe(Effect.provide(layer));
    return { dirs, fake, vaultFolder, site, layer };
  });

it.layer(NodeServices.layer)("Writing", (it) => {
  it.effect("keeps a Writing project as Markdown in the Writing folder, outside the Graph", () =>
    Effect.gen(function* () {
      const { vaultFolder, layer } = yield* setUp();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const created = yield* writing.create(POST);
        const markdown = yield* fs.readFileString(
          path.join(vaultFolder, "Writing", `${created.id}.md`),
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
            `created: ${EPOCH_DAY}`,
            `updated: ${EPOCH_DAY}`,
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

  it.effect(
    "renames the file with the title, keeps its own fields, and refuses a taken title",
    () =>
      Effect.gen(function* () {
        const { vaultFolder, layer } = yield* setUp();
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* Effect.gen(function* () {
          const writing = yield* Writing;
          const first = yield* writing.create(POST);
          yield* writing.create({ ...POST, title: "Clutter in my own sentences" });
          const file = (id: string) => path.join(vaultFolder, "Writing", `${id}.md`);
          const written = yield* fs.readFileString(file(first.id));
          yield* fs.writeFileString(
            file(first.id),
            written.replace("---\n", "---\ntags: [essay]\n"),
          );
          yield* TestClock.adjust("1 day");
          const renamed = yield* writing.save({ ...first, title: "Busy is not productive?" });
          assert.strictEqual(renamed.id, "Busy is not productive");
          assert.strictEqual(renamed.title, "Busy is not productive?");
          const moved = yield* fs.readFileString(file(renamed.id));
          assert.include(moved, `created: ${EPOCH_DAY}\nupdated: ${localDay(DAY)}\n`);
          assert.include(moved, "tags: [ essay ]\n");
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

  it.effect("keeps the Tries after the prose, where other Markdown readers do not show them", () =>
    Effect.gen(function* () {
      const { vaultFolder, layer } = yield* setUp();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const body = "The nine o'clock version had the better verb.";
      const at = body.indexOf("better");
      yield* Effect.gen(function* () {
        const writing = yield* Writing;
        const created = yield* writing.create({
          ...POST,
          body,
          tries: [
            { at, showing: 0, tries: ["better", "sharper", "1976"], ai: ["sharper"] },
            { at: 0, showing: 0, tries: ["The"], ai: [] },
          ],
        });
        const file = path.join(vaultFolder, "Writing", `${created.id}.md`);
        const markdown = yield* fs.readFileString(file);
        assert.isTrue(
          markdown.endsWith(
            [
              body,
              "",
              "<!-- glose:tries",
              `- at: ${at}`,
              "  showing: 0",
              "  tries:",
              "    - better",
              "    - sharper",
              '    - "1976"',
              "  ai:",
              "    - sharper",
              "-->",
              "",
            ].join("\n"),
          ),
          markdown,
        );
        const read = yield* writing.get(created.id);
        assert.strictEqual(read.body, body);
        assert.deepStrictEqual(read.tries, [
          { at, showing: 0, tries: ["better", "sharper", "1976"], ai: ["sharper"] },
        ]);

        yield* fs.writeFileString(file, markdown.replace("the better verb", "a better verb"));
        assert.deepStrictEqual(
          (yield* writing.get(created.id)).tries.map((group) => group.at),
          [at - 2],
        );
        const windows = markdown.replace(/\n/g, "\r\n").replace("the better verb", "a better verb");
        yield* fs.writeFileString(file, windows);
        assert.deepStrictEqual(
          (yield* writing.get(created.id)).tries.map((group) => group.at),
          [at - 2],
        );

        const example = "```md\n<!-- glose:tries\n- at: 0\n-->\n```";
        yield* writing.save({ ...read, body: `${example}\n\n${body}`, tries: read.tries });
        const withExample = yield* writing.get(created.id);
        assert.strictEqual(withExample.body, `${example}\n\n${body}`);
        assert.deepStrictEqual(
          withExample.tries.map((group) => group.tries[0]),
          ["better"],
        );

        const open = "Ends in an example:\n\n```md\n<!-- glose:tries\n- at: 0\n-->";
        yield* writing.save({ ...read, body: open, tries: [] });
        assert.strictEqual((yield* writing.get(created.id)).body, open);

        const mixed = "```\n~~~\n```\n\nThe nine o'clock version had the better verb.";
        yield* writing.save({ ...read, body: mixed, tries: read.tries });
        assert.deepStrictEqual((yield* writing.get(created.id)).tries.length, 1);

        const unfinished = `${body}\n\n  \`\`\`js\nlet a = 1;`;
        yield* writing.save({ ...read, body: unfinished, tries: read.tries });
        const closed = yield* writing.get(created.id);
        assert.strictEqual(closed.body, `${unfinished}\n\`\`\``);
        assert.deepStrictEqual(closed.tries.length, 1);

        const inline = `\`\`\` \`inline\` example \`\`\`\n\n${body}`;
        yield* writing.save({ ...read, body: inline, tries: read.tries });
        assert.deepStrictEqual((yield* writing.get(created.id)).tries.length, 1);

        const commented = `<!--\n\`\`\`\n-->\n\n${body}`;
        yield* writing.save({ ...read, body: commented, tries: read.tries });
        assert.strictEqual((yield* writing.get(created.id)).body, commented);

        const codeComment = `Use \`<!--\` inline now.\n\n${body}\n\n\`\`\`js\nlet a = 1;`;
        yield* writing.save({ ...read, body: codeComment, tries: read.tries });
        const fenced = yield* writing.get(created.id);
        assert.strictEqual(fenced.body, `${codeComment}\n\`\`\``);
        assert.deepStrictEqual(fenced.tries.length, 1);

        const spanned = `Use \`a\nb <!--\` here.\n\n${body}\n\n\`\`\`md\n-->\n<!-- glose:tries\n-->`;
        yield* writing.save({ ...read, body: spanned, tries: read.tries });
        const kept = yield* writing.get(created.id);
        assert.strictEqual(kept.body, `${spanned}\n\`\`\``);
        assert.deepStrictEqual(kept.tries.length, 1);

        const interrupted =
          "Intro.\n\nSay `x\n```md\n<!-- glose:tries\n- at: 0\n  showing: 0\n  tries: [a, b]\n-->";
        yield* writing.save({ ...read, body: interrupted, tries: [] });
        assert.strictEqual((yield* writing.get(created.id)).body, interrupted);

        const closing = `${body}\n\n<!-- a\nb --> \`<!--\``;
        yield* writing.save({ ...read, body: closing, tries: read.tries });
        assert.strictEqual((yield* writing.get(created.id)).body, closing);

        const openComment = `${body}\n\n<!-- a note to self`;
        yield* writing.save({ ...read, body: openComment, tries: read.tries });
        const commentClosed = yield* writing.get(created.id);
        assert.strictEqual(commentClosed.body, `${openComment}\n-->`);
        assert.deepStrictEqual(commentClosed.tries.length, 1);

        const saved = yield* writing.save({ ...read, body: "All new text.", tries: read.tries });
        assert.deepStrictEqual(saved.tries, []);
        assert.notInclude(yield* fs.readFileString(file), "glose:tries");
      }).pipe(Effect.provide(layer));
    }).pipe(Effect.scoped),
  );

  it.effect("asks the AI for words to try, and keeps only new short ones", () =>
    Effect.gen(function* () {
      const ask = {
        language: "en",
        sentence: "The nine o'clock version had the better verb.",
        text: "better",
        tries: ["better", "sharper"],
      };
      const { layer: offline } = yield* setUp();
      const off = yield* Effect.gen(function* () {
        return yield* (yield* Writing).tryWords(ask).pipe(Effect.flip);
      }).pipe(Effect.provide(offline));
      assert.strictEqual(off.reason, "off");

      const { fake, layer } = yield* setUp(true);
      const tooLong = yield* Effect.gen(function* () {
        return yield* (yield* Writing)
          .tryWords({ ...ask, text: "one two three four five six seven" })
          .pipe(Effect.flip);
      }).pipe(Effect.provide(layer));
      assert.strictEqual(tooLong.reason, "too-long");

      fake.answer(`${FAKE_OPENAI.apiUrl}/models`, {
        status: 200,
        body: { models: [{ slug: "gpt-test", display_name: "GPT Test", visibility: "list" }] },
      });
      fake.answer(`${FAKE_OPENAI.apiUrl}/responses`, {
        status: 200,
        sse: true,
        body: [
          {
            type: "response.output_item.done",
            item: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({ words: ["livelier", "Sharper", "“truer”", "a\nb"] }),
                },
              ],
            },
          },
          { type: "response.completed", response: {} },
        ],
      });
      const words = yield* Effect.gen(function* () {
        return yield* (yield* Writing).tryWords(ask);
      }).pipe(Effect.provide(layer));
      assert.deepStrictEqual(words, { words: ["livelier", "truer"] });
      const request = fake.requests.find((each) => each.url.endsWith("/responses"));
      assert.include(request?.body ?? "", "never write, rewrite or continue");
      assert.include(request?.body ?? "", "the better verb");
    }).pipe(Effect.scoped),
  );
});

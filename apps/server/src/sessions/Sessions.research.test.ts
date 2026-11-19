import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as Sources from "../vault/Sources.ts";
import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  NOTE,
  RESPONSES,
  setUpWithPages,
  toolCall,
} from "../testkit/sessions.ts";
import {
  DRAFT,
  PAGE_A,
  PAGE_B,
  proposePages,
  searchThenRead,
  URL_A,
  URL_B,
} from "../testkit/research.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions: research for a new Note", (it) => {
  it.effect("offers web search, keeps only quotes that are on the page, and saves the Note", () =>
    Effect.gen(function* () {
      const { fake, layer, vaultFolder, bodies } = yield* setUpWithPages(
        new Map([
          [URL_A, PAGE_A],
          [URL_B, PAGE_B],
        ]),
      );
      fake.answer(MODELS, MODEL_LIST, MODEL_LIST);
      fake.answer(
        RESPONSES,
        searchThenRead,
        proposePages,
        answer("One strong page."),
        toolCall("propose_links", {
          links: [
            { note: NOTE.toLowerCase(), why: "Both are about attention." },
            { note: "No such Note", why: "Made up." },
          ],
        }),
        answer(""),
      );

      const { session, note } = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "check",
          title: "Testing yourself beats rereading",
          text: "",
          question: "Does it hold for facts?",
          notes: [],
        });
        const session = yield* afterTurn(started.id);
        yield* sessions.keepPage({ id: session.id, page: "w1" });
        const note = yield* sessions.createNote({
          title: "Testing yourself beats rereading",
          text: "Closing the book works better.[^q1]",
          session: session.id,
          restsOn: "w1",
          quotes: [
            {
              page: "w1",
              paragraph: 2,
              text: "Students who tested themselves remembered more a week later than students who reread.",
            },
          ],
          links: [NOTE],
        });
        return { session: yield* afterTurn(session.id), note };
      }).pipe(Effect.provide(layer));

      const [first, afterRead, , links] = bodies();
      assert.deepStrictEqual(
        first!.tools.map((tool) => tool.type),
        ["namespace", "web_search"],
      );
      assert.notInclude(JSON.stringify(first!.tools), "read_note");
      assert.deepStrictEqual(
        links!.tools.map((tool) => tool.type),
        ["namespace"],
      );
      assert.include(JSON.stringify(links!.tools), "read_note");
      assert.notInclude(JSON.stringify(links!.input), "Students who tested");
      assert.deepInclude(session.entries, {
        _tag: "ToolUse",
        tool: "search-web",
        detail: "testing effect rereading",
      });
      assert.include(String(first!.input.at(-1)?.["content"]), "check whether this claim holds");
      const read = afterRead!.input.find((item) => item.type === "function_call_output");
      assert.include(String(read?.["output"]), "¶ 2: Students who tested themselves");

      const found = session.entries.find((entry) => entry._tag === "FoundPages");
      assert.deepStrictEqual(found, {
        _tag: "FoundPages",
        pages: [
          {
            id: "w1",
            url: URL_A,
            title: "Retrieval practice, explained",
            site: "Learning Example",
            author: "Sample Author",
            published: "2024-03-01T10:00:00Z",
            articleType: "web",
            stance: "supports",
            why: "It reports the finding.",
            quotes: [
              {
                text: "Students who tested themselves remembered more a week later than students who reread.",
                paragraph: 2,
              },
            ],
            state: "kept",
            source: null,
          },
        ],
      });
      assert.deepStrictEqual(
        session.entries.find((entry) => entry._tag === "ResearchLinks"),
        { _tag: "ResearchLinks", links: [{ note: NOTE, why: "Both are about attention." }] },
      );

      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sources = yield* Effect.gen(function* () {
        return yield* (yield* Sources.Sources).list;
      }).pipe(Effect.provide(layer));
      const source = sources.find((other) => other.url === URL_A);
      assert.strictEqual(source?.kind, "article");
      assert.strictEqual(source?.articleType, "web");
      assert.strictEqual(source?.familyName, "Author");
      assert.strictEqual(source?.firstPublished, 2024);
      assert.strictEqual(source?.container, "Learning Example");
      assert.isFalse(sources.some((other) => other.url === URL_B));

      const file = yield* fs.readFileString(path.join(vaultFolder, `${note}.md`));
      assert.strictEqual(
        file,
        [
          "---",
          "glose: note",
          `source: "[[${source!.id}]]"`,
          "---",
          "",
          "Closing the book works better.[^q1]",
          "",
          `Related: [[${NOTE}]]`,
          "",
          `[^q1]: “Students who tested themselves remembered more a week later than students who reread.” [[${source!.id}]], ¶ 2`,
          "",
        ].join("\n"),
      );
    }),
  );

  it.effect("goes on without web search when the account refuses it", () =>
    Effect.gen(function* () {
      const { fake, layer, bodies } = yield* setUpWithPages(new Map());
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        {
          status: 400,
          body: {
            error: { code: "invalid_request", message: "Tool 'web_search' is not supported." },
          },
        },
        answer("Web search is off; send me addresses."),
      );

      const session = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Spacing",
          text: "",
          question: "",
          notes: [],
        });
        return yield* afterTurn(started.id);
      }).pipe(Effect.provide(layer));

      assert.isTrue(session.entries.some((entry) => entry._tag === "WebSearchOff"));
      assert.isNull(session.problem);
      const [refused, retried] = bodies();
      assert.include(
        refused!.tools.map((tool) => tool.type),
        "web_search",
      );
      assert.notInclude(
        retried!.tools.map((tool) => tool.type),
        "web_search",
      );
      assert.include(String(retried!.input.at(-1)?.["content"]), "Web search is not available");
    }),
  );

  it.effect("reads no address the AI wrote itself, in a search query or a refused proposal", () =>
    Effect.gen(function* () {
      const { fake, layer, bodies } = yield* setUpWithPages(new Map([[URL_A, PAGE_A]]));
      fake.answer(MODELS, MODEL_LIST);
      const leak = `${URL_A}?q=Leroy+found+that+attention+lingers`;
      fake.answer(
        RESPONSES,
        {
          status: 200,
          sse: true,
          body: [
            {
              type: "response.output_item.done",
              item: {
                id: "ws_2",
                type: "web_search_call",
                status: "completed",
                action: { type: "search", query: leak, sources: [{ type: "url", url: URL_A }] },
              },
            },
            ...toolCall("read_web_page", { url: leak }).body,
          ],
        },
        toolCall("propose_pages", {
          pages: [{ url: leak, stance: "supports", kind: "web", why: "x", quotes: ["a b c d"] }],
        }),
        answer("I cannot read that."),
        answer(""),
        toolCall("read_web_page", { url: leak }),
        answer("Still not."),
        answer(""),
      );

      yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Attention",
          text: "",
          question: "",
          notes: [],
        });
        yield* afterTurn(started.id);
        yield* sessions.send({ id: started.id, text: "Try again." });
        yield* afterTurn(started.id);
      }).pipe(Effect.provide(layer));

      const outputs = bodies().flatMap((body) =>
        body.input.filter((item) => item.type === "function_call_output"),
      );
      const last = outputs.at(-1);
      assert.include(String(outputs[0]?.["output"]), "Glose reads only addresses");
      assert.include(String(last?.["output"]), "Glose reads only addresses");
    }),
  );

  it.effect("lets the AI propose the address a page moved to", () =>
    Effect.gen(function* () {
      const short = "https://doi.example/10.1/abc";
      const { fake, layer } = yield* setUpWithPages(
        new Map([
          [short, PAGE_A],
          [URL_A, PAGE_A],
        ]),
      );
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("read_web_page", { url: short }),
        toolCall("propose_pages", {
          pages: [
            {
              url: URL_A,
              stance: "supports",
              kind: "web",
              why: "It moved here.",
              quotes: [
                "Students who tested themselves remembered more a week later than students who reread.",
              ],
            },
          ],
        }),
        answer("Found it."),
        answer(""),
      );

      const session = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Testing",
          text: "",
          question: `Read ${short}.`,
          notes: [],
        });
        return yield* afterTurn(started.id);
      }).pipe(Effect.provide(layer));

      const found = session.entries.flatMap((entry) =>
        entry._tag === "FoundPages" ? entry.pages : [],
      );
      assert.deepStrictEqual(
        found.map((page) => page.url),
        [URL_A],
      );
    }),
  );
});

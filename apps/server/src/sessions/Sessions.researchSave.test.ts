import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import * as Sources from "../graph/Sources.ts";
import type { WebPage } from "../research/WebPages.ts";
import { DRAFT, PAGE_A, proposePages, searchThenRead, URL_A } from "../testkit/research.ts";
import {
  afterTurn,
  answer,
  MODEL_LIST,
  MODELS,
  RESPONSES,
  setUpWithPages,
  toolCall,
} from "../testkit/sessions.ts";
import { footnoteOf } from "./pageDecisions.ts";
import { Sessions } from "./Sessions.ts";

it.layer(NodeServices.layer)("Sessions: saving a researched Note", (it) => {
  it.effect("gives two kept pages with the same title their own Source files", () =>
    Effect.gen(function* () {
      const intro = (url: string, words: string): WebPage => ({
        url,
        title: "Introduction",
        author: null,
        site: "Same Site",
        published: "2020",
        markdown: `${words} is the sentence that this page holds for the test.\n`,
      });
      const urlOne = "https://same.example/one";
      const urlTwo = "https://same.example/two";
      const { fake, layer } = yield* setUpWithPages(
        new Map([
          [urlOne, intro(urlOne, "First")],
          [urlTwo, intro(urlTwo, "Second")],
        ]),
      );
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        {
          status: 200,
          sse: true,
          body: [
            {
              type: "response.output_item.done",
              item: {
                id: "ws_3",
                type: "web_search_call",
                status: "completed",
                action: {
                  type: "search",
                  query: "same",
                  sources: [{ url: urlOne }, { url: urlTwo }],
                },
              },
            },
            ...toolCall("propose_pages", {
              pages: [urlOne, urlTwo].map((url, index) => ({
                url,
                stance: "context",
                kind: "web",
                why: "Same title.",
                quotes: [
                  `${index === 0 ? "First" : "Second"} is the sentence that this page holds`,
                ],
              })),
            }).body,
          ],
        },
        answer("Two pages."),
        answer(""),
      );

      const sources = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Same",
          text: "",
          question: "",
          notes: [],
        });
        const session = yield* afterTurn(started.id);
        yield* sessions.keepPage({ id: session.id, page: "w1" });
        yield* sessions.keepPage({ id: session.id, page: "w2" });
        const pages = session.entries.flatMap((entry) =>
          entry._tag === "FoundPages" ? entry.pages : [],
        );
        yield* sessions.createNote({
          title: "Same Site 2020 Introduction",
          text: "",
          session: session.id,
          restsOn: "w1",
          quotes: pages.map((page) => ({ page: page.id, ...page.quotes[0]! })),
          links: [],
        });
        return yield* (yield* Sources.Sources).list;
      }).pipe(Effect.provide(layer));

      const ids = sources.filter((source) => source.container === "Same Site").map((s) => s.id);
      assert.strictEqual(ids.length, 2);
      assert.notInclude(ids, "Same Site 2020 Introduction");
    }),
  );

  it.effect("offers only quotes a reused Source holds, and tells the AI nothing about it", () =>
    Effect.gen(function* () {
      const { fake, layer, bodies } = yield* setUpWithPages(new Map([[URL_A, PAGE_A]]));
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        searchThenRead,
        toolCall("propose_pages", {
          pages: [
            {
              url: URL_A,
              stance: "supports",
              kind: "web",
              why: "Both quotes are on the live page.",
              quotes: [
                "Retrieval practice means bringing information to mind without looking.",
                "Students who tested themselves remembered more a week later than students who reread.",
              ],
            },
          ],
        }),
        answer("Found it."),
        answer(""),
      );

      const session = yield* Effect.gen(function* () {
        yield* (yield* Sources.Sources).importText({
          familyName: "Author",
          givenName: "Sample",
          title: "Retrieval practice, explained",
          firstPublished: 2024,
          edition: null,
          editionYear: null,
          publisher: null,
          translator: null,
          kind: "article",
          articleType: "web",
          otherAuthors: [],
          container: "Learning Example",
          published: null,
          volume: null,
          issue: null,
          pages: null,
          url: URL_A,
          doi: null,
          accessed: "2026-11-01",
          part: null,
          markdown:
            "An older copy.\n\nStudents who tested themselves remembered more a week later than students who reread.\n",
        });
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Testing",
          text: "",
          question: "",
          notes: [],
        });
        return yield* afterTurn(started.id);
      }).pipe(Effect.provide(layer));

      const [page] = session.entries.flatMap((entry) =>
        entry._tag === "FoundPages" ? entry.pages : [],
      );
      assert.isNotNull(page?.source);
      assert.deepStrictEqual(page?.quotes, [
        {
          text: "Students who tested themselves remembered more a week later than students who reread.",
          paragraph: 2,
        },
      ]);
      const told = bodies()
        .flatMap((body) => body.input)
        .filter((item) => item.type === "function_call_output")
        .map((item) => String(item["output"]))
        .join("\n");
      assert.notInclude(told, "older copy");
      assert.notInclude(told, "Source");
    }),
  );

  it.effect("uses the Source the user has when it holds the address the page moved from", () =>
    Effect.gen(function* () {
      const short = "https://doi.example/10.1/abc";
      const { fake, layer } = yield* setUpWithPages(new Map([[short, PAGE_A]]));
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(
        RESPONSES,
        toolCall("propose_pages", {
          pages: [
            {
              url: short,
              stance: "supports",
              kind: "web",
              why: "Known by its DOI.",
              quotes: [
                "Students who tested themselves remembered more a week later than students who reread.",
              ],
            },
          ],
        }),
        answer("Found it."),
        answer(""),
      );

      const { session, source } = yield* Effect.gen(function* () {
        const source = yield* (yield* Sources.Sources).importText({
          familyName: "Author",
          givenName: null,
          title: "Retrieval practice by DOI",
          firstPublished: 2024,
          edition: null,
          editionYear: null,
          publisher: null,
          translator: null,
          kind: "article",
          articleType: "paper",
          otherAuthors: [],
          container: "Journal",
          published: null,
          volume: null,
          issue: null,
          pages: null,
          url: short,
          doi: null,
          accessed: "2026-11-01",
          part: null,
          markdown: PAGE_A.markdown,
        });
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Testing",
          text: "",
          question: `Read ${short}`,
          notes: [],
        });
        return { session: yield* afterTurn(started.id), source };
      }).pipe(Effect.provide(layer));

      const [page] = session.entries.flatMap((entry) =>
        entry._tag === "FoundPages" ? entry.pages : [],
      );
      assert.strictEqual(page?.source, source.id);
    }),
  );

  it.effect(
    "uses that Source too when the AI proposes where pages moved, after reading two addresses",
    () =>
      Effect.gen(function* () {
        const short = "https://doi.example/10.1/abc";
        const { fake, layer } = yield* setUpWithPages(
          new Map([
            [short, PAGE_A],
            ["https://short.example/x", PAGE_A],
            [URL_A, PAGE_A],
          ]),
        );
        fake.answer(MODELS, MODEL_LIST);
        fake.answer(
          RESPONSES,
          toolCall("read_web_page", { url: short }),
          toolCall("read_web_page", { url: "https://short.example/x" }),
          toolCall("propose_pages", {
            pages: [
              {
                url: URL_A,
                stance: "supports",
                kind: "web",
                why: "Known by its DOI.",
                quotes: [
                  "Students who tested themselves remembered more a week later than students who reread.",
                ],
              },
            ],
          }),
          answer("Found it."),
          answer(""),
        );

        const { session, source } = yield* Effect.gen(function* () {
          const source = yield* (yield* Sources.Sources).importText({
            familyName: "Author",
            givenName: null,
            title: "Retrieval practice by DOI",
            firstPublished: 2024,
            edition: null,
            editionYear: null,
            publisher: null,
            translator: null,
            kind: "article",
            articleType: "paper",
            otherAuthors: [],
            container: "Journal",
            published: null,
            volume: null,
            issue: null,
            pages: null,
            url: short,
            doi: null,
            accessed: "2026-11-01",
            part: null,
            markdown: PAGE_A.markdown,
          });
          const sessions = yield* Sessions;
          const started = yield* sessions.startResearch({
            draft: DRAFT,
            ask: "learn",
            title: "Testing",
            text: "",
            question: `Read ${short} and https://short.example/x`,
            notes: [],
          });
          return { session: yield* afterTurn(started.id), source };
        }).pipe(Effect.provide(layer));

        const [page] = session.entries.flatMap((entry) =>
          entry._tag === "FoundPages" ? entry.pages : [],
        );
        assert.strictEqual(page?.source, source.id);
      }),
  );

  it.effect("refuses a Note that cites a page the user did not keep", () =>
    Effect.gen(function* () {
      const { fake, layer } = yield* setUpWithPages(new Map([[URL_A, PAGE_A]]));
      fake.answer(MODELS, MODEL_LIST);
      fake.answer(RESPONSES, searchThenRead, proposePages, answer("Found one."));

      const error = yield* Effect.gen(function* () {
        const sessions = yield* Sessions;
        const started = yield* sessions.startResearch({
          draft: DRAFT,
          ask: "learn",
          title: "Testing",
          text: "",
          question: "",
          notes: [],
        });
        yield* afterTurn(started.id);
        return yield* Effect.flip(
          sessions.createNote({
            title: "Testing",
            text: "",
            session: started.id,
            restsOn: "w1",
            quotes: [],
            links: [],
          }),
        );
      }).pipe(Effect.provide(layer));

      assert.deepInclude(error, { _tag: "PageRefused", page: "w1", reason: "not-kept" });
    }),
  );

  it("keeps a quote's wikilink syntax as text, so it draws no Link", () => {
    assert.strictEqual(
      footnoteOf("See [[Busyness]] here", "Web 2024 A page", 3),
      "“See \\[\\[Busyness\\]\\] here” [[Web 2024 A page]], ¶ 3",
    );
  });
});

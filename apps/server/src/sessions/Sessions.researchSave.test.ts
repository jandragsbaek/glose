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

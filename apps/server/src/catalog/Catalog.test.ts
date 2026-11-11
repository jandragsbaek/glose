import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as Settings from "../settings/Settings.ts";
import { makeDirs } from "../testkit/graph.ts";
import * as Catalog from "./Catalog.ts";

const SEARCH_URL = "https://catalog.test/search.json";

/** A Catalog over a fake Open Library that gives one answer and records the request. */
const withCatalog = <A, E>(
  answer: { readonly status: number; readonly body: unknown },
  test: (
    catalog: Catalog.Catalog["Service"],
    requests: ReadonlyArray<Request>,
  ) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const requests: Array<Request> = [];
    const client = HttpClient.make((request, url) =>
      Effect.sync(() => {
        requests.push(new Request(url, { headers: request.headers }));
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(answer.body), {
            status: answer.status,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
    const layer = Catalog.layer.pipe(
      Layer.provideMerge(Settings.layer),
      Layer.provide(Layer.succeed(HttpClient.HttpClient, client)),
      Layer.provide(Layer.succeed(Catalog.OpenLibrary, { searchUrl: SEARCH_URL })),
      Layer.provide(ServerConfig.layerTest(dirs)),
    );
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "da",
        graphFolder: path.join(dirs.homeDir, "Glose"),
        action: "create",
      });
      return yield* test(yield* Catalog.Catalog, requests);
    }).pipe(Effect.provide(layer));
  }).pipe(Effect.scoped);

it.layer(NodeServices.layer)("Catalog", (it) => {
  it.effect("turns works and their best-matching editions into Source details", () =>
    withCatalog(
      {
        status: 200,
        body: {
          docs: [
            {
              key: "/works/OL20730768W",
              title: "Barndom",
              author_name: ["Tove Ditlevsen"],
              first_publish_year: 1967,
              editions: {
                docs: [{ title: "Barndom.", publisher: ["Gyldendal"], publish_year: [2019] }],
              },
            },
            { key: "/works/OL1W", title: "Anonymous chronicle" },
            { key: "/works/OL2W", title: "Gesammelte Werke", author_name: ["Kafka, Franz"] },
          ],
        },
      },
      (catalog, requests) =>
        Effect.gen(function* () {
          const records = yield* catalog.search("ditlevsen barndom");

          assert.deepStrictEqual(records, [
            {
              id: "/works/OL20730768W",
              details: {
                familyName: "Ditlevsen",
                givenName: "Tove",
                title: "Barndom",
                firstPublished: 1967,
                edition: null,
                editionYear: 2019,
                publisher: "Gyldendal",
                translator: null,
              },
            },
            {
              id: "/works/OL2W",
              details: {
                familyName: "Kafka",
                givenName: "Franz",
                title: "Gesammelte Werke",
                firstPublished: null,
                edition: null,
                editionYear: null,
                publisher: null,
                translator: null,
              },
            },
          ]);
          const url = new URL(requests[0]?.url ?? "");
          assert.strictEqual(url.searchParams.get("q"), "ditlevsen barndom");
          assert.strictEqual(url.searchParams.get("lang"), "da");
          assert.match(requests[0]?.headers.get("user-agent") ?? "", /^Glose /);
        }),
    ),
  );

  it.effect("reports the Catalog as unavailable when Open Library fails", () =>
    withCatalog({ status: 503, body: { error: "down" } }, (catalog) =>
      Effect.gen(function* () {
        const error = yield* catalog.search("arendt").pipe(Effect.flip);
        assert.strictEqual(error._tag, "CatalogUnavailable");
      }),
    ),
  );
});

import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";

import * as Videos from "./Videos.ts";

const withVideos = <A, E>(
  answer: { readonly status: number; readonly body: unknown },
  test: (videos: Videos.Videos["Service"], requests: ReadonlyArray<URL>) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const requests: Array<URL> = [];
    const client = HttpClient.make((request, url) =>
      Effect.sync(() => {
        requests.push(url);
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(answer.body), {
            status: answer.status,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
    const layer = Videos.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)));
    return yield* Effect.gen(function* () {
      return yield* test(yield* Videos.Videos, requests);
    }).pipe(Effect.provide(layer));
  });

const ID = "u4ZoJKF_VuA";

it.effect("asks YouTube for a video's title and channel at its watch page", () =>
  withVideos(
    {
      status: 200,
      body: { title: " Start with why | Simon Sinek ", author_name: "TEDx Talks", type: "video" },
    },
    (videos, requests) =>
      Effect.gen(function* () {
        const found = yield* videos.lookup(`https://youtu.be/${ID}?t=12`);

        assert.deepStrictEqual(found, {
          id: ID,
          url: `https://www.youtube.com/watch?v=${ID}`,
          title: "Start with why | Simon Sinek",
          channel: "TEDx Talks",
        });
        assert.strictEqual(
          `${requests[0]?.origin}${requests[0]?.pathname}`,
          "https://www.youtube.com/oembed",
        );
        assert.strictEqual(
          requests[0]?.searchParams.get("url"),
          `https://www.youtube.com/watch?v=${ID}`,
        );
      }),
  ),
);

it.effect("keeps a video YouTube gives no details for, and refuses one it does not have", () =>
  Effect.gen(function* () {
    const hidden = yield* withVideos({ status: 401, body: "Unauthorized" }, (videos) =>
      videos.lookup(`https://www.youtube.com/watch?v=${ID}`),
    );
    const missing = yield* withVideos({ status: 404, body: "Not Found" }, (videos) =>
      Effect.flip(videos.lookup(`https://www.youtube.com/watch?v=${ID}`)),
    );
    const down = yield* withVideos({ status: 503, body: "" }, (videos) =>
      Effect.flip(videos.lookup(`https://www.youtube.com/watch?v=${ID}`)),
    );

    assert.deepStrictEqual([hidden.title, hidden.channel], [null, null]);
    assert.deepStrictEqual([missing.reason, down.reason], ["not-found", "unavailable"]);
  }),
);

it.effect("refuses an address that is not a YouTube video without asking anyone", () =>
  withVideos({ status: 200, body: {} }, (videos, requests) =>
    Effect.gen(function* () {
      const refused = yield* Effect.flip(videos.lookup("https://vimeo.com/76979871"));

      assert.strictEqual(refused.reason, "not-youtube");
      assert.strictEqual(requests.length, 0);
    }),
  ),
);

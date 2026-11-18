import { videoAddress, type VideoFound, VideoNotFound, youtubeId } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

const OEMBED_URL = "https://www.youtube.com/oembed";

const USER_AGENT = "Glose (jan@dragsbaek.tech)";

const TIMEOUT = Duration.seconds(10);

const OEmbed = Schema.Struct({
  title: Schema.optionalKey(Schema.String),
  author_name: Schema.optionalKey(Schema.String),
});
const decodeOEmbed = Schema.decodeUnknownEffect(Schema.fromJsonString(OEmbed));

export class Videos extends Context.Service<
  Videos,
  {
    readonly lookup: (address: string) => Effect.Effect<VideoFound, VideoNotFound>;
  }
>()("glose/catalog/Videos") {}

const text = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const unavailable = () => new VideoNotFound({ reason: "unavailable" });

export const make = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient;

  return Videos.of({
    lookup: Effect.fn("Videos.lookup")(function* (address) {
      const id = youtubeId(address);
      if (id === null) return yield* new VideoNotFound({ reason: "not-youtube" });
      const url = videoAddress(id);
      const response = yield* http
        .execute(
          HttpClientRequest.get(OEMBED_URL).pipe(
            HttpClientRequest.setUrlParams({ url, format: "json" }),
            HttpClientRequest.acceptJson,
            HttpClientRequest.setHeader("User-Agent", USER_AGENT),
          ),
        )
        .pipe(Effect.timeout(TIMEOUT), Effect.mapError(unavailable));
      if (response.status === 401 || response.status === 403) {
        return { id, url, title: null, channel: null };
      }
      if (response.status === 400 || response.status === 404) {
        return yield* new VideoNotFound({ reason: "not-found" });
      }
      if (response.status < 200 || response.status >= 300) return yield* unavailable();
      const body = yield* response.text.pipe(Effect.timeout(TIMEOUT), Effect.mapError(unavailable));
      const found = yield* decodeOEmbed(body).pipe(Effect.mapError(unavailable));
      return { id, url, title: text(found.title), channel: text(found.author_name) };
    }),
  });
});

export const layer = Layer.effect(Videos, make);

import { type CatalogRecord, CatalogUnavailable, type SourceDetails } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as Settings from "../settings/Settings.ts";

const SEARCH_URL = "https://openlibrary.org/search.json";

const USER_AGENT = "Glose (jan@dragsbaek.tech)";

const LIMIT = 8;
const TIMEOUT = Duration.seconds(10);

const FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "editions",
  "editions.title",
  "editions.publisher",
  "editions.publish_year",
].join(",");

const Strings = Schema.optionalKey(Schema.Array(Schema.String));
const Years = Schema.optionalKey(Schema.Array(Schema.Number));

const SearchResult = Schema.Struct({
  docs: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      title: Schema.optionalKey(Schema.String),
      author_name: Strings,
      first_publish_year: Schema.optionalKey(Schema.Number),
      editions: Schema.optionalKey(
        Schema.Struct({
          docs: Schema.Array(
            Schema.Struct({
              title: Schema.optionalKey(Schema.String),
              publisher: Strings,
              publish_year: Years,
            }),
          ),
        }),
      ),
    }),
  ),
});
type Work = (typeof SearchResult.Type)["docs"][number];
const decodeSearchResult = Schema.decodeUnknownEffect(Schema.fromJsonString(SearchResult));

export class Catalog extends Context.Service<
  Catalog,
  {
    readonly search: (
      query: string,
    ) => Effect.Effect<ReadonlyArray<CatalogRecord>, CatalogUnavailable>;
  }
>()("glose/catalog/Catalog") {}

const text = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const titleText = (value: string | undefined) => text(value?.replace(/[\s.,;:/]+$/u, ""));

const year = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value >= -3000 && value <= 9999 ? value : null;

export const splitName = (name: string): { familyName: string; givenName: string | null } => {
  const comma = name.indexOf(",");
  if (comma !== -1) {
    return { familyName: name.slice(0, comma).trim(), givenName: text(name.slice(comma + 1)) };
  }
  const words = name.trim().split(/\s+/u);
  return {
    familyName: words.at(-1) ?? "",
    givenName: text(words.slice(0, -1).join(" ")),
  };
};

const toRecord = (work: Work): ReadonlyArray<CatalogRecord> => {
  const edition = work.editions?.docs[0];
  const author = text(work.author_name?.[0]);
  const title = titleText(edition?.title) ?? titleText(work.title);
  if (author === null || title === null) return [];
  const { familyName, givenName } = splitName(author);
  if (familyName === "") return [];
  const details: SourceDetails = {
    familyName,
    givenName,
    title,
    firstPublished: year(work.first_publish_year),
    edition: null,
    editionYear: year(edition?.publish_year?.[0]),
    publisher: text(edition?.publisher?.[0]),
    translator: null,
  };
  return [{ id: work.key, details }];
};

const unavailable = (cause: unknown) => new CatalogUnavailable({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const http = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const settings = yield* Settings.Settings;

  return Catalog.of({
    search: Effect.fn("Catalog.search")(function* (query) {
      const language = yield* settings.get.pipe(
        Effect.map(({ settings }) => settings.language ?? "en"),
        Effect.orElseSucceed(() => "en" as const),
      );
      const body = yield* http
        .execute(
          HttpClientRequest.get(SEARCH_URL).pipe(
            HttpClientRequest.setUrlParams({
              q: query,
              fields: FIELDS,
              lang: language,
              limit: String(LIMIT),
            }),
            HttpClientRequest.acceptJson,
            HttpClientRequest.setHeader("User-Agent", USER_AGENT),
          ),
        )
        .pipe(
          Effect.flatMap((response) => response.text),
          Effect.timeout(TIMEOUT),
          Effect.mapError(unavailable),
        );
      const { docs } = yield* decodeSearchResult(body).pipe(Effect.mapError(unavailable));
      return docs.flatMap(toRecord);
    }),
  });
});

export const layer = Layer.effect(Catalog, make);

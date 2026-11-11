import { type CatalogRecord, CatalogUnavailable, type SourceDetails } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as Settings from "../settings/Settings.ts";

/**
 * Open Library's search API: open data from the Internet Archive, free and without a key.
 * https://openlibrary.org/dev/docs/api/search. A test points this at a fake.
 */
export const OpenLibrary = Context.Reference<{ readonly searchUrl: string }>(
  "glose/catalog/OpenLibrary",
  { defaultValue: () => ({ searchUrl: "https://openlibrary.org/search.json" }) },
);

/** Open Library asks every app to name itself and a way to reach its makers. */
const USER_AGENT = "Glose (jan@dragsbaek.tech)";

const LIMIT = 8;
const TIMEOUT = Duration.seconds(10);

/** Work fields, and the fields of the edition that best matches the search. */
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
    /** Works that match the query, best match first, each with its best-matching edition. */
    readonly search: (
      query: string,
    ) => Effect.Effect<ReadonlyArray<CatalogRecord>, CatalogUnavailable>;
  }
>()("glose/catalog/Catalog") {}

const text = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

/** Catalogers end some titles with ISBD punctuation ("Erindringer."); a Source title has none. */
const titleText = (value: string | undefined) => text(value?.replace(/[\s.,;:/]+$/u, ""));

/** Open Library has some impossible years; a Source only takes those its schema accepts. */
const year = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value >= -3000 && value <= 9999 ? value : null;

/**
 * Open Library keeps an author's name as one string, mostly "Given Family" and sometimes
 * "Family, Given". The last word is taken as the family name; the user corrects the rest.
 */
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

/**
 * The edition supplies the title as printed, the publisher and the edition year; the work
 * supplies the year of first publication. A work without an author or a title is left out.
 */
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
      const { searchUrl } = yield* OpenLibrary;
      // Editions in the interface language come first, so a Danish reader finds the Danish one.
      const language = yield* settings.get.pipe(
        Effect.map(({ settings }) => settings.language ?? "en"),
        Effect.orElseSucceed(() => "en" as const),
      );
      const body = yield* http
        .execute(
          HttpClientRequest.get(searchUrl).pipe(
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

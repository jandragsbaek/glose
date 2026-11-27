import type { Source } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Sources from "../vault/Sources.ts";
import type { AgentTool } from "./agent.ts";

const MAX_SOURCES = 30;

const ListSourcesArguments = Schema.Struct({
  words: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
const decodeListSources = Schema.decodeUnknownOption(ListSourcesArguments);

export const describeSource = (source: Source) => ({
  id: source.id,
  kind: source.kind,
  author: { family: source.familyName, given: source.givenName },
  otherAuthors: source.otherAuthors,
  title: source.title,
  appearedIn: source.container,
  published: source.published,
  lesson: source.part,
  firstPublished: source.firstPublished,
  edition: source.edition,
  editionYear: source.editionYear,
  publisher: source.publisher,
  translator: source.translator,
  readingStep: source.readingStep,
  readingStart: source.readingStart,
});

const wordsOf = (text: string) =>
  Array.from(
    text
      .normalize("NFC")
      .toLocaleLowerCase("und")
      .matchAll(/[\p{L}\p{N}]+/gu),
    (word) => word[0],
  );

const findText = (source: Source) =>
  [
    source.id,
    source.title,
    source.familyName,
    source.givenName,
    ...source.otherAuthors,
    source.container,
    source.part,
    source.publisher,
    source.translator,
    source.firstPublished,
    source.editionYear,
    source.published,
  ]
    .filter((field) => field !== null)
    .join(" ")
    .normalize("NFC")
    .toLocaleLowerCase("und");

export const listSources = (all: ReadonlyArray<Source>, words: string | null) => {
  const asked = [...new Set(wordsOf(words ?? ""))];
  const found =
    asked.length === 0
      ? all
      : all
          .map((source) => {
            const text = findText(source);
            const whole = new Set(wordsOf(text));
            const hits = asked.reduce(
              (sum, word) => sum + (whole.has(word) ? 2 : text.includes(word) ? 1 : 0),
              0,
            );
            return { source, hits };
          })
          .filter(({ hits }) => hits > 0)
          .sort((a, b) => b.hits - a.hits)
          .map(({ source }) => source);
  return { sources: found.slice(0, MAX_SOURCES).map(describeSource), total: found.length };
};

export const listSourcesTool = (sources: Sources.Sources["Service"]): AgentTool => ({
  name: "list_sources",
  entry: "list-sources",
  description: `List the Sources in the user's Graph, with bibliographic data and reading step, without Free text. Returns at most ${MAX_SOURCES}: without words the most recently changed, with words the Sources whose author, title, year or publisher hold the most of them (a whole word counts twice a part of a word). total says how many there are; when it is more, look up a Source by its author or title words.`,
  parameters: {
    type: "object",
    properties: {
      words: {
        type: ["string", "null"],
        description: "Words from an author, a title or a year to find a Source; null for all.",
      },
    },
    required: ["words"],
    additionalProperties: false,
  },
  run: (args) =>
    sources.list.pipe(
      Effect.map((all) =>
        listSources(all, Option.getOrNull(decodeListSources(args))?.words ?? null),
      ),
      Effect.orElseSucceed(() => ({ error: "The Sources could not be read." })),
    ),
});

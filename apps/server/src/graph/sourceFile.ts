import { ReadingStart, ReadingStep, type Source, SourceDetails } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Yaml from "yaml";

export const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

const MaybeText = Schema.optionalKey(Schema.NullOr(Schema.Union([Schema.String, Schema.Number])));
const MaybeYear = Schema.optionalKey(Schema.NullOr(Schema.Int));

const SourceFrontmatter = Schema.Struct({
  glose: Schema.Literal("source"),
  "author-family": Schema.Union([Schema.String, Schema.Number]),
  "author-given": MaybeText,
  title: Schema.Union([Schema.String, Schema.Number]),
  "first-published": MaybeYear,
  edition: MaybeText,
  "edition-year": MaybeYear,
  publisher: MaybeText,
  translator: MaybeText,
  "reading-step": Schema.optionalKey(ReadingStep),
  "reading-start": Schema.optionalKey(ReadingStart),
  added: Schema.optionalKey(Schema.Unknown),
});
const decodeFrontmatter = Schema.decodeUnknownOption(SourceFrontmatter);
const decodeDetails = Schema.decodeUnknownOption(SourceDetails);

const text = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value).trim();

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const addedTime = (value: unknown): number | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== "string") return null;
  const date = LOCAL_DATE.exec(value.trim());
  if (date) return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3])).getTime();
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};

const twoDigits = (value: number) => String(value).padStart(2, "0");

const localDate = (time: number): string => {
  const date = new Date(time);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
};

export type SourceFileContent = Omit<Source, "id" | "modified" | "added"> & {
  readonly added: number | null;
};

export const parseYaml = (yaml: string): unknown => {
  try {
    return Yaml.parse(yaml);
  } catch {
    return undefined;
  }
};

export const parseSourceFile = (markdown: string): Option.Option<SourceFileContent> => {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return Option.none();
  return decodeFrontmatter(parseYaml(match[1] ?? "")).pipe(
    Option.flatMap((data) =>
      decodeDetails({
        familyName: String(data["author-family"]),
        givenName: text(data["author-given"]),
        title: String(data.title),
        firstPublished: data["first-published"] ?? null,
        edition: text(data.edition),
        editionYear: data["edition-year"] ?? null,
        publisher: text(data.publisher),
        translator: text(data.translator),
      }).pipe(
        Option.map((details) => ({
          ...details,
          readingStep: data["reading-step"] ?? "free-text",
          readingStart: data["reading-start"] ?? null,
          added: addedTime(data.added),
          freeText: (match[2] ?? "").replace(/^\r?\n/, "").trimEnd(),
        })),
      ),
    ),
  );
};

export const renderSourceFile = (source: SourceFileContent): string => {
  const details: SourceDetails = source;
  const frontmatter = Object.fromEntries(
    Object.entries({
      glose: "source",
      "author-family": details.familyName,
      "author-given": details.givenName,
      title: details.title,
      "first-published": details.firstPublished,
      edition: details.edition,
      "edition-year": details.editionYear,
      publisher: details.publisher,
      translator: details.translator,
      "reading-step": source.readingStep,
      "reading-start": source.readingStart,
      added: source.added === null ? null : localDate(source.added),
    }).filter(([, value]) => value !== null),
  );
  const body = source.freeText.trimEnd();
  return `---\n${Yaml.stringify(frontmatter)}---\n${body === "" ? "" : `\n${body}\n`}`;
};

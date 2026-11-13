import { ReadingStart, ReadingStep, type Source, SourceDetails } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Yaml from "yaml";

/**
 * A Source file is plain Markdown that any editor can read: YAML frontmatter with the
 * bibliographic data and the Reading Stage step, then the user's Free text as the body.
 */
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
  /** Read leniently: a date Glose cannot read is left out, and the file stays a Source. */
  added: Schema.optionalKey(Schema.Unknown),
});
const decodeFrontmatter = Schema.decodeUnknownOption(SourceFrontmatter);
const decodeDetails = Schema.decodeUnknownOption(SourceDetails);

const text = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value).trim();

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `added: 2026-11-13` is a day on this computer's calendar; a full time is read as written. */
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

/** What the file holds; `added` is null when its frontmatter gives no date Glose can read. */
export type SourceFileContent = Omit<Source, "id" | "modified" | "added"> & {
  readonly added: number | null;
};

/** A user may break the YAML in another editor; that file then reads as not a Source. */
export const parseYaml = (yaml: string): unknown => {
  try {
    return Yaml.parse(yaml);
  } catch {
    return undefined;
  }
};

/** None when the file is not a Glose Source (another Note, or frontmatter it cannot read). */
export const parseSourceFile = (markdown: string): Option.Option<SourceFileContent> => {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return Option.none();
  return decodeFrontmatter(parseYaml(match[1] ?? "")).pipe(
    Option.flatMap((data) =>
      // The same rules as the RPC: a file that breaks them (an empty author, say) is skipped.
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

/** Empty fields are left out, so the frontmatter shows only what the user entered. */
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

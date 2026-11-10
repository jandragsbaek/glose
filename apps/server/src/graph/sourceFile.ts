import { ReadingStep, type Source, SourceDetails } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Yaml from "yaml";

/**
 * A Source file is plain Markdown that any editor can read: YAML frontmatter with the
 * bibliographic data and the Reading Stage step, then the user's Free text as the body.
 */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

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
});
const decodeFrontmatter = Schema.decodeUnknownOption(SourceFrontmatter);
const decodeDetails = Schema.decodeUnknownOption(SourceDetails);

const text = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value).trim();

export type SourceFileContent = Omit<Source, "id" | "modified">;

/** A user may break the YAML in another editor; that file then reads as not a Source. */
const parseYaml = (yaml: string): unknown => {
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
    }).filter(([, value]) => value !== null),
  );
  const body = source.freeText.trimEnd();
  return `---\n${Yaml.stringify(frontmatter)}---\n${body === "" ? "" : `\n${body}\n`}`;
};

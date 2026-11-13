import {
  CitationStyle,
  type PublicationRecord,
  ReferenceForm,
  type WritingProject,
  WritingProjectType,
} from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Yaml from "yaml";

import { FRONTMATTER, parseYaml } from "../graph/sourceFile.ts";

/**
 * A Writing project is one Markdown file in the Graph folder's `Writing` folder: YAML frontmatter
 * with its settings, then the prose with its References (`[[Note]]{p. 64}`).
 */
const WritingFrontmatter = Schema.Struct({
  glose: Schema.Literal("writing-project"),
  title: Schema.Union([Schema.String, Schema.Number]),
  type: Schema.optionalKey(WritingProjectType),
  language: Schema.optionalKey(Schema.String),
  "reference-form": Schema.optionalKey(ReferenceForm),
  "citation-style": Schema.optionalKey(CitationStyle),
  /** YAML reads `2026-11-13` as a date unless it is quoted; both are read. */
  published: Schema.optionalKey(Schema.Unknown),
  "published-file": Schema.optionalKey(Schema.String),
});
const decodeFrontmatter = Schema.decodeUnknownOption(WritingFrontmatter);

export type WritingFileContent = Omit<WritingProject, "id" | "modified">;

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** A day as `2026-11-13`, from a YAML date or a string. */
const dayOf = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${twoDigits(value.getUTCMonth() + 1)}-${twoDigits(value.getUTCDate())}`;
  }
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? value.trim()
    : null;
};

/** None when the file is not a Writing project Glose can read. */
export const parseWritingFile = (markdown: string): Option.Option<WritingFileContent> => {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return Option.none();
  return decodeFrontmatter(parseYaml(match[1] ?? "")).pipe(
    Option.filter((data) => String(data.title).trim() !== ""),
    Option.map((data) => {
      const date = dayOf(data.published);
      const file = data["published-file"];
      const published: PublicationRecord | null =
        date === null || file === undefined ? null : { date, file };
      return {
        title: String(data.title).trim(),
        type: data.type ?? "blog-post",
        language: data.language ?? "en",
        referenceForm: data["reference-form"] ?? "footnotes",
        citationStyle: data["citation-style"] ?? "chicago",
        body: (match[2] ?? "").replace(/^\r?\n/, "").trimEnd(),
        published,
      };
    }),
  );
};

/** A Blog post has no citation style, an assignment no Reference form; neither is written. */
export const renderWritingFile = (content: WritingFileContent): string => {
  const frontmatter = Object.fromEntries(
    Object.entries({
      glose: "writing-project",
      title: content.title,
      type: content.type,
      language: content.language,
      "reference-form": content.type === "blog-post" ? content.referenceForm : null,
      "citation-style": content.type === "assignment" ? content.citationStyle : null,
      published: content.published?.date ?? null,
      "published-file": content.published?.file ?? null,
    }).filter(([, value]) => value !== null),
  );
  const body = content.body.trimEnd();
  return `---\n${Yaml.stringify(frontmatter)}---\n${body === "" ? "" : `\n${body}\n`}`;
};

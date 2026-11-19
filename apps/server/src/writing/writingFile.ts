import {
  anchorTries,
  CitationStyle,
  type PublicationRecord,
  ReferenceForm,
  type TryGroup,
  type WritingProject,
  WritingProjectType,
} from "@glose/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Yaml from "yaml";

import { FRONTMATTER, parseYaml } from "../vault/sourceFile.ts";

const WritingFrontmatter = Schema.Struct({
  glose: Schema.Literal("writing-project"),
  title: Schema.Union([Schema.String, Schema.Number]),
  type: Schema.optionalKey(WritingProjectType),
  language: Schema.optionalKey(Schema.String),
  "reference-form": Schema.optionalKey(ReferenceForm),
  "citation-style": Schema.optionalKey(CitationStyle),
  published: Schema.optionalKey(Schema.Unknown),
  "published-file": Schema.optionalKey(Schema.String),
});
const decodeFrontmatter = Schema.decodeUnknownOption(WritingFrontmatter);

const Text = Schema.Union([Schema.String, Schema.Number]);
const SavedTry = Schema.Struct({
  at: Schema.Int,
  showing: Schema.Int,
  tries: Schema.Array(Text),
  ai: Schema.optionalKey(Schema.Array(Text)),
});
const decodeTry = Schema.decodeUnknownOption(SavedTry);

const TRIES_OPEN = "<!-- glose:tries\n";
const TRIES_CLOSE = "-->";

const parseTries = (yaml: string): ReadonlyArray<TryGroup> => {
  const items: unknown = parseYaml(yaml);
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) =>
    Option.toArray(
      decodeTry(item).pipe(
        Option.map((saved) => ({
          at: saved.at,
          showing: saved.showing,
          tries: saved.tries.map(String),
          ai: (saved.ai ?? []).map(String),
        })),
      ),
    ),
  );
};

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/u;

interface Open {
  fence: string | null;
  comment: boolean;
  code: number;
}

const tickRun = (line: string, at: number) => {
  let end = at;
  while (line[end] === "`") end += 1;
  return end - at;
};

const scanInline = (line: string, open: Open) => {
  let at = 0;
  while (at < line.length) {
    if (line[at] === "\\" && !open.comment) {
      at += 2;
    } else if (open.comment) {
      const close = line.indexOf("-->", at);
      if (close < 0) return;
      open.comment = false;
      at = close + 3;
    } else if (line[at] === "`") {
      const ticks = tickRun(line, at);
      open.code = open.code === 0 ? ticks : open.code === ticks ? 0 : open.code;
      at += ticks;
    } else if (open.code === 0 && line.startsWith("<!--", at)) {
      open.comment = true;
      at += 4;
    } else {
      at += 1;
    }
  }
};

const openBlocks = (text: string) => {
  const open: Open = { fence: null, comment: false, code: 0 };
  for (const line of text.split("\n")) {
    const mark = FENCE.exec(line);
    const fenceMark = mark?.[1] ?? "";
    const info = mark?.[2] ?? "";
    if (open.fence === null && !open.comment && (mark !== null || /^ {0,3}<!--/u.test(line)))
      open.code = 0;
    if (open.fence !== null) {
      if (
        fenceMark[0] === open.fence[0] &&
        fenceMark.length >= open.fence.length &&
        info.trim() === ""
      )
        open.fence = null;
    } else if (
      !open.comment &&
      open.code === 0 &&
      mark !== null &&
      !(fenceMark.startsWith("`") && info.includes("`"))
    ) {
      open.fence = fenceMark;
    } else {
      if (line.trim() === "") open.code = 0;
      scanInline(line, open);
    }
  }
  return { fence: open.fence, comment: open.comment };
};

const splitTries = (text: string) => {
  const open = text.lastIndexOf(TRIES_OPEN);
  const inside = open < 0 ? "" : text.slice(open + TRIES_OPEN.length);
  const close = inside.indexOf(TRIES_CLOSE);
  const blocks = open < 0 ? null : openBlocks(text.slice(0, open));
  const last =
    blocks !== null &&
    blocks.fence === null &&
    !blocks.comment &&
    (open === 0 || text[open - 1] === "\n") &&
    close >= 0 &&
    inside.slice(close + TRIES_CLOSE.length).trim() === "";
  if (!last) return { body: text, tries: [] };
  const body = text.slice(0, open).trimEnd();
  return { body, tries: anchorTries(body, parseTries(inside.slice(0, close))) };
};

export type WritingFileContent = Omit<WritingProject, "id" | "modified">;

const twoDigits = (value: number) => String(value).padStart(2, "0");

const dayOf = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${twoDigits(value.getUTCMonth() + 1)}-${twoDigits(value.getUTCDate())}`;
  }
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? value.trim()
    : null;
};

export const parseWritingFile = (markdown: string): Option.Option<WritingFileContent> => {
  const match = FRONTMATTER.exec(markdown.replace(/\r\n?/g, "\n"));
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
        ...splitTries((match[2] ?? "").replace(/^\r?\n/, "").trimEnd()),
        published,
      };
    }),
  );
};

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
  const written = content.body.replace(/\r\n?/g, "\n").trimEnd();
  const tries = anchorTries(written, content.tries).map(({ at, showing, tries: all, ai }) =>
    ai.length === 0 ? { at, showing, tries: all } : { at, showing, tries: all, ai },
  );
  const open = tries.length === 0 ? { fence: null, comment: false } : openBlocks(written);
  const body = `${written}${open.fence === null ? "" : `\n${open.fence}`}${open.comment ? "\n-->" : ""}`;
  const block = tries.length === 0 ? "" : `\n<!-- glose:tries\n${Yaml.stringify(tries)}-->\n`;
  return `---\n${Yaml.stringify(frontmatter)}---\n${body === "" ? "" : `\n${body}\n`}${block}`;
};

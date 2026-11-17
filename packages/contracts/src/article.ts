import {
  type Article,
  type ArticleBlock,
  type ArticlePassage,
  type ArticleSection,
  type ArticleUnit,
  FRONTMATTER,
  GLOSE_NOTE,
  type Inline,
  type ListItem,
  parseInlines,
  plainOf,
} from "./articleInline.ts";

interface Line {
  readonly text: string;
  readonly start: number;
}

const linesOf = (markdown: string, offset: number): Line[] => {
  const out: Line[] = [];
  let start = offset;
  for (const text of markdown.slice(offset).split("\n")) {
    out.push({ text: text.replace(/\r$/, ""), start });
    start += text.length + 1;
  }
  return out;
};

const blank = (line: Line | undefined) => line === undefined || line.text.trim() === "";

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])[ \t]+/;
const QUOTE = /^ {0,3}> ?/;
const FOOTNOTE = /^\[\^([^\]\s]+)\]:[ \t]?/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const IMAGE_LINE = /^\s*!\[[^\]]*\]\([^)]*\)\s*$/;

const startsBlock = (line: Line, next: Line | undefined) =>
  FENCE.test(line.text) ||
  HEADING.test(line.text) ||
  RULE.test(line.text) ||
  LIST.test(line.text) ||
  QUOTE.test(line.text) ||
  FOOTNOTE.test(line.text) ||
  (line.text.includes("|") && next !== undefined && TABLE_SEPARATOR.test(next.text));

const unitContent = (parts: ReadonlyArray<{ readonly text: string; readonly start: number }>) => {
  let content = "";
  const rawOf: number[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      rawOf.push(parts[index - 1]!.start + parts[index - 1]!.text.length);
      content += "\n";
    }
    for (let at = 0; at < part.text.length; at++) rawOf.push(part.start + at);
    content += part.text;
  });
  const last = parts.at(-1);
  rawOf.push(last === undefined ? 0 : last.start + last.text.length);
  return { content, rawOf };
};

const trimParts = (parts: ReadonlyArray<{ readonly text: string; readonly start: number }>) =>
  parts.map((part) => {
    const lead = /^\s*/.exec(part.text)![0].length;
    const text = part.text.slice(lead).replace(/\s+$/, "");
    return { text, start: part.start + lead };
  });

const tableCells = (line: Line) => {
  const text = line.text.trim().replace(/^\|/, "").replace(/\|$/, "");
  return text.split(/(?<!\\)\|/).map((cell) => parseInlines(cell.trim()));
};

const slugText = (inlines: ReadonlyArray<Inline>) => plainOf(inlines).replace(/\s+/g, " ").trim();

export const parseArticle = (markdown: string): Article => {
  const frontmatter = FRONTMATTER.exec(markdown);
  const lines = linesOf(markdown, frontmatter === null ? 0 : frontmatter[0].length);
  const blocks: ArticleBlock[] = [];
  const units: ArticleUnit[] = [];
  const footnotes = new Map<string, string>();
  const headings: Array<{ title: string; level: number; firstUnit: number }> = [];

  const makeUnit = (parts: ReadonlyArray<{ readonly text: string; readonly start: number }>) => {
    const { content, rawOf } = unitContent(trimParts(parts));
    const inlines = parseInlines(content);
    const unit: ArticleUnit = {
      n: units.length + 1,
      content,
      rawOf,
      inlines,
      plain: plainOf(inlines),
    };
    units.push(unit);
    return unit;
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    if (blank(line)) {
      index++;
      continue;
    }
    const fence = FENCE.exec(line.text);
    if (fence !== null) {
      const marker = fence[1]!;
      const body: string[] = [];
      index++;
      while (index < lines.length && !lines[index]!.text.trimStart().startsWith(marker)) {
        body.push(lines[index]!.text);
        index++;
      }
      index++;
      blocks.push({ kind: "code", lang: fence[2] ?? "", text: body.join("\n") });
      continue;
    }
    const heading = HEADING.exec(line.text);
    if (heading !== null) {
      const content = heading[2] ?? "";
      const inlines = parseInlines(content);
      const text = slugText(inlines);
      headings.push({ title: text, level: heading[1]!.length, firstUnit: units.length + 1 });
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        inlines,
        text,
        section: headings.length - 1,
      });
      index++;
      continue;
    }
    if (RULE.test(line.text)) {
      blocks.push({ kind: "rule" });
      index++;
      continue;
    }
    const footnote = FOOTNOTE.exec(line.text);
    if (footnote !== null) {
      const body = [line.text.slice(footnote[0].length)];
      index++;
      while (index < lines.length) {
        const next = lines[index]!;
        if (/^( {4}|\t)/.test(next.text)) body.push(next.text.replace(/^( {4}|\t)/, ""));
        else if (blank(next) && /^( {4}|\t)/.test(lines[index + 1]?.text ?? "")) body.push("");
        else break;
        index++;
      }
      footnotes.set(footnote[1]!, body.join("\n").trim());
      continue;
    }
    if (line.text.includes("|") && TABLE_SEPARATOR.test(lines[index + 1]?.text ?? "")) {
      const head = tableCells(line);
      const rows: Array<ReadonlyArray<ReadonlyArray<Inline>>> = [];
      index += 2;
      while (index < lines.length && !blank(lines[index]) && lines[index]!.text.includes("|")) {
        rows.push(tableCells(lines[index]!));
        index++;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }
    if (IMAGE_LINE.test(line.text)) {
      const image = parseInlines(line.text.trim()).find((inline) => inline.kind === "image");
      if (image?.kind === "image") blocks.push({ kind: "image", alt: image.alt, src: image.src });
      index++;
      continue;
    }
    if (QUOTE.test(line.text)) {
      const quoted: Line[] = [];
      while (index < lines.length && QUOTE.test(lines[index]!.text)) {
        const prefix = QUOTE.exec(lines[index]!.text)![0].length;
        quoted.push({
          text: lines[index]!.text.slice(prefix),
          start: lines[index]!.start + prefix,
        });
        index++;
      }
      const quoteUnits: ArticleUnit[] = [];
      let run: Line[] = [];
      for (const part of [...quoted, { text: "", start: 0 }]) {
        if (part.text.trim() === "") {
          if (run.length > 0) quoteUnits.push(makeUnit(run));
          run = [];
        } else run.push(part);
      }
      blocks.push({ kind: "quote", units: quoteUnits });
      continue;
    }
    const list = LIST.exec(line.text);
    if (list !== null) {
      const ordered = /\d/.test(list[2]!);
      const items: ListItem[] = [];
      const indents: number[] = [];
      while (index < lines.length) {
        const item = LIST.exec(lines[index]!.text);
        if (item === null) break;
        const indent = item[1]!.length;
        while (indents.length > 0 && indents.at(-1)! > indent) indents.pop();
        if (indents.length === 0 || indents.at(-1)! < indent) indents.push(indent);
        const parts: Line[] = [
          {
            text: lines[index]!.text.slice(item[0].length),
            start: lines[index]!.start + item[0].length,
          },
        ];
        index++;
        while (
          index < lines.length &&
          !blank(lines[index]) &&
          !LIST.test(lines[index]!.text) &&
          !startsBlock(lines[index]!, lines[index + 1])
        ) {
          parts.push(lines[index]!);
          index++;
        }
        items.push({ depth: indents.length - 1, unit: makeUnit(parts) });
        if (blank(lines[index]) && LIST.test(lines[index + 1]?.text ?? "")) index++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    const parts: Line[] = [line];
    index++;
    while (
      index < lines.length &&
      !blank(lines[index]) &&
      !startsBlock(lines[index]!, lines[index + 1])
    ) {
      parts.push(lines[index]!);
      index++;
    }
    blocks.push({ kind: "paragraph", unit: makeUnit(parts) });
  }

  const passages: ArticlePassage[] = [];
  for (const unit of units) {
    let count = 0;
    let plainAt = 0;
    unit.inlines.forEach((inline, at) => {
      const start = plainAt;
      plainAt += plainOf([inline]).length;
      if (inline.kind !== "highlight") return;
      count++;
      const next = unit.inlines[at + 1];
      const label = next?.kind === "note" && next.label.startsWith(GLOSE_NOTE) ? next.label : null;
      passages.push({
        id: `${unit.n}.${count}`,
        n: unit.n,
        at: start,
        text: plainOf(inline.children).replace(/\s+/g, " ").trim(),
        words: label === null ? null : (footnotes.get(label) ?? null),
      });
    });
  }

  const sections: ArticleSection[] = headings.map((heading, at) => {
    const nextFirst = headings[at + 1]?.firstUnit ?? units.length + 1;
    const last = nextFirst - 1;
    return {
      title: heading.title,
      level: heading.level,
      first: heading.firstUnit <= last ? heading.firstUnit : null,
      last: heading.firstUnit <= last ? last : null,
    };
  });

  const words = units.reduce(
    (sum, unit) =>
      sum + unit.plain.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
    0,
  );

  return { blocks, units, passages, sections, footnotes, words };
};

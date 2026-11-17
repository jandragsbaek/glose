import {
  type Article,
  type ArticleUnit,
  GLOSE_NOTE,
  type Inline,
  plainOf,
} from "./articleInline.ts";
import { parseArticle } from "./article.ts";

export type PassageEdit =
  | { readonly _tag: "Edited"; readonly markdown: string; readonly passage: string | null }
  | { readonly _tag: "Refused"; readonly reason: "not-found" | "empty" | "overlap" };

interface Piece {
  readonly inline: Inline;
  readonly start: number;
  readonly end: number;
}

const piecesOf = (unit: ArticleUnit): Piece[] => {
  let at = 0;
  return unit.inlines.map((inline) => {
    const length = plainOf([inline]).length;
    const piece = { inline, start: at, end: at + length };
    at += length;
    return piece;
  });
};

const inWord = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}'’-]/u.test(char);

const nextGloseLabel = (footnotes: ReadonlyMap<string, string>) => {
  let number = 1;
  while (footnotes.has(`${GLOSE_NOTE}${number}`)) number++;
  return `${GLOSE_NOTE}${number}`;
};

const splice = (text: string, at: number, remove: number, insert: string) =>
  text.slice(0, at) + insert + text.slice(at + remove);

export const markPassage = (
  markdown: string,
  n: number,
  start: number,
  end: number,
): PassageEdit => {
  const article = parseArticle(markdown);
  const unit = article.units[n - 1];
  if (unit === undefined) return { _tag: "Refused", reason: "not-found" };
  let from = Math.max(0, Math.min(start, end));
  let to = Math.min(unit.plain.length, Math.max(start, end));
  while (from < to && /\s/.test(unit.plain[from]!)) from++;
  while (to > from && /\s/.test(unit.plain[to - 1]!)) to--;
  if (from >= to) return { _tag: "Refused", reason: "empty" };
  while (from > 0 && inWord(unit.plain[from - 1]) && inWord(unit.plain[from])) from--;
  while (to < unit.plain.length && inWord(unit.plain[to - 1]) && inWord(unit.plain[to])) to++;
  if (from >= to) return { _tag: "Refused", reason: "empty" };
  const pieces = piecesOf(unit);
  const touched = pieces.filter((piece) => piece.end > from && piece.start < to);
  if (touched.some((piece) => piece.inline.kind === "highlight")) {
    return { _tag: "Refused", reason: "overlap" };
  }
  const first = touched[0];
  const last = touched.at(-1);
  if (first === undefined || last === undefined) return { _tag: "Refused", reason: "empty" };
  const contentStart =
    first.inline.kind === "text" && first.inline.to - first.inline.from === first.inline.text.length
      ? first.inline.from + (from - first.start)
      : first.inline.from;
  const contentEnd =
    last.inline.kind === "text" && last.inline.to - last.inline.from === last.inline.text.length
      ? last.inline.from + (to - last.start)
      : last.inline.to;
  const rawStart = unit.rawOf[contentStart]!;
  const rawEnd = unit.rawOf[contentEnd]!;
  const edited = splice(splice(markdown, rawEnd, 0, "=="), rawStart, 0, "==");
  const before = unit.inlines.filter(
    (inline) => inline.kind === "highlight" && inline.from < contentStart,
  ).length;
  return { _tag: "Edited", markdown: edited, passage: `${n}.${before + 1}` };
};

const locate = (article: Article, id: string) => {
  const [n, k] = id.split(".").map(Number);
  const unit = n === undefined ? undefined : article.units[n - 1];
  if (unit === undefined || k === undefined) return null;
  let count = 0;
  for (let at = 0; at < unit.inlines.length; at++) {
    const inline = unit.inlines[at]!;
    if (inline.kind !== "highlight") continue;
    count++;
    if (count !== k) continue;
    const next = unit.inlines[at + 1];
    const note = next?.kind === "note" && next.label.startsWith(GLOSE_NOTE) ? next : null;
    return { unit, inline, note };
  }
  return null;
};

const footnoteSpan = (markdown: string, label: string) => {
  const pattern = new RegExp(
    `(^|\\n)\\[\\^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]:[^\\n]*(\\n(?:( {4}|\\t)[^\\n]*|[ \\t]*(?=\\n( {4}|\\t))))*`,
  );
  const match = pattern.exec(markdown);
  if (match === null) return null;
  const start = match.index + (match[1]?.length ?? 0);
  return { start, end: match.index + match[0].length };
};

const renderFootnote = (label: string, words: string) =>
  `[^${label}]: ${words
    .trim()
    .split(/\r?\n/)
    .map((line, at) => (at === 0 || line.trim() === "" ? line.trim() : `    ${line.trim()}`))
    .join("\n")
    .replace(/\n\n/g, "\n    \n")}`;

export const removePassage = (markdown: string, id: string): PassageEdit => {
  const found = locate(parseArticle(markdown), id);
  if (found === null) return { _tag: "Refused", reason: "not-found" };
  const { unit, inline, note } = found;
  let edited = markdown;
  if (note !== null) {
    const span = footnoteSpan(edited, note.label);
    if (span !== null) {
      edited = (edited.slice(0, span.start) + edited.slice(span.end)).replace(/\n{3,}$/, "\n\n");
    }
    edited = splice(edited, unit.rawOf[note.from]!, note.to - note.from, "");
  }
  edited = splice(edited, unit.rawOf[inline.to - 2]!, 2, "");
  edited = splice(edited, unit.rawOf[inline.from]!, 2, "");
  return { _tag: "Edited", markdown: edited.replace(/\s*$/, "\n"), passage: null };
};

export const setPassageWords = (markdown: string, id: string, words: string): PassageEdit => {
  const article = parseArticle(markdown);
  const found = locate(article, id);
  if (found === null) return { _tag: "Refused", reason: "not-found" };
  const { unit, inline, note } = found;
  const text = words.trim();
  if (note !== null) {
    const span = footnoteSpan(markdown, note.label);
    if (text === "") {
      let edited = markdown;
      if (span !== null) edited = edited.slice(0, span.start) + edited.slice(span.end);
      edited = splice(edited, unit.rawOf[note.from]!, note.to - note.from, "");
      return { _tag: "Edited", markdown: edited.replace(/\s*$/, "\n"), passage: id };
    }
    if (span !== null) {
      return {
        _tag: "Edited",
        markdown:
          markdown.slice(0, span.start) +
          renderFootnote(note.label, text) +
          markdown.slice(span.end),
        passage: id,
      };
    }
    return {
      _tag: "Edited",
      markdown: `${markdown.replace(/\s*$/, "")}\n\n${renderFootnote(note.label, text)}\n`,
      passage: id,
    };
  }
  if (text === "") return { _tag: "Edited", markdown, passage: id };
  const label = nextGloseLabel(article.footnotes);
  const withRef = splice(markdown, unit.rawOf[inline.to]!, 0, `[^${label}]`);
  return {
    _tag: "Edited",
    markdown: `${withRef.replace(/\s*$/, "")}\n\n${renderFootnote(label, text)}\n`,
    passage: id,
  };
};

export const findInArticle = (
  article: Pick<Article, "units">,
  quote: string,
): { readonly n: number; readonly text: string } | null => {
  const words = quote
    .trim()
    .replace(/^["'“”‘’«»„…\s]+|["'“”‘’«»„…\s]+$/g, "")
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return null;
  const pattern = new RegExp(
    words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
    "iu",
  );
  for (const unit of article.units) {
    const match = pattern.exec(unit.plain);
    if (match !== null) return { n: unit.n, text: match[0] };
  }
  return null;
};

export const articleForAi = (article: Article): string =>
  article.blocks
    .flatMap((block): string[] => {
      switch (block.kind) {
        case "heading":
          return [`${"#".repeat(block.level)} ${block.text}`];
        case "paragraph":
          return [`¶ ${block.unit.n}: ${block.unit.plain}`];
        case "list":
          return block.items.map(
            (item) => `¶ ${item.unit.n}: ${"  ".repeat(item.depth)}- ${item.unit.plain}`,
          );
        case "quote":
          return block.units.map((unit) => `¶ ${unit.n}: > ${unit.plain}`);
        case "code":
          return ["```" + block.lang, block.text, "```"];
        case "table":
          return [
            [block.head, ...block.rows]
              .map((row) => `| ${row.map((cell) => plainOf(cell)).join(" | ")} |`)
              .join("\n"),
          ];
        case "image":
          return [`[image: ${block.alt}]`];
        case "rule":
          return ["---"];
      }
    })
    .join("\n\n");

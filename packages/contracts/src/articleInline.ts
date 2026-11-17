export type Inline =
  | { readonly kind: "text"; readonly text: string; readonly from: number; readonly to: number }
  | { readonly kind: "code"; readonly text: string; readonly from: number; readonly to: number }
  | {
      readonly kind: "strong" | "em" | "highlight";
      readonly children: ReadonlyArray<Inline>;
      readonly from: number;
      readonly to: number;
    }
  | {
      readonly kind: "link";
      readonly href: string;
      readonly children: ReadonlyArray<Inline>;
      readonly from: number;
      readonly to: number;
    }
  | {
      readonly kind: "image";
      readonly alt: string;
      readonly src: string;
      readonly from: number;
      readonly to: number;
    }
  | { readonly kind: "note"; readonly label: string; readonly from: number; readonly to: number };

export interface ArticleUnit {
  readonly n: number;
  readonly content: string;
  readonly rawOf: ReadonlyArray<number>;
  readonly inlines: ReadonlyArray<Inline>;
  readonly plain: string;
}

export interface ListItem {
  readonly depth: number;
  readonly unit: ArticleUnit;
}

export type ArticleBlock =
  | {
      readonly kind: "heading";
      readonly level: number;
      readonly inlines: ReadonlyArray<Inline>;
      readonly text: string;
      readonly section: number;
    }
  | { readonly kind: "paragraph"; readonly unit: ArticleUnit }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: ReadonlyArray<ListItem> }
  | { readonly kind: "quote"; readonly units: ReadonlyArray<ArticleUnit> }
  | { readonly kind: "code"; readonly lang: string; readonly text: string }
  | {
      readonly kind: "table";
      readonly head: ReadonlyArray<ReadonlyArray<Inline>>;
      readonly rows: ReadonlyArray<ReadonlyArray<ReadonlyArray<Inline>>>;
    }
  | { readonly kind: "image"; readonly alt: string; readonly src: string }
  | { readonly kind: "rule" };

export interface ArticlePassage {
  readonly id: string;
  readonly n: number;
  readonly at: number;
  readonly text: string;
  readonly words: string | null;
}

export interface ArticleSection {
  readonly title: string;
  readonly level: number;
  readonly first: number | null;
  readonly last: number | null;
}

export interface Article {
  readonly blocks: ReadonlyArray<ArticleBlock>;
  readonly units: ReadonlyArray<ArticleUnit>;
  readonly passages: ReadonlyArray<ArticlePassage>;
  readonly sections: ReadonlyArray<ArticleSection>;
  readonly footnotes: ReadonlyMap<string, string>;
  readonly words: number;
}

export const GLOSE_NOTE = "glose-";

export const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export const articleFrontmatter = (markdown: string): string | null => {
  const match = FRONTMATTER.exec(markdown);
  return match === null
    ? null
    : match[0].replace(/^---\r?\n/, "").replace(/\r?\n---[ \t]*\r?\n?$/, "");
};

export const articleBody = (markdown: string): string =>
  markdown.replace(FRONTMATTER, "").replace(/^\s+/, "");

const escapable = /[\\`*_{}[\]()#+\-.!|=~<>]/;

const findClosing = (content: string, marker: string, from: number, end: number): number => {
  let at = from;
  while (at < end) {
    const found = content.indexOf(marker, at);
    if (found === -1 || found + marker.length > end) return -1;
    if (content[found - 1] !== "\\" && found > from) return found;
    at = found + 1;
  }
  return -1;
};

const matchBracket = (content: string, open: number, end: number): number => {
  let depth = 0;
  for (let at = open; at < end; at++) {
    const char = content[at];
    if (char === "\\") {
      at++;
      continue;
    }
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return at;
    }
  }
  return -1;
};

const wordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char);

export const parseInlines = (content: string, from = 0, end = content.length): Inline[] => {
  const out: Inline[] = [];
  let text = from;
  const flush = (to: number) => {
    if (to > text) out.push({ kind: "text", text: content.slice(text, to), from: text, to });
  };
  let at = from;
  while (at < end) {
    const char = content[at]!;
    const next = content[at + 1];
    if (char === "\\" && next !== undefined && escapable.test(next)) {
      flush(at);
      out.push({ kind: "text", text: next, from: at, to: at + 2 });
      at += 2;
      text = at;
      continue;
    }
    if (char === "`") {
      const run = /^`+/.exec(content.slice(at, end))![0];
      const close = content.indexOf(run, at + run.length);
      if (close !== -1 && close + run.length <= end) {
        flush(at);
        out.push({
          kind: "code",
          text: content.slice(at + run.length, close).trim(),
          from: at,
          to: close + run.length,
        });
        at = close + run.length;
        text = at;
        continue;
      }
      at += run.length;
      continue;
    }
    if (char === "!" && next === "[") {
      const close = matchBracket(content, at + 1, end);
      const target =
        close === -1
          ? null
          : /^\(([^()\s]*(?:\([^()]*\)[^()\s]*)*)(?:\s+"[^"]*")?\)/.exec(
              content.slice(close + 1, end),
            );
      if (close !== -1 && target !== null) {
        flush(at);
        const to = close + 1 + target[0].length;
        out.push({
          kind: "image",
          alt: content.slice(at + 2, close),
          src: target[1] ?? "",
          from: at,
          to,
        });
        at = to;
        text = at;
        continue;
      }
    }
    if (char === "[" && next === "^") {
      const close = content.indexOf("]", at);
      const label = close === -1 ? "" : content.slice(at + 2, close);
      if (close !== -1 && close < end && /^[^\s\]]+$/.test(label)) {
        flush(at);
        out.push({ kind: "note", label, from: at, to: close + 1 });
        at = close + 1;
        text = at;
        continue;
      }
    }
    if (char === "[") {
      const close = matchBracket(content, at, end);
      const target =
        close === -1
          ? null
          : /^\(<?([^()\s>]*(?:\([^()]*\)[^()\s>]*)*)>?(?:\s+"[^"]*")?\)/.exec(
              content.slice(close + 1, end),
            );
      if (close !== -1 && target !== null) {
        flush(at);
        const to = close + 1 + target[0].length;
        out.push({
          kind: "link",
          href: target[1] ?? "",
          children: parseInlines(content, at + 1, close),
          from: at,
          to,
        });
        at = to;
        text = at;
        continue;
      }
    }
    if (char === "<") {
      const auto = /^<(https?:\/\/[^\s>]+)>/.exec(content.slice(at, end));
      if (auto !== null) {
        flush(at);
        const to = at + auto[0].length;
        out.push({
          kind: "link",
          href: auto[1]!,
          children: [{ kind: "text", text: auto[1]!, from: at + 1, to: to - 1 }],
          from: at,
          to,
        });
        at = to;
        text = at;
        continue;
      }
    }
    const pair = content.slice(at, at + 2);
    if (pair === "==" || pair === "**" || pair === "__") {
      const close = findClosing(content, pair, at + 2, end);
      const opens = !/\s/.test(content[at + 2] ?? " ");
      const leftOk = pair !== "__" || !wordChar(content[at - 1]);
      if (close !== -1 && opens && leftOk && !/\s/.test(content[close - 1] ?? " ")) {
        flush(at);
        out.push({
          kind: pair === "==" ? "highlight" : "strong",
          children: parseInlines(content, at + 2, close),
          from: at,
          to: close + 2,
        });
        at = close + 2;
        text = at;
        continue;
      }
      at += 2;
      continue;
    }
    if (char === "*" || char === "_") {
      const close = findClosing(content, char, at + 1, end);
      const opens = !/\s/.test(content[at + 1] ?? " ");
      const leftOk = char === "*" || !wordChar(content[at - 1]);
      const rightOk = char === "*" || close === -1 || !wordChar(content[close + 1]);
      if (close !== -1 && opens && leftOk && rightOk && !/\s/.test(content[close - 1] ?? " ")) {
        flush(at);
        out.push({
          kind: "em",
          children: parseInlines(content, at + 1, close),
          from: at,
          to: close + 1,
        });
        at = close + 1;
        text = at;
        continue;
      }
    }
    at++;
  }
  flush(end);
  return out;
};

export const plainOf = (inlines: ReadonlyArray<Inline>): string =>
  inlines
    .map((inline) => {
      switch (inline.kind) {
        case "text":
        case "code":
          return inline.text;
        case "image":
        case "note":
          return "";
        default:
          return plainOf(inline.children);
      }
    })
    .join("");

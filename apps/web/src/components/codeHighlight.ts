import type { HighlighterCore, ThemeRegistration } from "shiki/core";
import { bundledLanguagesInfo } from "shiki/langs";

export type CodeRole =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "function"
  | "type"
  | "decorator"
  | "tag"
  | "attribute"
  | "property";

export interface CodeToken {
  readonly at: number;
  readonly text: string;
  readonly role: CodeRole | null;
}

export interface CodeLine {
  readonly at: number;
  readonly tokens: ReadonlyArray<CodeToken>;
}

const ROLES: ReadonlyArray<readonly [CodeRole, ReadonlyArray<string>]> = [
  ["comment", ["comment", "punctuation.definition.comment"]],
  [
    "string",
    [
      "string",
      "string.quoted.docstring",
      "constant.character.escape",
      "string.regexp",
      "markup.inline.raw",
      "markup.fenced_code",
    ],
  ],
  ["number", ["constant.numeric", "constant.language", "constant.character", "keyword.other.unit"]],
  [
    "keyword",
    [
      "keyword",
      "storage",
      "storage.type",
      "storage.modifier",
      "variable.language",
      "keyword.operator.new",
      "keyword.operator.expression",
      "keyword.operator.logical.python",
      "keyword.operator.wordlike",
    ],
  ],
  [
    "function",
    ["entity.name.function", "support.function", "meta.function-call.generic", "variable.function"],
  ],
  [
    "type",
    [
      "entity.name.type",
      "entity.name.class",
      "entity.other.inherited-class",
      "support.type",
      "support.class",
      "storage.type.primitive",
      "storage.type.built-in",
      "storage.type.numeric.go",
      "storage.type.string.go",
      "entity.name.namespace",
    ],
  ],
  [
    "decorator",
    [
      "meta.decorator",
      "entity.name.function.decorator",
      "punctuation.decorator",
      "punctuation.definition.decorator",
      "storage.type.annotation",
      "punctuation.definition.annotation",
      "entity.name.function.macro",
      "meta.attribute.rust",
    ],
  ],
  ["tag", ["entity.name.tag", "punctuation.definition.tag", "markup.heading"]],
  ["attribute", ["entity.other.attribute-name"]],
  [
    "property",
    [
      "support.type.property-name",
      "variable.other.property",
      "variable.other.object.property",
      "meta.object-literal.key",
      "entity.name.tag.yaml",
      "entity.name.tag.toml",
      "support.type.property-name.json",
    ],
  ],
];

const PLAIN = "plain";

const glose: ThemeRegistration = {
  name: "glose",
  type: "light",
  colors: { "editor.foreground": PLAIN, "editor.background": PLAIN },
  tokenColors: [
    { settings: { foreground: PLAIN } },
    ...ROLES.map(([role, scope]) => ({ scope: [...scope], settings: { foreground: role } })),
  ],
};

const isRole = (value: string | undefined): value is CodeRole =>
  ROLES.some(([role]) => role === value);

const byName = new Map(
  bundledLanguagesInfo.flatMap((info) =>
    [info.id, ...(info.aliases ?? [])].map((name) => [name.toLowerCase(), info] as const),
  ),
);

export const codeLanguage = (lang: string) => byName.get(lang.toLowerCase());

let highlighter: Promise<HighlighterCore> | undefined;

const shiki = () =>
  (highlighter ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [glose],
        langs: [],
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      }),
  ));

export const highlightCode = async (
  code: string,
  lang: string,
): Promise<ReadonlyArray<CodeLine> | null> => {
  const info = codeLanguage(lang);
  if (info === undefined) return null;
  const core = await shiki();
  if (!core.getLoadedLanguages().includes(info.id)) await core.loadLanguage(info.import);
  let lineAt = 0;
  return core.codeToTokensBase(code, { lang: info.id, theme: "glose" }).map((line) => {
    const at = lineAt;
    lineAt += line.reduce((length, token) => length + token.content.length, 0) + 1;
    const tokens: Array<CodeToken> = [];
    for (const token of line) {
      const role = isRole(token.color) ? token.color : null;
      const last = tokens.at(-1);
      if (last?.role === role)
        tokens[tokens.length - 1] = { ...last, text: last.text + token.content };
      else tokens.push({ at: token.offset, text: token.content, role });
    }
    return { at, tokens };
  });
};

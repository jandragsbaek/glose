import { type CardText, hasAiCallout, parseWikilink } from "@glose/contracts";
import * as Option from "effect/Option";
import * as Yaml from "yaml";

import { FRONTMATTER } from "../vault/sourceFile.ts";

export interface CardFileContent extends CardText {
  readonly id: string | null;
  readonly from: string | null;
  readonly ai: boolean;
}

const SEPARATOR = /^[ \t]*---[ \t]*$/m;
const WIKILINK_VALUE = /^\s*\[\[([^[\]\n]+)\]\]\s*$/;

const YAML_OPTIONS = { flowCollectionPadding: false } as const;

const record = (value: unknown): Readonly<Record<string, unknown>> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const splitBody = (body: string): CardText => {
  const match = SEPARATOR.exec(body);
  if (match === null) return { question: body.trim(), answer: "" };
  return {
    question: body.slice(0, match.index).trim(),
    answer: body.slice(match.index + match[0].length).trim(),
  };
};

const parseDocument = (yaml: string) => {
  const document = Yaml.parseDocument(yaml);
  return document.errors.length > 0 ? null : document;
};

export const parseCardFile = (markdown: string): Option.Option<CardFileContent> => {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return Option.none();
  const data = record(parseDocument(match[1] ?? "")?.toJS());
  if (data === null || data.glose !== "card") return Option.none();
  const body = match[2] ?? "";
  const text = splitBody(body);
  if (text.question === "") return Option.none();
  const link = typeof data.from === "string" ? WIKILINK_VALUE.exec(data.from) : null;
  const from = link === null ? "" : parseWikilink(link[1] ?? "").target;
  const id = typeof data.id === "string" && data.id.trim() !== "" ? data.id.trim() : null;
  return Option.some({
    ...text,
    id,
    from: from === "" ? null : from,
    ai: data.ai === true || hasAiCallout(body),
  });
};

const renderBody = ({ question, answer }: CardText) =>
  answer === "" ? `\n${question}\n` : `\n${question}\n\n---\n\n${answer}\n`;

export const renderCardFile = (card: CardFileContent, today: string): string => {
  const frontmatter = new Yaml.Document({
    glose: "card",
    ...(card.id === null ? {} : { id: card.id }),
    ...(card.from === null ? {} : { from: `[[${card.from}]]` }),
    created: today,
    updated: today,
    ...(card.ai ? { ai: true } : {}),
  });
  return `---\n${frontmatter.toString(YAML_OPTIONS)}---\n${renderBody(card)}`;
};

export const editCardFile = (
  markdown: string,
  change: {
    readonly text?: CardText;
    readonly id?: string;
    readonly clearAiMark?: boolean;
    readonly today: string;
  },
): Option.Option<string> => {
  const match = FRONTMATTER.exec(markdown);
  if (!match || Option.isNone(parseCardFile(markdown))) return Option.none();
  const document = parseDocument(match[1] ?? "");
  if (document === null) return Option.none();
  if (change.id !== undefined) document.set("id", change.id);
  if (change.clearAiMark === true) document.delete("ai");
  document.set("updated", change.today);
  const body = change.text === undefined ? (match[2] ?? "") : renderBody(change.text);
  return Option.some(`---\n${document.toString(YAML_OPTIONS)}---\n${body}`);
};

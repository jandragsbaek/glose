import {
  localDay,
  type NoteProperty,
  type PropertyKind,
  type PropertyValue,
  propertyKind,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Yaml from "yaml";

import { writeFileAtomic } from "../storage.ts";

import { FRONTMATTER } from "./sourceFile.ts";

const fieldsOf = (markdown: string | null) => {
  if (markdown === null) return null;
  const match = FRONTMATTER.exec(markdown.replace(/\r\n?/g, "\n"));
  if (!match) return null;
  const document = Yaml.parseDocument(match[1] ?? "");
  return document.errors.length === 0 && Yaml.isMap(document.contents) ? document.contents : null;
};

const keyOf = (pair: Yaml.Pair): unknown => (Yaml.isScalar(pair.key) ? pair.key.value : pair.key);

export interface Stamps {
  readonly today: string;
  readonly created: boolean;
}

export const keepOtherFields = (
  previous: string | null,
  rendered: string,
  owned: ReadonlySet<string>,
  { today, created }: Stamps,
): string => {
  const match = FRONTMATTER.exec(rendered);
  if (!match) return rendered;
  const document = Yaml.parseDocument(match[1] ?? "");
  const before = fieldsOf(previous);
  if (created) {
    const kept = before?.get("created", true);
    if (kept !== undefined) document.set("created", kept);
    else if (previous === null) document.set("created", today);
  }
  document.set("updated", today);
  for (const pair of before?.items ?? []) {
    const key = keyOf(pair);
    if (typeof key !== "string" || owned.has(key) || document.has(key)) continue;
    document.set(key, pair.value);
  }
  return `---\n${document.toString()}---\n${match[2] ?? ""}`;
};

export const writeKeepingFields = Effect.fn("writeKeepingFields")(function* (
  fs: FileSystem.FileSystem,
  file: string,
  rendered: string,
  owned: ReadonlySet<string>,
  created: boolean,
  from: string = file,
) {
  const previous = (yield* fs.exists(from)) ? yield* fs.readFileString(from) : null;
  const today = localDay(yield* Clock.currentTimeMillis);
  yield* writeFileAtomic(fs, file, keepOtherFields(previous, rendered, owned, { today, created }));
});

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const asValue = (value: unknown, kind: PropertyKind): PropertyValue => {
  if (kind === "list") return value as ReadonlyArray<string>;
  if (kind === "number" || kind === "checkbox") return value as number | boolean;
  return asText(value);
};

export const propertiesOf = (
  frontmatter: unknown,
  locked: ReadonlySet<string>,
): ReadonlyArray<NoteProperty> =>
  typeof frontmatter === "object" && frontmatter !== null && !Array.isArray(frontmatter)
    ? Object.entries(frontmatter).map(([key, value]) => {
        const kind = propertyKind(value);
        return { key, kind, value: asValue(value, kind), locked: locked.has(key) };
      })
    : [];

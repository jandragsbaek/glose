import type { GraphView, Source } from "@glose/contracts";

import { callNumber, type MissingDetail, missingDetails } from "./source.ts";

export interface SourceRecord {
  readonly source: Source;
  readonly call: string;
  readonly notes: number;
  readonly located: number;
  readonly linked: ReadonlyMap<string, number>;
  readonly missing: ReadonlyArray<MissingDetail>;
}

export const sourceRecords = (
  sources: ReadonlyArray<Source>,
  graph: GraphView,
): ReadonlyArray<SourceRecord> => {
  const known = new Set(sources.map((source) => source.id));
  const owner = new Map<string, string>();
  const notes = new Map<string, number>();
  const located = new Map<string, number>();
  for (const node of graph.nodes) {
    const sourceId = node.kind === "source" ? node.id : node.sourceId;
    if (sourceId === null || !known.has(sourceId)) continue;
    owner.set(node.id, sourceId);
    if (node.kind === "note") {
      notes.set(sourceId, (notes.get(sourceId) ?? 0) + 1);
      if (node.page !== null) located.set(sourceId, (located.get(sourceId) ?? 0) + 1);
    }
  }
  const linked = new Map<string, Map<string, number>>();
  const count = (from: string, to: string) => {
    const counts = linked.get(from) ?? new Map<string, number>();
    counts.set(to, (counts.get(to) ?? 0) + 1);
    linked.set(from, counts);
  };
  for (const link of graph.links) {
    const from = owner.get(link.from);
    const to = owner.get(link.to);
    if (from === undefined || to === undefined || from === to) continue;
    count(from, to);
    count(to, from);
  }
  return sources.map((source) => ({
    source,
    call: callNumber(source),
    notes: notes.get(source.id) ?? 0,
    located: located.get(source.id) ?? 0,
    linked: linked.get(source.id) ?? new Map<string, number>(),
    missing: missingDetails(source),
  }));
};

export type RegisterOrder = "added" | "call" | "author";
export type ReadingFilter = "all" | "in-progress" | "done";
export type CitationFilter = "all" | "ready" | "missing";

export interface RegisterQuery {
  readonly text: string;
  readonly reading: ReadingFilter;
  readonly citation: CitationFilter;
}

const matchesText = (record: SourceRecord, needle: string, locale: string) => {
  if (needle === "") return true;
  const { source } = record;
  return [
    source.title,
    [source.givenName, source.familyName].filter(Boolean).join(" "),
    source.publisher,
    source.translator,
    record.call,
  ].some((text) => text !== null && text.toLocaleLowerCase(locale).includes(needle));
};

export const filterRecords = (
  records: ReadonlyArray<SourceRecord>,
  query: RegisterQuery,
  locale: string,
): ReadonlyArray<SourceRecord> => {
  const needle = query.text.trim().toLocaleLowerCase(locale);
  return records.filter(
    (record) =>
      (query.reading === "all" ||
        (query.reading === "done") === (record.source.readingStep === "done")) &&
      (query.citation === "all" || (query.citation === "missing") === record.missing.length > 0) &&
      matchesText(record, needle, locale),
  );
};

export type RegisterGroupKey =
  | { readonly kind: "month"; readonly year: number; readonly month: number }
  | { readonly kind: "letter"; readonly letter: string };

export interface RegisterGroup {
  readonly id: string;
  readonly key: RegisterGroupKey;
  readonly records: ReadonlyArray<SourceRecord>;
}

const groupKey = (record: SourceRecord, order: RegisterOrder): RegisterGroupKey => {
  if (order === "added") {
    const added = new Date(record.source.added);
    return { kind: "month", year: added.getFullYear(), month: added.getMonth() };
  }
  const name = order === "call" ? record.call : record.source.familyName;
  return { kind: "letter", letter: (Array.from(name)[0] ?? "").toLocaleUpperCase() };
};

const keyId = (key: RegisterGroupKey) =>
  key.kind === "month" ? `${key.year}-${key.month}` : key.letter;

export const groupRecords = (
  records: ReadonlyArray<SourceRecord>,
  order: RegisterOrder,
  locale: string,
): ReadonlyArray<RegisterGroup> => {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const byName = (a: SourceRecord, b: SourceRecord) =>
    collator.compare(a.source.familyName, b.source.familyName) ||
    collator.compare(a.source.givenName ?? "", b.source.givenName ?? "") ||
    (a.source.firstPublished ?? 0) - (b.source.firstPublished ?? 0) ||
    collator.compare(a.source.title, b.source.title);
  const sorted = records.toSorted((a, b) => {
    if (order === "added") return b.source.added - a.source.added || byName(a, b);
    if (order === "call") return collator.compare(a.call, b.call) || byName(a, b);
    return byName(a, b);
  });
  const groups: Array<{ id: string; key: RegisterGroupKey; records: Array<SourceRecord> }> = [];
  for (const record of sorted) {
    const key = groupKey(record, order);
    const id = keyId(key);
    const last = groups.at(-1);
    if (last?.id === id) last.records.push(record);
    else groups.push({ id, key, records: [record] });
  }
  return groups;
};

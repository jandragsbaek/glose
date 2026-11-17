import type { Source } from "@glose/contracts";

export const MISSING_YEAR = "?";

export type CallNumbered = Pick<Source, "familyName" | "firstPublished"> & {
  readonly kind?: Source["kind"];
  readonly part?: string | null;
};

export const callNumber = (source: CallNumbered): string => {
  const letters = Array.from(source.familyName.replace(/[^\p{L}]/gu, ""))
    .slice(0, 3)
    .join("");
  const base = `${letters.toLocaleUpperCase()} ${source.firstPublished ?? MISSING_YEAR}`;
  return source.kind === "lesson" && source.part != null ? `${base} ${source.part}` : base;
};

export type MissingDetail = "firstPublished" | "publisher" | "container";

export const missingDetails = (source: Source): ReadonlyArray<MissingDetail> => [
  ...(source.firstPublished === null ? (["firstPublished"] as const) : []),
  ...(source.kind === "book"
    ? source.publisher === null
      ? (["publisher"] as const)
      : []
    : source.container === null
      ? (["container"] as const)
      : []),
];

export const wordCount = (text: string): number =>
  text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

export const asksWhereToStart = (source: Source): boolean =>
  source.kind === "book" &&
  source.readingStart === null &&
  source.readingStep === "free-text" &&
  source.freeText.trim() === "";

const started = (source: Source) =>
  source.readingStep !== "read" || source.readingPlace !== null || source.freeText.trim() !== "";

const byPart = (a: Source, b: Source) =>
  (a.part ?? "").localeCompare(b.part ?? "", undefined, { numeric: true });

export const onDesk = <A>(items: ReadonlyArray<A>, sourceOf: (item: A) => Source): A[] => {
  const open = items.filter((item) => sourceOf(item).readingStep !== "done");
  const courses = new Map<string, A[]>();
  for (const item of open) {
    const source = sourceOf(item);
    if (source.kind !== "lesson") continue;
    const key = (source.container ?? "").toLocaleLowerCase("und");
    courses.set(key, [...(courses.get(key) ?? []), item]);
  }
  const shown = new Set<A>();
  for (const lessons of courses.values()) {
    const sorted = [...lessons].sort((a, b) => byPart(sourceOf(a), sourceOf(b)));
    for (const item of sorted) if (started(sourceOf(item))) shown.add(item);
    const next = sorted.find((item) => !started(sourceOf(item)));
    if (next !== undefined) shown.add(next);
  }
  const placed = new Set<string>();
  return open.flatMap((item) => {
    const source = sourceOf(item);
    if (source.kind !== "lesson") return [item];
    const key = (source.container ?? "").toLocaleLowerCase("und");
    if (placed.has(key)) return [];
    placed.add(key);
    return [...(courses.get(key) ?? [])]
      .filter((lesson) => shown.has(lesson))
      .sort((a, b) => byPart(sourceOf(a), sourceOf(b)));
  });
};

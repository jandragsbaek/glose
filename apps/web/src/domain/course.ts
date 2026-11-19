import type { Source } from "@glose/contracts";

export const DAYS_A_WEEK = 5;

export interface Course {
  readonly key: string;
  readonly name: string;
  readonly familyName: string;
  readonly givenName: string | null;
  readonly firstPublished: number | null;
  readonly url: string | null;
  readonly lessons: ReadonlyArray<Source>;
}

export interface Slot {
  readonly part: string;
  readonly week: number;
  readonly day: number;
  readonly lesson: Source | null;
}

export interface Week {
  readonly week: number;
  readonly slots: ReadonlyArray<Slot>;
}

export interface Shelf {
  readonly weeks: ReadonlyArray<Week>;
  readonly next: string;
  readonly unplaced: ReadonlyArray<Source>;
}

export const courseKey = (name: string): string => name.trim().toLocaleLowerCase("und");

export const weekDay = (
  part: string | null,
): { readonly week: number; readonly day: number } | null => {
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(part ?? "");
  if (match === null) return null;
  const week = Number(match[1]);
  const day = Number(match[2]);
  return week > 0 && day > 0 ? { week, day } : null;
};

const byPart = (a: Source, b: Source) =>
  (a.part ?? "").localeCompare(b.part ?? "", undefined, { numeric: true });

export const coursesOf = (sources: ReadonlyArray<Source>): ReadonlyArray<Course> => {
  const groups = new Map<string, Source[]>();
  for (const source of sources) {
    if (source.kind !== "lesson" || source.container === null) continue;
    const key = courseKey(source.container);
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  return [...groups.entries()]
    .map(([key, lessons]): Course => {
      const sorted = [...lessons].sort(byPart);
      const first = sorted[0]!;
      return {
        key,
        name: first.container ?? "",
        familyName: first.familyName,
        givenName: first.givenName,
        firstPublished: first.firstPublished,
        url: sorted.find((lesson) => lesson.url !== null)?.url ?? null,
        lessons: sorted,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const courseNamed = (sources: ReadonlyArray<Source>, name: string): Course | undefined =>
  coursesOf(sources).find((course) => course.key === courseKey(name));

export const shelfOf = (lessons: ReadonlyArray<Source>): Shelf => {
  const placed = new Map<string, Source>();
  const unplaced: Source[] = [];
  for (const lesson of [...lessons].sort(byPart)) {
    const at = weekDay(lesson.part);
    const part = at === null ? null : `${at.week}.${at.day}`;
    if (part === null || placed.has(part)) unplaced.push(lesson);
    else placed.set(part, lesson);
  }
  const spots = [...placed.keys()].map((part) => weekDay(part)!);
  const perWeek = Math.max(DAYS_A_WEEK, ...spots.map((spot) => spot.day));
  const last = spots.reduce<{ week: number; day: number } | null>(
    (latest, spot) =>
      latest === null ||
      spot.week > latest.week ||
      (spot.week === latest.week && spot.day > latest.day)
        ? spot
        : latest,
    null,
  );
  const next =
    last === null
      ? { week: 1, day: 1 }
      : last.day < perWeek
        ? { week: last.week, day: last.day + 1 }
        : { week: last.week + 1, day: 1 };
  const weekCount = Math.max(next.week, ...spots.map((spot) => spot.week));
  const weeks = Array.from({ length: weekCount }, (_, index): Week => {
    const week = index + 1;
    return {
      week,
      slots: Array.from({ length: perWeek }, (_, dayIndex): Slot => {
        const day = dayIndex + 1;
        const part = `${week}.${day}`;
        return { part, week, day, lesson: placed.get(part) ?? null };
      }),
    };
  });
  return { weeks, next: `${next.week}.${next.day}`, unplaced };
};

export const slotAfter = (shelf: Shelf, part: string): string | null => {
  const slots = shelf.weeks.flatMap((week) => week.slots);
  const index = slots.findIndex((slot) => slot.part === part);
  const after =
    index === -1 ? undefined : slots.slice(index + 1).find((slot) => slot.lesson === null);
  if (after !== undefined) return after.part;
  const at = weekDay(part);
  if (at === null) return null;
  const perWeek = shelf.weeks[0]?.slots.length ?? DAYS_A_WEEK;
  return at.day < perWeek ? `${at.week}.${at.day + 1}` : `${at.week + 1}.1`;
};

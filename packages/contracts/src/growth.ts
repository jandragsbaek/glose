import * as Schema from "effect/Schema";

export const GROWTHS = ["seed", "sprout", "sapling", "tree"] as const;

export const Growth = Schema.Literals(GROWTHS);
export type Growth = typeof Growth.Type;

export const SAPLING_LINKS = 3;

export interface GrowthEvidence {
  readonly aiText: boolean;
  readonly linkedNotes: number;
  readonly tended: string | null;
}

export const earnedGrowth = ({ aiText, linkedNotes, tended }: GrowthEvidence): Growth => {
  if (aiText) return "seed";
  if (linkedNotes < SAPLING_LINKS) return "sprout";
  return tended === null ? "sapling" : "tree";
};

export const nextGrowth = (growth: Growth, evidence: GrowthEvidence): Growth | null => {
  const earned = earnedGrowth(evidence);
  return GROWTHS.indexOf(earned) > GROWTHS.indexOf(growth) ? earned : null;
};

export const growthOf = (value: unknown): Growth =>
  GROWTHS.find((growth) => growth === value) ?? "seed";

const twoDigits = (value: number) => String(value).padStart(2, "0");

export const localDay = (time: number): string => {
  const date = new Date(time);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
};

const DAY = /^(\d{4}-\d{2}-\d{2})(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export const dayOf = (value: unknown): string | null => {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : localDay(value.getTime());
  if (typeof value !== "string") return null;
  return DAY.exec(value.trim())?.[1] ?? null;
};

export const NoteProperty = Schema.Struct({ key: Schema.String, value: Schema.String });
export type NoteProperty = typeof NoteProperty.Type;

export const TendNote = Schema.Struct({ id: Schema.String });
export type TendNote = typeof TendNote.Type;

export const GrowNote = Schema.Struct({ id: Schema.String, growth: Growth });
export type GrowNote = typeof GrowNote.Type;

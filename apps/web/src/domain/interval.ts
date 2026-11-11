export type IntervalUnit = "minute" | "hour" | "day" | "month" | "year";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * The time until a Card comes back, in the largest unit that keeps it readable, as Anki shows it
 * on its rating buttons: whole minutes and days, tenths of hours, months and years.
 */
export const intervalOf = (ms: number): { readonly value: number; readonly unit: IntervalUnit } => {
  const tenths = (value: number) => Math.round(value * 10) / 10;
  if (ms < HOUR) return { value: Math.max(1, Math.round(ms / MINUTE)), unit: "minute" };
  if (ms < DAY) return { value: tenths(ms / HOUR), unit: "hour" };
  if (ms < MONTH) return { value: Math.round(ms / DAY), unit: "day" };
  if (ms < YEAR) return { value: tenths(ms / MONTH), unit: "month" };
  return { value: tenths(ms / YEAR), unit: "year" };
};

/** "10 min", "8 days", "1.5 mths" in English; "10 min.", "8 dage", "1,5 md." in Danish. */
export const formatInterval = (locale: string, ms: number): string => {
  const { value, unit } = intervalOf(ms);
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
};

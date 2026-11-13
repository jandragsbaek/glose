/** A nightly's version: `<base>-nightly.<yyyymmdd>.<run>`, as the Release workflow names it. */
const NIGHTLY = /-nightly\.(\d{4})(\d{2})(\d{2})\.(\d+)$/;

/** The day a nightly was built (local midnight of that UTC date) and its run, or null. */
export const nightlyOf = (
  version: string,
): { readonly built: Date; readonly run: number } | null => {
  const match = NIGHTLY.exec(version);
  if (match === null) return null;
  const [, year, month, day, run] = match;
  return { built: new Date(Number(year), Number(month) - 1, Number(day)), run: Number(run) };
};

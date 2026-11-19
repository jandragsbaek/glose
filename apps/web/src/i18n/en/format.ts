export const numbers = new Intl.NumberFormat("en");
const plurals = new Intl.PluralRules("en");
export const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
export const list = new Intl.ListFormat("en", { type: "conjunction" });
export const clockTime = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });
export const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
export const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
export const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
export const dayDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

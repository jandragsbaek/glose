export const numbers = new Intl.NumberFormat("da");
const plurals = new Intl.PluralRules("da");
export const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
export const list = new Intl.ListFormat("da", { type: "conjunction" });
export const clockTime = new Intl.DateTimeFormat("da-DK", { timeStyle: "short" });
export const shortDate = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short" });
export const monthYear = new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" });
export const capitalised = (text: string) => text.charAt(0).toLocaleUpperCase("da") + text.slice(1);
export const longDate = new Intl.DateTimeFormat("da-DK", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

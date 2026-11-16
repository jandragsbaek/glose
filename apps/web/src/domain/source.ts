import type { Source } from "@glose/contracts";

export const MISSING_YEAR = "?";

export const callNumber = (source: Pick<Source, "familyName" | "firstPublished">): string => {
  const letters = Array.from(source.familyName.replace(/[^\p{L}]/gu, ""))
    .slice(0, 3)
    .join("");
  return `${letters.toLocaleUpperCase()} ${source.firstPublished ?? MISSING_YEAR}`;
};

export type MissingDetail = "firstPublished" | "publisher";

export const missingDetails = (source: Source): ReadonlyArray<MissingDetail> => [
  ...(source.firstPublished === null ? (["firstPublished"] as const) : []),
  ...(source.publisher === null ? (["publisher"] as const) : []),
];

export const wordCount = (text: string): number =>
  text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

export const asksWhereToStart = (source: Source): boolean =>
  source.readingStart === null &&
  source.readingStep === "free-text" &&
  source.freeText.trim() === "";

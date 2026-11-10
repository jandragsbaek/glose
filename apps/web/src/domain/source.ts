import type { Source } from "@glose/contracts";

/** Year placeholder in a call number whose Source lacks its first-publication year. */
export const MISSING_YEAR = "?";

/**
 * The call number of a Source, as on a library spine label: the first three letters of the
 * author's family name and the year of first publication, e.g. "ARE 1958".
 */
export const callNumber = (source: Pick<Source, "familyName" | "firstPublished">): string => {
  const letters = Array.from(source.familyName.replace(/[^\p{L}]/gu, ""))
    .slice(0, 3)
    .join("");
  return `${letters.toLocaleUpperCase()} ${source.firstPublished ?? MISSING_YEAR}`;
};

export type MissingDetail = "firstPublished" | "publisher";

/** Data a Citation needs that this Source does not have yet. */
export const missingDetails = (source: Source): ReadonlyArray<MissingDetail> => [
  ...(source.firstPublished === null ? (["firstPublished"] as const) : []),
  ...(source.publisher === null ? (["publisher"] as const) : []),
];

export const wordCount = (text: string): number =>
  text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

import { findStamps, type Stamp, youtubeId } from "@glose/contracts";

import { wordCount } from "./source.ts";

export interface Cue {
  readonly seconds: number;
  readonly label: string;
  readonly words: string;
  readonly at: number;
}

const MARKDOWN_MARKS = /[*_`#>]+/g;
const WIKILINK = /!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

export const withoutStamps = (notes: string, videoId: string | null): string => {
  let out = "";
  let at = 0;
  for (const stamp of findStamps(notes, videoId)) {
    out += `${notes.slice(at, stamp.start)} `;
    at = stamp.end;
  }
  return out + notes.slice(at);
};

export const notesWordCount = (notes: string, videoId: string | null): number =>
  wordCount(withoutStamps(notes, videoId));

const wordsAfter = (notes: string, stamp: Stamp, next: Stamp | undefined) => {
  const start = stamp.end + (/^\s*/.exec(notes.slice(stamp.end))?.[0].length ?? 0);
  const blank = /\n[ \t]*\n/.exec(notes.slice(start));
  const end = Math.min(
    blank === null ? notes.length : start + blank.index,
    next === undefined ? notes.length : next.start,
  );
  return notes
    .slice(Math.min(start, end), end)
    .replace(WIKILINK, (_, name: string, shown?: string) => shown ?? name)
    .replace(LINK, "$1")
    .replace(MARKDOWN_MARKS, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const cuesOf = (notes: string, videoId: string | null): ReadonlyArray<Cue> => {
  const stamps = findStamps(notes, videoId);
  return stamps
    .map((stamp, index) => ({
      seconds: stamp.seconds,
      label: stamp.label,
      words: wordsAfter(notes, stamp, stamps[index + 1]),
      at: stamp.start,
    }))
    .sort((a, b) => a.seconds - b.seconds || a.at - b.at);
};

export const cueAt = (cues: ReadonlyArray<Cue>, seconds: number): Cue | null =>
  cues.findLast((cue) => cue.seconds <= seconds + 0.5) ?? null;

export const videoIdOf = (url: string | null): string | null =>
  url === null ? null : youtubeId(url);

export const youtubeAt = (id: string, seconds = 0): string =>
  seconds > 0
    ? `https://www.youtube.com/watch?v=${id}&t=${Math.floor(seconds)}s`
    : `https://www.youtube.com/watch?v=${id}`;

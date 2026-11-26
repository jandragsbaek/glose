export interface OverviewLine {
  readonly top: number;
  readonly height: number;
  readonly text: string;
}

export interface OverviewRow {
  readonly kind: "title" | "h2" | "h3" | "p";
  readonly top: number;
  readonly height: number;
  readonly length: number;
  readonly text: string;
}

export interface OverviewPicture {
  readonly rows: ReadonlyArray<OverviewRow>;
  readonly references: ReadonlyArray<number>;
}

import { headingOf } from "../domain/writing.ts";

const REFERENCE_AS_NUMBER = "\u0001\u0001";
const REFERENCE_TOKEN = /\s?\[\[[^\]\n]*\]\](?:\{[^}\n]*\})?/g;
const HEADING_SIZE_OVER_TEXT = { h2: 22 / 16, h3: 18 / 16 } as const;

const kindOf = (line: string): "h2" | "h3" | "p" | null => {
  if (line.trim() === "") return null;
  const heading = headingOf(line);
  if (heading === null) return "p";
  return heading.level <= 2 ? "h2" : "h3";
};

const shownText = (line: string) =>
  line
    .slice(headingOf(line)?.marker ?? 0)
    .replace(REFERENCE_TOKEN, REFERENCE_AS_NUMBER)
    .replace(/\*+/g, "");

const wrapRows = (text: string, columns: number): ReadonlyArray<readonly [number, number]> => {
  const width = Math.max(1, Math.floor(columns));
  const rows: Array<readonly [number, number]> = [];
  let start = -1;
  let end = -1;
  for (const word of text.matchAll(/\S+/g)) {
    let from = word.index;
    const to = from + word[0].length;
    if (start >= 0 && to - start <= width) {
      end = to;
      continue;
    }
    if (start >= 0) rows.push([start, end]);
    while (to - from > width) {
      rows.push([from, from + width]);
      from += width;
    }
    start = from;
    end = to;
  }
  if (start >= 0) rows.push([start, end]);
  return rows;
};

const MOST_WIDTH_TRIES = 40;

const evenRows = (text: string, count: number): ReadonlyArray<readonly [number, number]> =>
  Array.from({ length: count }, (_, index) => [
    Math.round((index * text.length) / count),
    Math.round(((index + 1) * text.length) / count),
  ]);

const fitRows = (text: string, columns: number, count: number) => {
  let width = Math.max(1, Math.floor(columns));
  let rows = wrapRows(text, width);
  for (let tries = 0; rows.length !== count && tries < MOST_WIDTH_TRIES; tries++) {
    const next = width + (rows.length > count ? 1 : -1);
    if (next < 1) break;
    const fitted = wrapRows(text, next);
    if (rows.length > count !== fitted.length > count && fitted.length !== count) break;
    width = next;
    rows = fitted;
  }
  return rows.length === count ? rows : evenRows(text, count);
};

export const overviewPicture = (
  lines: ReadonlyArray<OverviewLine>,
  columns: number,
  lineHeight: number,
): OverviewPicture => {
  const rows: Array<OverviewRow> = [];
  const references: Array<number> = [];
  for (const line of lines) {
    const kind = kindOf(line.text);
    if (kind === null) continue;
    const text = shownText(line.text);
    if (kind !== "p") {
      const scale = HEADING_SIZE_OVER_TEXT[kind];
      const height = Math.min(line.height, lineHeight * scale);
      rows.push({
        kind,
        top: line.top + line.height - height,
        height,
        length: Math.min(1, (text.length * scale) / columns),
        text,
      });
      continue;
    }
    const wrapped = fitRows(text, columns, Math.max(1, Math.round(line.height / lineHeight)));
    const height = line.height / Math.max(1, wrapped.length);
    wrapped.forEach(([from, to], index) => {
      const top = line.top + index * height;
      rows.push({ kind, top, height, length: Math.min(1, (to - from) / columns), text });
      for (let at = text.indexOf(REFERENCE_AS_NUMBER, from); at >= 0 && at < to;) {
        references.push(top + height / 2);
        at = text.indexOf(REFERENCE_AS_NUMBER, at + REFERENCE_AS_NUMBER.length);
      }
    });
  }
  return { rows, references };
};

export interface OverviewView {
  readonly offset: number;
  readonly viewY: number;
  readonly viewHeight: number;
  readonly boxPerScrolledPixel: number;
}

export const overviewView = ({
  pictureHeight,
  stripHeight,
  scale,
  scrollTop,
  scrollMax,
  viewTop,
  viewHeight,
}: {
  readonly pictureHeight: number;
  readonly stripHeight: number;
  readonly scale: number;
  readonly scrollTop: number;
  readonly scrollMax: number;
  readonly viewTop: number;
  readonly viewHeight: number;
}): OverviewView => {
  const overflow = Math.max(0, pictureHeight - stripHeight);
  const share = scrollMax > 0 ? Math.min(1, Math.max(0, scrollTop / scrollMax)) : 0;
  const offset = overflow * share;
  const travel = scale - (scrollMax > 0 ? overflow / scrollMax : 0);
  return {
    offset,
    viewY: viewTop * scale - offset,
    viewHeight: viewHeight * scale,
    boxPerScrolledPixel: travel > 0 ? travel : scale,
  };
};

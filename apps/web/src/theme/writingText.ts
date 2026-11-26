import { useSyncExternalStore } from "react";

export const FACES = ["plain", "book", "typewriter"] as const;
export type Face = (typeof FACES)[number];

export const SIZES = [15, 16, 18, 20, 22] as const;
export type Size = (typeof SIZES)[number];

export const WIDTHS = ["narrow", "standard", "wide"] as const;
export type Width = (typeof WIDTHS)[number];

export interface WritingText {
  readonly face: Face;
  readonly size: Size;
  readonly width: Width;
  readonly overview: boolean;
}

type TextShape = Pick<WritingText, "face" | "size" | "width">;

export const DEFAULT_TEXT: WritingText = {
  face: "plain",
  size: 16,
  width: "standard",
  overview: false,
};

const KEY = "glose:writing-text";

const MEASURE_EM: Record<Width, number> = { narrow: 31, standard: 35.5, wide: 42 };

const CHARACTER_EM: Record<Face, number> = { plain: 0.5, book: 0.46, typewriter: 0.6 };

export const LEAF_PADDING = 112;

export const LEAF_FOLDED_PADDING = 64;

export type Fold = "none" | "left" | "both";

const BOTH_MARGINS = 424;
const GLOSSES_ONLY = 184;

export const foldOf = (desk: number, leaf: number): Fold =>
  desk >= leaf + BOTH_MARGINS ? "none" : desk >= leaf + GLOSSES_ONLY ? "left" : "both";

const OVERVIEW_ROOM = 70;

const LEAST_MARGIN_TRACKS = 180 + 200 + 16 + 16;

export const overviewFits = (desk: number, leaf: number) =>
  foldOf(desk, leaf) === "none" && desk >= leaf + LEAST_MARGIN_TRACKS + OVERVIEW_ROOM;

export const measureOf = (text: TextShape) => Math.round(text.size * MEASURE_EM[text.width]);

export const leafWidthOf = (text: TextShape) => measureOf(text) + LEAF_PADDING;

export const charactersOf = (text: TextShape) =>
  Math.round(MEASURE_EM[text.width] / CHARACTER_EM[text.face] / 5) * 5;

const read = (): WritingText => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (typeof value !== "object" || value === null) return DEFAULT_TEXT;
    const field = <T>(name: string, allowed: ReadonlyArray<T>, fallback: T): T => {
      const found = allowed.find((option) => name in value && Reflect.get(value, name) === option);
      return found ?? fallback;
    };
    return {
      face: field("face", FACES, DEFAULT_TEXT.face),
      size: field("size", SIZES, DEFAULT_TEXT.size),
      width: field("width", WIDTHS, DEFAULT_TEXT.width),
      overview: field("overview", [true, false], DEFAULT_TEXT.overview),
    };
  } catch {
    return DEFAULT_TEXT;
  }
};

let current = read();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

window.addEventListener("storage", (event) => {
  if (event.key !== KEY) return;
  current = read();
  notify();
});

export function chooseWritingText(choice: Partial<WritingText>) {
  current = { ...current, ...choice };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => current;

export function useWritingText(): WritingText {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

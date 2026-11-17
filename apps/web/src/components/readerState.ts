import type { ArticlePassage, Point, Session, SessionEntry } from "@glose/contracts";

import type { useT } from "../i18n/I18n.tsx";
import type { PassageTone } from "./ArticleText.tsx";

export type Entry<T extends SessionEntry["_tag"]> = Extract<SessionEntry, { _tag: T }>;

export interface PassageState {
  readonly asked: ReadonlyArray<Entry<"ProbeQuestion">>;
  readonly understood: boolean;
  readonly focused: boolean;
  readonly point: Point | null;
}

export type States = ReadonlyMap<string, PassageState>;

export const passageKey = (passage: Pick<ArticlePassage, "n" | "at" | "text">) =>
  `${passage.n}:${passage.at}:${passage.text}`;

const sameWords = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

export const passageStates = (
  passages: ReadonlyArray<ArticlePassage>,
  probe: Session | null,
  points: ReadonlyArray<Point>,
): States => {
  const entries = probe?.entries ?? [];
  const alone = (n: number) => passages.filter((passage) => passage.n === n).length === 1;
  const owns = (passage: ArticlePassage, paragraph: number | undefined, text: string | undefined) =>
    paragraph === passage.n &&
    (text === undefined ? alone(passage.n) : sameWords(text, passage.text));
  const lastFocus = entries.findLast(
    (entry) => entry._tag === "ProbeFocus" || entry._tag === "ProbeFocusDone",
  );
  return new Map(
    passages.map((passage) => {
      const asked = entries.filter(
        (entry): entry is Entry<"ProbeQuestion"> =>
          entry._tag === "ProbeQuestion" && owns(passage, entry.paragraph, entry.passage),
      );
      const understood = entries.some(
        (entry) => entry._tag === "ProbeFocusDone" && owns(passage, entry.paragraph, entry.text),
      );
      const focused =
        lastFocus?._tag === "ProbeFocus" && owns(passage, lastFocus.paragraph, lastFocus.text);
      const point = points.find(
        (other) =>
          other.origin === "passage" &&
          other.page === `¶ ${passage.n}` &&
          other.quote !== null &&
          sameWords(other.quote, passage.text) &&
          other.state !== "dropped",
      );
      return [passage.id, { asked, understood, focused, point: point ?? null }] as const;
    }),
  );
};

export const toneOf = (passage: ArticlePassage, states: States): PassageTone => {
  const state = states.get(passage.id);
  if (state?.point != null) return "point";
  if ((state?.asked.length ?? 0) > 0) return "deeper";
  if (passage.words !== null) return "words";
  return "marked";
};

export const stateLine = (
  passage: ArticlePassage,
  states: States,
  t: ReturnType<typeof useT>,
): string => {
  const state = states.get(passage.id);
  if (state?.point != null) return t.reader.states.point;
  if (state?.understood === true) return t.reader.states.understood;
  const first = state?.asked[0];
  if (first !== undefined) return t.reader.states.deeper(first.number);
  if (state?.focused === true) return t.reader.states.deeperOpen;
  if (passage.words !== null) return t.reader.states.words;
  return t.reader.states.marked;
};

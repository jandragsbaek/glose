import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  type Article,
  type ArticlePassage,
  type ReadingStart,
  type Source,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { ARTICLE_KEYS, chooseStartAtom, KEYS, sourcesAtom } from "../state/vault.ts";
import { stateLine, type States } from "./readerState.ts";
import { Notice } from "./ui.tsx";

export function LessonNav({ source }: { readonly source: Source }) {
  const t = useT();
  const all = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => []);
  if (source.kind !== "lesson" || source.container === null) return null;
  const course = all
    .filter(
      (other) =>
        other.kind === "lesson" && other.container === source.container && other.part !== null,
    )
    .sort((a, b) => (a.part ?? "").localeCompare(b.part ?? "", undefined, { numeric: true }));
  const at = course.findIndex((other) => other.id === source.id);
  const previous = at > 0 ? course[at - 1] : undefined;
  const next = at >= 0 ? course[at + 1] : undefined;
  return (
    <nav className="lesson-nav" aria-label={source.container}>
      {previous === undefined || previous.part === null ? null : (
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: previous.id }}
          search={{}}
          className="button button--quiet"
          title={previous.title}
        >
          <ArrowLeft className="button__icon" aria-hidden="true" />
          <span className="sr-only">{t.reader.previousLesson}: </span>
          {t.lessonPart(previous.part)}
        </Link>
      )}
      {next === undefined || next.part === null ? null : (
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: next.id }}
          search={{}}
          className="button"
          title={next.title}
        >
          <span className="sr-only">{t.reader.nextLesson}: </span>
          {t.lessonPart(next.part)}
          <ArrowRight className="button__icon" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

const keepInView = (node: HTMLElement | null) =>
  node?.scrollIntoView({ block: "nearest", inline: "nearest" });

export function Contents({
  article,
  sections,
  top,
  title,
}: {
  readonly article: Article;
  readonly sections: Article["sections"];
  readonly top: number | null;
  readonly title: string;
}) {
  const t = useT();
  const headingId = useId();
  const currentSection =
    top === null
      ? -1
      : sections.findLastIndex((section) => section.first !== null && section.first <= top);
  const minutes = Math.max(1, Math.round(article.words / 230));
  const countIn = (first: number | null, last: number | null) =>
    first === null || last === null
      ? 0
      : article.passages.filter((passage) => passage.n >= first && passage.n <= last).length;
  return (
    <nav className="reader__contents" aria-labelledby={headingId}>
      <h2 className="contents__title" id={headingId}>
        {t.reader.contents}
      </h2>
      {sections.length === 0 ? null : (
        <ol className="contents__list">
          {sections.map((section, index) => {
            const here = index === currentSection;
            const passages = countIn(section.first, section.last);
            return (
              <li key={`${section.first ?? "none"}-${section.title}`} data-level={section.level}>
                <a
                  className="contents__item"
                  href={`#s-${article.sections.indexOf(section)}`}
                  aria-current={here ? "location" : undefined}
                  ref={here ? keepInView : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .getElementById(`s-${article.sections.indexOf(section)}`)
                      ?.scrollIntoView({ block: "start", behavior: "smooth" });
                  }}
                >
                  <span className="contents__name">
                    {section.title.trim().toLowerCase() === title.trim().toLowerCase()
                      ? t.reader.opening
                      : section.title}
                  </span>
                  {passages === 0 ? null : (
                    <span className="contents__count">{t.reader.sectionPassages(passages)}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      )}
      <p className="contents__foot">
        {t.reader.contentsCount(article.units.length, article.words)}
        <br />
        {t.reader.minutes(minutes)}
      </p>
    </nav>
  );
}

export function Apparatus({
  passages,
  states,
  current,
  onOpen,
}: {
  readonly passages: ReadonlyArray<ArticlePassage>;
  readonly states: States;
  readonly current: string | null;
  readonly onOpen: (id: string) => void;
}) {
  const t = useT();
  const headingId = useId();
  const [all, setAll] = useState(false);
  if (passages.length === 0) return null;
  const shown = all ? passages : passages.slice(0, 3);
  return (
    <section className="apparatus" aria-labelledby={headingId}>
      <h2 className="apparatus__title" id={headingId}>
        {t.reader.apparatus}
      </h2>
      <ol className="apparatus__rows">
        {shown.map((passage) => (
          <li
            key={passage.id}
            className="apparatus__row"
            data-current={passage.id === current ? "" : undefined}
          >
            <span className="apparatus__n">{t.reader.paragraph(passage.n)}</span>
            <q className="apparatus__quote">{passage.text}</q>
            <span className="apparatus__state">{stateLine(passage, states, t)}</span>
            <button
              type="button"
              className="button button--small"
              aria-pressed={passage.id === current}
              onClick={() => onOpen(passage.id)}
            >
              {t.reader.open}
              <span className="sr-only"> {t.reader.paragraph(passage.n)}</span>
            </button>
          </li>
        ))}
      </ol>
      {passages.length > 3 ? (
        <button
          type="button"
          className="link-button apparatus__more"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? t.reader.apparatusFewer : t.reader.apparatusMore(passages.length - 3)}
        </button>
      ) : null}
    </section>
  );
}

const STARTS = ["write", "probe"] as const satisfies ReadonlyArray<ReadingStart>;

export function DoneReading({
  source,
  passages,
  deeper,
  points,
}: {
  readonly source: Source;
  readonly passages: number;
  readonly deeper: number;
  readonly points: number;
}) {
  const t = useT();
  const [start, setStart] = useState<(typeof STARTS)[number]>("write");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const choose = useAtomSet(chooseStartAtom, { mode: "promiseExit" });
  const legendId = useId();
  const go = async () => {
    setState("saving");
    const exit = await choose({
      payload: { id: source.id, start },
      reactivityKeys: [...KEYS.sources, ...ARTICLE_KEYS.articles],
    });
    setState(Exit.isSuccess(exit) ? "idle" : "failed");
  };
  return (
    <section className="done-reading" aria-labelledby={legendId}>
      <div className="done-reading__head">
        <h2 className="done-reading__title" id={legendId}>
          {t.reader.end.title}
        </h2>
        <p className="done-reading__summary">{t.reader.end.summary(passages, deeper, points)}</p>
      </div>
      <fieldset className="done-reading__choices">
        <legend className="done-reading__q">{t.reader.end.question}</legend>
        {STARTS.map((option) => (
          <label key={option} className="choice start-choice">
            <input
              type="radio"
              name={`after-reading-${source.id}`}
              value={option}
              checked={start === option}
              onChange={() => setStart(option)}
            />
            <span className="start-choice__text">
              <span className="start-choice__label">{t.reader.end.choices[option]}</span>
              <span className="start-choice__hint">{t.reader.end.hints[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {state === "failed" ? (
        <Notice tone="error">
          <p>{t.reader.end.failed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          disabled={state === "saving"}
          onClick={() => void go()}
        >
          {t.reader.end.go[start]}
          <ArrowRight className="button__icon" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

import { referenceToken, type ResolvedReference, type WritingReview } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { Check, TriangleAlert } from "lucide-react";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

import { hugWord, insertionAfter } from "../domain/writing.ts";
import { useT } from "../i18n/I18n.tsx";
import type { ProseHandle } from "./ProseEditor.tsx";
import { CallNumber } from "./ui.tsx";

const MARGIN_GAP = 12;

const WIDE = "(min-width: 1200px)";

const GLOSSES_BESIDE = "(min-width: 960px)";

export function useMarginPlacement(editor: RefObject<ProseHandle | null>, mode: "write" | "proof") {
  const leftMargin = useRef<HTMLDivElement | null>(null);
  const rightMargin = useRef<HTMLDivElement | null>(null);
  const editorBox = useRef<HTMLDivElement | null>(null);

  const placeMargins = () => {
    const box = editorBox.current;
    const handle = editor.current;
    if (box === null || handle === null) return;
    for (const [margin, query] of [
      [leftMargin.current, WIDE],
      [rightMargin.current, GLOSSES_BESIDE],
    ] as const) {
      if (margin === null) continue;
      const wide = window.matchMedia(query).matches && mode === "write";
      const items = Array.from(margin.querySelectorAll<HTMLElement>("[data-pos]"));
      if (!wide) {
        for (const item of items) item.style.top = "";
        margin.style.minHeight = "";
        continue;
      }
      const offset = box.getBoundingClientRect().top - margin.getBoundingClientRect().top;
      let floor = 0;
      const placed = items
        .map((item) => ({ item, top: (handle.topOf(Number(item.dataset.pos)) ?? 0) + offset }))
        .sort((a, b) => a.top - b.top);
      for (const { item, top } of placed) {
        const at = Math.max(top, floor);
        item.style.top = `${at}px`;
        floor = at + item.offsetHeight + MARGIN_GAP;
      }
      margin.style.minHeight = `${floor}px`;
    }
  };
  const latestPlace = useRef(placeMargins);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- layout, not state: the margins are placed beside the lines they gloss after every render.
  useLayoutEffect(() => {
    latestPlace.current = placeMargins;
    placeMargins();
  });
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a resize listener, not state: the lines move when the window changes width.
  useEffect(() => {
    const place = () => latestPlace.current();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);
  return { leftMargin, rightMargin, editorBox, latestPlace };
}

const sourceIdOf = (reference: ResolvedReference) => reference.source?.id ?? null;

export function ReviewFlags({
  claims,
  suggestions,
  body,
  onChoose,
  onReplace,
}: {
  readonly claims: WritingReview["claims"];
  readonly suggestions: WritingReview["suggestions"];
  readonly body: string;
  readonly onChoose: (at: number) => void;
  readonly onReplace: (from: number, to: number, text: string) => void;
}) {
  const t = useT();
  return (
    <>
      {claims.map((claim) => {
        const at = body.indexOf(claim.excerpt);
        return (
          <div key={`claim-${claim.excerpt}`} className="flag" data-pos={at}>
            <p className="flag__title">
              <TriangleAlert className="flag__icon" aria-hidden="true" />
              {t.writing.noReference}
            </p>
            <p className="flag__text">{claim.reason}</p>
            <button
              type="button"
              className="link-button"
              onClick={() => onChoose(insertionAfter(body, claim.excerpt) ?? at)}
            >
              {t.writing.findNote}
            </button>
          </div>
        );
      })}
      {suggestions.map((suggestion) => (
        <div
          key={`suggest-${suggestion.noteId}-${suggestion.excerpt}`}
          className="flag flag--ai"
          data-pos={body.indexOf(suggestion.excerpt)}
        >
          <p className="flag__gloss">{t.writing.suggested}</p>
          <p className="flag__note">{suggestion.noteId}</p>
          <p className="flag__text">{suggestion.reason}</p>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              const place = insertionAfter(body, suggestion.excerpt) ?? body.length;
              const at = hugWord(body, place);
              onReplace(
                at,
                place,
                referenceToken(suggestion.noteId, null) + (at < place ? " " : ""),
              );
            }}
          >
            {t.writing.citeThis}
          </button>
        </div>
      ))}
    </>
  );
}

export function ReferenceGlosses({
  references,
  current,
  onEdit,
  onAddPage,
  onChoose,
}: {
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly current: number | null;
  readonly onEdit: (reference: ResolvedReference) => void;
  readonly onAddPage: (reference: ResolvedReference) => void;
  readonly onChoose: (reference: ResolvedReference) => void;
}) {
  const t = useT();
  return (
    <>
      {references.map((reference) => {
        const flagged = reference.problems.length > 0;
        return (
          <div
            key={`gloss-${reference.start}`}
            className={[
              "gloss",
              flagged ? "gloss--flagged" : "",
              current === reference.start ? "gloss--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-pos={reference.start}
          >
            <button
              type="button"
              className="gloss__head"
              aria-label={`${t.writing.editReference(reference.number)}: ${reference.noteId ?? reference.source?.title ?? reference.target}`}
              onClick={() => onEdit(reference)}
            >
              <span className="gloss__number">{reference.number}</span>
              <span className="gloss__note">
                {reference.noteId ?? reference.source?.title ?? reference.target}
              </span>
            </button>
            <div className="gloss__meta">
              {reference.source === null ? null : (
                <CallNumber source={reference.source} page={reference.page} />
              )}
              {reference.problems.map((problem) => (
                <span key={problem} className="gloss__problem">
                  <TriangleAlert className="gloss__icon" aria-hidden="true" />
                  {t.writing.problems[problem]}
                </span>
              ))}
              {flagged ? (
                <FlagAction
                  reference={reference}
                  sourceId={sourceIdOf(reference)}
                  onAddPage={() => onAddPage(reference)}
                  onChoose={() => onChoose(reference)}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

function FlagAction({
  reference,
  sourceId,
  onAddPage,
  onChoose,
}: {
  readonly reference: ResolvedReference;
  readonly sourceId: string | null;
  readonly onAddPage: () => void;
  readonly onChoose: () => void;
}) {
  const t = useT();
  const problem = reference.problems[0];
  if (problem === "no-location") {
    return (
      <button type="button" className="link-button" onClick={onAddPage}>
        {t.writing.addPage}
      </button>
    );
  }
  if (problem === "not-found") {
    return (
      <button type="button" className="link-button" onClick={onChoose}>
        {t.writing.chooseNote}
      </button>
    );
  }
  if ((problem === "no-year" || problem === "no-publisher") && sourceId !== null) {
    return (
      <Link className="link-button" to="/sources/$sourceId" params={{ sourceId }}>
        {t.writing.openSource}
      </Link>
    );
  }
  if (reference.noteId !== null) {
    return (
      <Link className="link-button" to="/graph" search={{ node: reference.noteId }}>
        {t.writing.showNote}
      </Link>
    );
  }
  return null;
}

export function Checks({
  references,
  claims,
  reviewed,
  onFix,
  onAsk,
}: {
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly claims: number;
  readonly reviewed: boolean;
  readonly onFix: (reference: ResolvedReference) => void;
  readonly onAsk: () => void;
}) {
  const t = useT();
  const ready = references.filter((reference) => reference.problems.length === 0);
  const flagged = references.filter((reference) => reference.problems.length > 0);
  const quotes = references.filter((reference) => reference.quote !== null);
  return (
    <section className="checks" aria-labelledby="checks-title">
      <h2 className="margin-heading" id="checks-title">
        {t.writing.checksTitle}
      </h2>
      {references.length === 0 ? (
        <p className="checks__line">{t.writing.checkNone}</p>
      ) : (
        <p className="checks__line checks__line--ok">
          <Check className="checks__icon" aria-hidden="true" />
          <span>
            {t.writing.checkReady(ready.length)}
            <span className="checks__hint">{t.writing.checkReadyHint}</span>
          </span>
        </p>
      )}
      {flagged.map((reference) => (
        <p key={reference.start} className="checks__line checks__line--problem">
          <TriangleAlert className="checks__icon" aria-hidden="true" />
          <span>
            <strong>
              {t.writing.checkProblem(
                reference.number,
                reference.problems.map((problem) => t.writing.problems[problem]).join(" · "),
              )}
            </strong>{" "}
            <button type="button" className="link-button" onClick={() => onFix(reference)}>
              {reference.problems[0] === "no-location" ? t.writing.addPage : t.writing.write}
            </button>
          </span>
        </p>
      ))}
      {claims === 0 ? null : (
        <p className="checks__line checks__line--problem">
          <TriangleAlert className="checks__icon" aria-hidden="true" />
          <strong>{t.writing.checkClaims(claims)}</strong>
        </p>
      )}
      {quotes.length > 0 &&
      quotes.every((reference) => !reference.problems.includes("quote-mismatch")) ? (
        <p className="checks__line checks__line--ok">
          <Check className="checks__icon" aria-hidden="true" />
          {t.writing.checkQuotes}
        </p>
      ) : null}
      {reviewed ? null : (
        <p className="checks__line">
          <span>
            {t.writing.notReviewed}{" "}
            <button type="button" className="link-button" onClick={onAsk}>
              {t.writing.askAi}
            </button>
          </span>
        </p>
      )}
    </section>
  );
}

export function Questions({
  review,
  running,
  onAsk,
}: {
  readonly review: WritingReview | null;
  readonly running: boolean;
  readonly onAsk: () => void;
}) {
  const t = useT();
  return (
    <section className="questions" aria-labelledby="questions-title">
      <h2 className="margin-heading" id="questions-title">
        {t.writing.questionsTitle}
      </h2>
      {review === null || review.questions.length === 0 ? (
        <p className="questions__empty">{t.writing.questionsEmpty}</p>
      ) : (
        review.questions.map((question) => (
          <div key={question.question} className="question">
            <p className="question__about">
              {question.excerpt === null
                ? t.writing.ai
                : `${t.writing.ai} · ${t.writing.aboutPassage} “${question.excerpt}”`}
            </p>
            <p>{question.question}</p>
          </div>
        ))
      )}
      <button type="button" className="link-button" disabled={running} onClick={onAsk}>
        {running ? t.writing.reviewing : t.writing.askQuestions}
      </button>
    </section>
  );
}

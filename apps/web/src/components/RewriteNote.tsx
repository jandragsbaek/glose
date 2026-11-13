import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { type GraphNode, linkKey, type Source } from "@glose/contracts";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { Check, CircleAlert } from "lucide-react";
import { useBlocker } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import {
  composeBody,
  isRewritten,
  noteSegments,
  type Segment,
  type SegmentEdit,
  startEdit,
} from "../graph/noteEdit.ts";
import { type AiScope, parseNoteText } from "../graph/noteText.ts";
import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS, cardsAtom } from "../state/cards.ts";
import { KEYS, saveNoteAtom } from "../state/graph.ts";
import { AiText, NoteText, type WikilinkPart } from "./NoteText.tsx";
import { CallNumber, Panel } from "./ui.tsx";

/** The Notes and Sources that link to the Note, so the user knows what a new title touches. */
export interface Linking {
  readonly notes: number;
  readonly sources: number;
}

type Problem = { readonly kind: "noTitle" } | { readonly kind: "taken"; readonly name: string };

/**
 * A Note rewritten beside the AI's words: each run of AI text stays on the left, marked, as
 * the model, and the user's words go in an empty field beside it. Words in that field replace
 * the AI text on save, so the mark goes because the user wrote them, not because they said so.
 * AI text the user only corrects keeps its mark; the user's own runs are edited in place.
 */
export function RewriteNote({
  node,
  source,
  linking,
  renderLink,
  leaving,
  onStay,
  onChanged,
  onClose,
  onSaved,
}: {
  readonly node: GraphNode;
  readonly source: Source | undefined;
  readonly linking: Linking;
  readonly renderLink: (part: WikilinkPart) => ReactNode;
  /** The user asked to open another Note here while this one has unsaved words. */
  readonly leaving: boolean;
  /** The user keeps writing after all. */
  readonly onStay: () => void;
  /** Whether the user changed anything, so the page asks before it opens another Note. */
  readonly onChanged: (changed: boolean) => void;
  /** Leaves the desk, unsaved words and all. */
  readonly onClose: () => void;
  readonly onSaved: (id: string) => void | Promise<void>;
}) {
  const t = useT();
  const save = useAtomSet(saveNoteAtom, { mode: "promiseExit" });
  const cards = AsyncResult.getOrElse(
    AsyncResult.map(
      useAtomValue(cardsAtom),
      (all) =>
        all.filter((card) => card.from !== null && linkKey(card.from) === linkKey(node.id)).length,
    ),
    () => 0,
  );
  const titleId = useId();
  const titleErrorId = useId();
  const pageId = useId();

  // A Note marked only for its AI title holds no AI text in its body.
  const [segments] = useState(() => noteSegments(node.body, node.aiText && !node.aiTitle));
  const [edits, setEdits] = useState<ReadonlyArray<SegmentEdit>>(() => segments.map(startEdit));
  const [title, setTitle] = useState(node.aiTitle ? "" : node.title);
  const [correctedTitle, setCorrectedTitle] = useState<string | null>(null);
  const [page, setPage] = useState(node.page ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [failed, setFailed] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  /** Back from the question, Cancel takes focus again once it is there. */
  const refocusCancel = useRef(false);

  const titleRewritten = node.aiTitle && title.trim() !== "";
  const finalTitle = (
    !node.aiTitle || titleRewritten ? title : (correctedTitle ?? node.title)
  ).trim();
  const aiRuns = segments.filter((segment) => segment.kind === "ai").length;
  const total = aiRuns + (node.aiTitle ? 1 : 0);
  const done =
    segments.filter((segment, index) => {
      const edit = edits[index];
      return segment.kind === "ai" && edit !== undefined && isRewritten(edit);
    }).length + (titleRewritten ? 1 : 0);
  const sides = total > 0;
  const { body, aiNote } = composeBody(segments, edits);
  const changed =
    finalTitle !== node.title ||
    (page.trim() === "" ? null : page.trim()) !== node.page ||
    body !== composeBody(segments, segments.map(startEdit)).body ||
    // A Part's heading the user wrote counts once its text follows.
    edits.some((edit) => edit.yourHeading.trim() !== "");

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- the page opens other Notes on the desk and must know first whether this one holds unsaved words.
  useEffect(() => onChanged(changed), [changed, onChanged]);

  // Leaving the Graph with unsaved words asks first. Closing the window does not: Electron would
  // keep the window open without asking anything.
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => changed && next.pathname !== "/graph",
    enableBeforeUnload: false,
    withResolver: true,
  });
  const asking = discarding || leaving || blocker.status === "blocked";

  const discard = () => (blocker.status === "blocked" ? blocker.proceed() : onClose());
  /** Back to writing; focus returns to Cancel, where the question was asked. */
  const keepWriting = () => {
    refocusCancel.current = true;
    if (blocker.status === "blocked") blocker.reset();
    if (leaving) onStay();
    setDiscarding(false);
  };

  const setEdit = (index: number, change: Partial<SegmentEdit>) =>
    setEdits((all) => all.map((edit, at) => (at === index ? { ...edit, ...change } : edit)));

  const submit = async () => {
    if (finalTitle === "") {
      setProblem({ kind: "noTitle" });
      return;
    }
    setProblem(null);
    setFailed(false);
    setBusy(true);
    const exit = await save({
      payload: {
        id: node.id,
        title: finalTitle,
        aiTitle: node.aiTitle && !titleRewritten,
        page: page.trim() === "" ? null : page.trim(),
        body,
        aiNote,
      },
      reactivityKeys: [...KEYS.sources, ...CARD_KEYS.cards],
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) {
      void onSaved(exit.value);
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    if (Option.isSome(error) && error.value._tag === "NoteNameTaken") {
      setProblem({ kind: "taken", name: error.value.fileName });
    } else {
      setFailed(true);
    }
  };

  const cancel = () => (changed ? setDiscarding(true) : onClose());
  const firstAi =
    node.aiTitle || !sides ? -1 : segments.findIndex((segment) => segment.kind === "ai");

  const titleField = (
    <textarea
      id={titleId}
      className="write__title rewrite__title"
      rows={1}
      value={title}
      placeholder={node.aiTitle ? t.rewrite.titlePlaceholder : undefined}
      aria-invalid={problem === null ? undefined : true}
      aria-describedby={problem === null ? undefined : titleErrorId}
      onChange={(event) => {
        setTitle(event.target.value.replace(/\n/g, " "));
        setProblem(null);
      }}
      spellCheck
      // Writing starts where the AI's words are: the title when the AI wrote it.
      autoFocus={firstAi === -1}
    />
  );

  return (
    <Panel
      title={total > 0 ? t.rewrite.titleAi : t.rewrite.titleOwn}
      initial="lapis"
      meta={
        source === undefined ? undefined : (
          <span className="rewrite__source">
            <CallNumber source={source} page={node.page} />
            <span>{source.title}</span>
          </span>
        )
      }
    >
      <form
        className={sides ? "rewrite" : "rewrite rewrite--own"}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || busy) return;
          event.preventDefault();
          if (asking) keepWriting();
          else cancel();
        }}
      >
        {sides ? (
          <div className="rewrite__row rewrite__heads" aria-hidden="true">
            <p className="rewrite__head">{t.rewrite.aiColumn}</p>
            <p className="rewrite__head">{t.rewrite.yourColumn}</p>
          </div>
        ) : null}

        <div className="rewrite__row">
          {sides ? (
            <div
              className="rewrite__cell rewrite__cell--ai"
              data-replaced={titleRewritten || undefined}
            >
              {node.aiTitle ? (
                <AiCorrectable
                  scope="title"
                  corrected={correctedTitle}
                  onCorrect={() => setCorrectedTitle(node.title)}
                  onUndo={() => setCorrectedTitle(null)}
                  field={
                    <textarea
                      className="write__title rewrite__title"
                      rows={1}
                      aria-label={t.aiText.title}
                      value={correctedTitle ?? ""}
                      onChange={(event) =>
                        setCorrectedTitle(event.target.value.replace(/\n/g, " "))
                      }
                      spellCheck
                    />
                  }
                >
                  <h3 className="graph__title">{node.title}</h3>
                </AiCorrectable>
              ) : null}
            </div>
          ) : null}
          <div className="rewrite__cell">
            <label className={sides ? "sr-only" : "field__label"} htmlFor={titleId}>
              {node.aiTitle ? t.rewrite.titleYours : t.rewrite.titleLabel}
            </label>
            {titleField}
            {problem === null ? null : (
              <p className="field__error" id={titleErrorId} role="alert">
                <CircleAlert className="call__icon" aria-hidden="true" />
                {problem.kind === "noTitle" ? t.rewrite.noTitle : t.rewrite.nameTaken(problem.name)}
              </p>
            )}
            {titleRewritten ? <Yours /> : null}
            {finalTitle !== node.title && finalTitle !== "" ? (
              <p className="field__hint">
                {t.rewrite.renames(linking.notes, linking.sources, cards)}
              </p>
            ) : null}
            <label className="write__page rewrite__page" htmlFor={pageId}>
              {t.rewrite.page}
              <input
                id={pageId}
                className="input"
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
            </label>
          </div>
        </div>

        {segments.map((segment, index) => {
          const edit = edits[index] ?? startEdit(segment);
          return (
            <SegmentRow
              key={segment.at}
              segment={segment}
              edit={edit}
              sides={sides}
              renderLink={renderLink}
              autoFocus={index === firstAi}
              onEdit={(change) => setEdit(index, change)}
            />
          );
        })}

        <div className="rewrite__foot">
          {asking ? (
            <div
              className="rewrite__discard"
              role="alertdialog"
              aria-label={t.rewrite.discardQuestion}
            >
              <p>{t.rewrite.discardQuestion}</p>
              <button type="button" className="button" onClick={discard}>
                {t.rewrite.discard}
              </button>
              <button
                type="button"
                className="button button--quiet"
                autoFocus
                onClick={keepWriting}
              >
                {t.rewrite.keepWriting}
              </button>
            </div>
          ) : (
            <>
              <button type="submit" className="button button--primary" disabled={busy}>
                {busy ? t.rewrite.saving : t.rewrite.save}
              </button>
              <button
                ref={(button) => {
                  if (button === null || !refocusCancel.current) return;
                  refocusCancel.current = false;
                  button.focus();
                }}
                type="button"
                className="button button--quiet"
                disabled={busy}
                onClick={cancel}
              >
                {t.rewrite.cancel}
              </button>
              {total > 0 ? (
                <span className="rewrite__progress" aria-live="polite">
                  {t.rewrite.progress(done, total)}
                </span>
              ) : null}
            </>
          )}
          {failed ? (
            <p className="field__error rewrite__failed" role="alert">
              <CircleAlert className="call__icon" aria-hidden="true" />
              {t.rewrite.saveFailed}
            </p>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

/** A run of the Note: the user's own Markdown, or AI text beside the user's words for it. */
function SegmentRow({
  segment,
  edit,
  sides,
  renderLink,
  autoFocus,
  onEdit,
}: {
  readonly segment: Segment;
  readonly edit: SegmentEdit;
  readonly sides: boolean;
  /** This run's field takes focus when the desk opens. */
  readonly autoFocus: boolean;
  readonly renderLink: (part: WikilinkPart) => ReactNode;
  readonly onEdit: (change: Partial<SegmentEdit>) => void;
}) {
  const t = useT();
  const yoursId = useId();
  const headingId = useId();

  if (segment.kind === "own") {
    return (
      <div className="rewrite__row">
        {sides ? <div className="rewrite__cell rewrite__cell--ai" /> : null}
        <div className="rewrite__cell">
          <label className={sides ? "sr-only" : "field__label"} htmlFor={yoursId}>
            {t.rewrite.textLabel}
          </label>
          <textarea
            id={yoursId}
            className="textarea rewrite__text"
            value={edit.yours}
            onChange={(event) => onEdit({ yours: event.target.value })}
            spellCheck
          />
        </div>
      </div>
    );
  }

  const rewritten = isRewritten(edit);
  const count = Math.max(1, parseNoteText(segment.text).length);
  return (
    <div className="rewrite__row">
      <div className="rewrite__cell rewrite__cell--ai" data-replaced={rewritten || undefined}>
        <AiCorrectable
          scope={segment.scope}
          count={count}
          corrected={edit.corrected}
          onCorrect={() => onEdit({ corrected: segment.text })}
          onUndo={() => onEdit({ corrected: null })}
          lead={
            segment.heading === null ? null : (
              <p className="graph__heading" role="heading" aria-level={4}>
                {segment.heading.text}
              </p>
            )
          }
          field={
            <textarea
              className="textarea rewrite__text"
              aria-label={
                segment.scope === "paragraphs"
                  ? t.aiText.paragraphs(count)
                  : t.aiText[segment.scope]
              }
              value={edit.corrected ?? ""}
              onChange={(event) => onEdit({ corrected: event.target.value })}
              spellCheck
            />
          }
        >
          <NoteText markdown={segment.text} aiText={false} renderLink={renderLink} />
        </AiCorrectable>
      </div>
      <div className="rewrite__cell">
        {segment.scope === "part" ? (
          <>
            <label className="sr-only" htmlFor={headingId}>
              {t.rewrite.headingLabel}
            </label>
            <input
              id={headingId}
              className="write__title rewrite__heading"
              value={edit.yourHeading}
              placeholder={segment.heading?.text ?? t.rewrite.headingPlaceholder}
              onChange={(event) => onEdit({ yourHeading: event.target.value })}
              spellCheck
            />
          </>
        ) : null}
        <label className="sr-only" htmlFor={yoursId}>
          {t.rewrite.yoursLabel}
        </label>
        <textarea
          id={yoursId}
          className="textarea rewrite__text"
          value={edit.yours}
          placeholder={t.rewrite.yoursPlaceholder}
          onChange={(event) => onEdit({ yours: event.target.value })}
          spellCheck
          autoFocus={autoFocus}
        />
        {rewritten ? <Yours /> : null}
      </div>
    </div>
  );
}

/** AI text as the model, or, while the user corrects it, a field that keeps the mark. */
function AiCorrectable({
  scope,
  count = 1,
  corrected,
  onCorrect,
  onUndo,
  lead = null,
  field,
  children,
}: {
  readonly scope: AiScope | "title";
  /** Stays above the text and above the correction field, such as a Part's heading. */
  readonly lead?: ReactNode;
  readonly count?: number;
  readonly corrected: string | null;
  readonly onCorrect: () => void;
  readonly onUndo: () => void;
  readonly field: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useT();
  const correcting = corrected !== null;
  return (
    <AiText
      scope={scope}
      count={count}
      {...(correcting ? { note: t.rewrite.stillMarked } : {})}
      action={
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={correcting ? onUndo : onCorrect}
        >
          {correcting ? t.rewrite.undoCorrect : t.rewrite.correct}
        </button>
      }
    >
      {lead}
      {correcting ? field : children}
    </AiText>
  );
}

function Yours() {
  const t = useT();
  return (
    <p className="rewrite__yours">
      <Check className="rewrite__yours-icon" aria-hidden="true" />
      {t.rewrite.replaces}
    </p>
  );
}

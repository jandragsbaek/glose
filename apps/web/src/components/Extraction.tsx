import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { linkKey, nextReadingStep, type Point, type Session, type Source } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { BookOpen, Check, Copy, GitCompareArrows, Link2, Plus, Quote } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useState } from "react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { advanceReadingAtom, KEYS } from "../state/graph.ts";
import {
  addPointAtom,
  dropPointAtom,
  extractionSessionAtom,
  keepPointAtom,
  probeSessionAtom,
  restorePointAtom,
  SESSION_KEYS,
  sendMessageAtom,
  sessionAtom,
  startSessionAtom,
  writePointAtom,
} from "../state/sessions.ts";
import { AiText } from "./NoteText.tsx";
import {
  Composer,
  NeedsChatGpt,
  pointNumber,
  pointsOf,
  SessionProblem,
  Transcript,
  useChatGptReady,
} from "./Session.tsx";
import { StepBar } from "./StepBar.tsx";
import { CallNumber, Flourish, Notice, SkeletonPanel, StorageProblem } from "./ui.tsx";

/**
 * The Extraction step of the Reading Stage. The core points are the page: the user keeps the
 * ones that matter and writes each as a Note in their own words. The Session with the AI sits
 * in the margin beside them.
 */
export function Extraction({
  source,
  sourcePanels,
}: {
  readonly source: Source;
  /** The Free text and the Source's details, shown on demand above the points. */
  readonly sourcePanels: ReactNode;
}) {
  const found = useAtomValue(extractionSessionAtom(source.id));
  const refresh = useAtomRefresh(extractionSessionAtom(source.id));
  return AsyncResult.matchWithError(found, {
    onInitial: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <SkeletonPanel />
      </Desk>
    ),
    onError: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <StorageProblem onRetry={refresh} />
      </Desk>
    ),
    onDefect: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <StorageProblem onRetry={refresh} />
      </Desk>
    ),
    onSuccess: ({ value }) =>
      value === null ? (
        <Desk source={source} sourcePanels={sourcePanels} points={[]}>
          <StartExtraction source={source} />
        </Desk>
      ) : (
        <LiveExtraction id={value.id} source={source} sourcePanels={sourcePanels} />
      ),
  });
}

/** The work column: the step bar, the Source on demand, then the points. */
function Desk({
  source,
  sourcePanels,
  points,
  margin,
  children,
}: {
  readonly source: Source;
  readonly sourcePanels: ReactNode;
  readonly points: ReadonlyArray<Point>;
  readonly margin?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useT();
  const [showSource, setShowSource] = useState(false);
  const counted = points.filter((point) => point.state !== "dropped");
  // A Probe before or after Extraction says on its step how much it asked.
  const probe = AsyncResult.getOrElse(useAtomValue(probeSessionAtom(source.id)), () => null);
  const asked = probe?.entries.filter((entry) => entry._tag === "ProbeQuestion").length ?? 0;
  return (
    <div className="extraction" data-margin={margin === undefined ? undefined : true}>
      <div className="extraction__work">
        <StepBar
          source={source}
          extractionNote={t.extraction.stepNote(
            counted.filter((point) => point.state === "written").length,
            counted.length,
          )}
          probeNote={asked === 0 ? undefined : t.probe.stepNote(asked)}
          freeTextAction={
            <button
              type="button"
              className="step__action"
              aria-expanded={showSource}
              onClick={() => setShowSource(!showSource)}
            >
              {showSource ? t.extraction.hideFreeText : t.extraction.showFreeText}
            </button>
          }
        />
        {showSource ? sourcePanels : null}
        {children}
      </div>
      {margin}
    </div>
  );
}

function StartExtraction({ source }: { readonly source: Source }) {
  const t = useT();
  const ready = useChatGptReady();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });

  const begin = async () => {
    setBusy(true);
    const exit = await start({
      payload: { kind: "extraction", subject: source.id },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <PointsPanel count={null}>
      <div className="points__group">
        {ready ? (
          <div className="stack points__start">
            <div>
              <p className="empty empty--lead">{t.extraction.startLead}</p>
              <p className="empty">{t.extraction.startBody}</p>
            </div>
            {failed ? (
              <Notice tone="error" title={t.errors.storage}>
                <p>{t.errors.storageRecovery}</p>
              </Notice>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                className="button button--primary"
                disabled={busy}
                onClick={begin}
              >
                {t.extraction.start}
              </button>
            </div>
          </div>
        ) : (
          <NeedsChatGpt title={t.session.needsChatGpt} body={t.session.needsChatGptBody} />
        )}
      </div>
    </PointsPanel>
  );
}

function PointsPanel({
  count,
  children,
}: {
  readonly count: number | null;
  readonly children: ReactNode;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section className="panel points" data-initial="rubric" aria-labelledby={headingId}>
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {t.extraction.title}
        </h2>
        {count === null ? null : <span className="panel__meta">{t.extraction.count(count)}</span>}
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      {children}
    </section>
  );
}

function LiveExtraction({
  id,
  source,
  sourcePanels,
}: {
  readonly id: string;
  readonly source: Source;
  readonly sourcePanels: ReactNode;
}) {
  const result = useAtomValue(sessionAtom(id));
  const refresh = useAtomRefresh(sessionAtom(id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <SkeletonPanel />
      </Desk>
    ),
    onError: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <StorageProblem onRetry={refresh} />
      </Desk>
    ),
    onDefect: () => (
      <Desk source={source} sourcePanels={sourcePanels} points={[]}>
        <StorageProblem onRetry={refresh} />
      </Desk>
    ),
    onSuccess: ({ value }) => (
      <ExtractionView session={value} source={source} sourcePanels={sourcePanels} />
    ),
  });
}

/** Points by what the user did with them. */
const groupsOf = (points: ReadonlyArray<Point>) => ({
  kept: points.filter((point) => point.state === "kept"),
  open: points.filter((point) => point.state === "open"),
  written: points.filter((point) => point.state === "written"),
  dropped: points.filter((point) => point.state === "dropped"),
});

const elementOf = (point: string) => `point-${point}`;

function ExtractionView({
  session,
  source,
  sourcePanels,
}: {
  readonly session: Session;
  readonly source: Source;
  readonly sourcePanels: ReactNode;
}) {
  const t = useT();
  const points = pointsOf(session.entries);
  const groups = groupsOf(points);
  /** The Point the user talks to the AI about; it wears the gilt mark. */
  const [aboutId, setAbout] = useState<string | null>(null);
  /** The kept Point open for writing; the first kept one when the user chose none. */
  const [writingId, setWriting] = useState<string | null>(null);
  const writing = groups.kept.find((point) => point.id === writingId) ?? groups.kept[0];
  const about = points.find((point) => point.id === aboutId && point.state !== "dropped");

  /** Brings a Point into view and makes it the subject of the next message. */
  const show = (pointId: string) => {
    setAbout(pointId);
    if (groups.kept.some((point) => point.id === pointId)) setWriting(pointId);
    document
      .getElementById(elementOf(pointId))
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const headingId = useId();
  const margin = (
    <aside className="extraction__margin" data-initial="lapis" aria-labelledby={headingId}>
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {t.session.transcript}
        </h2>
        {session.model === null ? null : <span className="panel__meta">{session.model}</span>}
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      <div className="extraction__transcript">
        <Transcript session={session} onPoint={show} />
        <SessionProblem session={session} />
      </div>
      <Composer session={session} about={about} onClearAbout={() => setAbout(null)} />
    </aside>
  );

  const counted = points.filter((point) => point.state !== "dropped");
  return (
    <Desk source={source} sourcePanels={sourcePanels} points={points} margin={margin}>
      <PointsPanel count={counted.length}>
        {points.length === 0 ? (
          <div className="points__group">
            <p className="empty">
              {session.working ? t.extraction.waiting : t.extraction.noPoints}
            </p>
          </div>
        ) : null}
        {writing === undefined ? null : (
          <div className="points__group">
            {/* Every kept Point's form stays mounted, so switching Points keeps unsaved words. */}
            {groups.kept.map((point) => (
              <div key={point.id} hidden={point.id !== writing.id}>
                <WritePoint
                  session={session}
                  point={point}
                  shown={point.id === writing.id}
                  about={about?.id === point.id}
                  onAbout={() => setAbout(point.id)}
                />
              </div>
            ))}
          </div>
        )}
        {groups.kept.length > 1 ? (
          <div className="points__group">
            <p className="points__head">{t.extraction.toWrite}</p>
            <ol className="point-rows">
              {groups.kept
                .filter((point) => point.id !== writing?.id)
                .map((point) => (
                  <PointRow key={point.id} point={point} about={about?.id === point.id}>
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => {
                        setWriting(point.id);
                        setAbout(point.id);
                      }}
                    >
                      {t.extraction.write}
                    </button>
                  </PointRow>
                ))}
            </ol>
          </div>
        ) : null}
        {groups.open.length === 0 ? null : (
          <ProposedPoints
            session={session}
            points={groups.open}
            aboutId={about?.id}
            onKept={(pointId) => {
              setWriting(pointId);
              setAbout(pointId);
            }}
            onDiscuss={show}
          />
        )}
        {groups.written.length === 0 ? null : (
          <div className="points__group">
            <p className="points__head">
              {t.extraction.written} <span className="points__count">{groups.written.length}</span>
            </p>
            <ul className="written">
              {groups.written.map((point) => (
                <li key={point.id} id={elementOf(point.id)}>
                  <Check className="written__icon" aria-label={t.extraction.states.written} />
                  {point.note === null ? (
                    <span className="written__title">{point.title}</span>
                  ) : (
                    <Link
                      to="/graph"
                      search={{ node: point.note }}
                      className="written__title"
                      title={t.extraction.openInGraph}
                    >
                      {point.note}
                    </Link>
                  )}
                  <span className="written__meta">
                    <CallNumber source={source} page={point.page} />
                    {t.extraction.links(point.links.filter((link) => link.added).length)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <PointsFoot session={session} dropped={groups.dropped} />
        {source.readingStep === "extraction" ? <NextStep source={source} /> : null}
      </PointsPanel>
    </Desk>
  );
}

/**
 * The way on from Extraction: to the Probe when the Source started with writing, else the
 * Source is read. Extraction does not end by itself; the user says when the points are written.
 */
function NextStep({ source }: { readonly source: Source }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const advance = useAtomSet(advanceReadingAtom, { mode: "promiseExit" });
  const next = nextReadingStep(source.readingStart, "extraction") === "probe" ? "probe" : "done";
  const hintId = useId();

  const go = async () => {
    setBusy(true);
    const exit = await advance({
      payload: { id: source.id, from: "extraction" },
      reactivityKeys: KEYS.sources,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <div className="points__group points__next">
      <p className="field__hint" id={hintId}>
        {t.extraction.nextHint[next]}
      </p>
      {failed ? (
        <Notice tone="error">
          <p>{t.extraction.nextFailed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          aria-describedby={hintId}
          disabled={busy}
          onClick={go}
        >
          {t.extraction.next[next]}
        </button>
      </div>
    </div>
  );
}

/** Where a Point comes from, and how it meets the Notes the user has. */
function PointSource({ point }: { readonly point: Point }) {
  const t = useT();
  return (
    <>
      {point.origin === "free-text" && point.quote !== null ? (
        <p className="point__from">
          <Quote className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.fromFreeText} <q>{point.quote}</q>
          </span>
        </p>
      ) : null}
      {point.origin === "probe" && point.quote !== null ? (
        <p className="point__from">
          <Quote className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.fromProbe} <q>{point.quote}</q>
          </span>
        </p>
      ) : null}
      {point.origin === "ai" ? (
        <p className="point__from">
          <BookOpen className="point__icon" aria-hidden="true" />
          <span>{t.extraction.notInFreeText}</span>
        </p>
      ) : null}
      {point.repeats === null ? null : (
        <p className="point__from point__from--graph">
          <Copy className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.repeats} <NoteLink name={point.repeats} />
          </span>
        </p>
      )}
      {point.pullsAgainst === null ? null : (
        <p className="point__from point__from--graph">
          <GitCompareArrows className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.pullsAgainst} <NoteLink name={point.pullsAgainst.note} />
            {point.pullsAgainst.why === "" ? null : (
              <span className="point__why"> {point.pullsAgainst.why}</span>
            )}
          </span>
        </p>
      )}
    </>
  );
}

function NoteLink({ name }: { readonly name: string }) {
  return (
    <Link to="/graph" search={{ node: name }} className="wikilink">
      {name}
    </Link>
  );
}

function PointRow({
  point,
  about,
  children,
}: {
  readonly point: Point;
  readonly about: boolean;
  readonly children: ReactNode;
}) {
  return (
    <li className="point-row" id={elementOf(point.id)}>
      <span className="point__num" data-about={about ? true : undefined}>
        {pointNumber(point)}
      </span>
      <span className="point-row__title">{point.title}</span>
      <span className="point-row__actions">{children}</span>
      <div className="point-row__source">
        <PointSource point={point} />
      </div>
    </li>
  );
}

/** One quiet AI mark for the whole group: the AI wrote every one of these titles. */
function ProposedPoints({
  session,
  points,
  aboutId,
  onKept,
  onDiscuss,
}: {
  readonly session: Session;
  readonly points: ReadonlyArray<Point>;
  readonly aboutId: string | undefined;
  readonly onKept: (point: string) => void;
  readonly onDiscuss: (point: string) => void;
}) {
  const t = useT();
  const glossId = useId();
  const [failed, setFailed] = useState(false);
  const keep = useAtomSet(keepPointAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPointAtom, { mode: "promiseExit" });
  const decide = async (run: () => Promise<Exit.Exit<unknown, unknown>>, then?: () => void) => {
    const exit = await run();
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) then?.();
  };
  return (
    <div className="points__group">
      <div className="ai-text" data-scope="paragraphs" role="group" aria-labelledby={glossId}>
        <p className="ai-text__gloss" id={glossId}>
          {t.extraction.proposed(points.length)}
        </p>
        <ol className="point-rows">
          {points.map((point) => (
            <PointRow key={point.id} point={point} about={aboutId === point.id}>
              <button
                type="button"
                className="button button--small"
                onClick={() =>
                  decide(
                    () =>
                      keep({ payload: { id: session.id, point: point.id, title: point.title } }),
                    () => onKept(point.id),
                  )
                }
              >
                {t.extraction.keep}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => onDiscuss(point.id)}
              >
                {t.extraction.discuss}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => decide(() => drop({ payload: { id: session.id, point: point.id } }))}
              >
                {t.extraction.drop}
              </button>
            </PointRow>
          ))}
        </ol>
      </div>
      {failed ? (
        <Notice tone="error">
          <p>{t.extraction.actionFailed}</p>
        </Notice>
      ) : null}
    </div>
  );
}

type SaveProblem = { readonly kind: "taken"; readonly name: string } | { readonly kind: "failed" };

/**
 * A kept Point, open for the user to write as a Note. The text starts as the AI's draft, marked
 * as AI text, edited or not, until the user says they rewrote it in their own words.
 */
function WritePoint({
  session,
  point,
  shown,
  about,
  onAbout,
}: {
  readonly session: Session;
  readonly point: Point;
  /** The open Point; a hidden form keeps its words for when the user comes back. */
  readonly shown: boolean;
  readonly about: boolean;
  readonly onAbout: () => void;
}) {
  const t = useT();
  const textId = useId();
  const pageId = useId();
  const [title, setTitle] = useState(point.title);
  const [text, setText] = useState(point.draft ?? "");
  /** The text is the AI's draft, edited or not; the Note keeps it marked. */
  const [aiText, setAiText] = useState(point.draft !== null);
  /** A new draft the user asked for replaces the text. */
  const [draftShown, setDraftShown] = useState(point.draft);
  if (point.draft !== draftShown) {
    setDraftShown(point.draft);
    if (point.draft !== null) {
      setText(point.draft);
      setAiText(true);
    }
  }
  const [page, setPage] = useState("");
  const [added, setAdded] = useState<ReadonlyArray<string>>([]);
  const [dropped, setDropped] = useState<ReadonlyArray<string>>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const write = useAtomSet(writePointAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPointAtom, { mode: "promiseExit" });
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });

  const canSave = !busy && title.trim() !== "" && text.trim() !== "";
  const isAdded = (note: string) => added.some((name) => linkKey(name) === linkKey(note));
  const links = point.links.filter(
    (link) => !dropped.some((name) => linkKey(name) === linkKey(link.note)),
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    const exit = await write({
      payload: {
        id: session.id,
        point: point.id,
        title,
        text,
        aiText,
        page: page.trim() === "" ? null : page.trim(),
        links: added,
      },
      reactivityKeys: KEYS.sources,
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) return;
    const error = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none();
    setProblem(
      Option.isSome(error) && error.value._tag === "NoteNameTaken"
        ? { kind: "taken", name: error.value.fileName }
        : { kind: "failed" },
    );
  };

  const textarea = (
    <textarea
      className="textarea write__text"
      id={textId}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        // An empty box holds no AI text; what the user types next is their own.
        if (event.target.value.trim() === "") setAiText(false);
      }}
      onFocus={onAbout}
      spellCheck
    />
  );

  const titleInput = (
    <input
      className="write__title"
      aria-label={t.extraction.titleLabel}
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      spellCheck
    />
  );

  return (
    <form className="write" id={shown ? elementOf(point.id) : undefined} onSubmit={save}>
      <span className="point__num" data-about={about ? true : undefined}>
        {pointNumber(point)}
      </span>
      <div className="write__body">
        {point.origin === "user" ? titleInput : <AiText scope="title">{titleInput}</AiText>}
        <PointSource point={point} />
        <label className="sr-only" htmlFor={textId}>
          {aiText ? t.extraction.draftLabel : t.extraction.textLabel}
        </label>
        <AiText
          scope="paragraphs"
          count={paragraphCount(text)}
          marked={aiText}
          note={t.extraction.draftMarked}
          action={
            <button
              type="button"
              className="button button--quiet button--small"
              title={t.extraction.rewroteHint}
              onClick={() => setAiText(false)}
            >
              {t.extraction.rewrote}
            </button>
          }
        >
          {textarea}
        </AiText>
        <div className="write__row">
          <label className="write__page" htmlFor={pageId}>
            {t.extraction.page}
            <input
              id={pageId}
              className="input"
              value={page}
              onChange={(event) => setPage(event.target.value)}
            />
            <span className="field__optional">({t.common.optional})</span>
          </label>
          <span className="write__words">{t.steps.words(wordCount(text))}</span>
        </div>
        {links.length === 0 ? null : (
          <div className="links">
            <p className="links__head">
              <Link2 className="point__icon" aria-hidden="true" />
              {t.extraction.linksHead}
            </p>
            <ul>
              {links.map((link) => (
                <li key={link.note}>
                  <span className="links__note">
                    <NoteLink name={link.note} />
                    <span className="links__why">{link.why}</span>
                  </span>
                  <span className="links__act">
                    {isAdded(link.note) ? (
                      <>
                        <span className="links__added">
                          <Check className="point__icon" aria-hidden="true" />
                          {t.extraction.linkAdded}
                        </span>
                        <button
                          type="button"
                          className="button button--quiet button--small"
                          onClick={() =>
                            setAdded(added.filter((name) => linkKey(name) !== linkKey(link.note)))
                          }
                        >
                          {t.extraction.undo}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button button--small"
                          onClick={() => setAdded([...added, link.note])}
                        >
                          {t.extraction.addLink}
                        </button>
                        <button
                          type="button"
                          className="button button--quiet button--small"
                          onClick={() => setDropped([...dropped, link.note])}
                        >
                          {t.extraction.dropLink}
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {problem === null ? null : (
          <Notice tone="error">
            <p>
              {problem.kind === "taken"
                ? t.extraction.nameTaken(problem.name)
                : t.extraction.saveFailed}
            </p>
          </Notice>
        )}
        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={!canSave}>
            {t.extraction.save}
          </button>
          <button
            type="button"
            className="button"
            disabled={session.working}
            onClick={() => {
              onAbout();
              void send({
                payload: { id: session.id, text: t.extraction.draftRequest, about: point.id },
              });
            }}
          >
            {t.extraction.askDraft}
          </button>
          <button
            type="button"
            className="button button--quiet write__drop"
            onClick={() => void drop({ payload: { id: session.id, point: point.id } })}
          >
            {t.extraction.drop}
          </button>
        </div>
      </div>
    </form>
  );
}

const paragraphCount = (text: string) =>
  text.split(/\n[ \t]*\n/).filter((paragraph) => paragraph.trim() !== "").length;

/** Ways on: a Point in the user's own words, more from the AI, and the dropped ones. */
function PointsFoot({
  session,
  dropped,
}: {
  readonly session: Session;
  readonly dropped: ReadonlyArray<Point>;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [showDropped, setShowDropped] = useState(false);
  const [failed, setFailed] = useState(false);
  const add = useAtomSet(addPointAtom, { mode: "promiseExit" });
  const restore = useAtomSet(restorePointAtom, { mode: "promiseExit" });
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    const exit = await add({ payload: { id: session.id, title } });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) {
      setTitle("");
      setAdding(false);
    }
  };

  return (
    <>
      {showDropped && dropped.length > 0 ? (
        <div className="points__group">
          <p className="points__head">{t.extraction.dropped}</p>
          <ol className="point-rows point-rows--dropped">
            {dropped.map((point) => (
              <PointRow key={point.id} point={point} about={false}>
                <button
                  type="button"
                  className="button button--quiet button--small"
                  onClick={() => void restore({ payload: { id: session.id, point: point.id } })}
                >
                  {t.extraction.bringBack}
                </button>
              </PointRow>
            ))}
          </ol>
        </div>
      ) : null}
      {adding ? (
        <form className="points__group points__add" onSubmit={submit}>
          <label className="field__label" htmlFor={inputId}>
            {t.extraction.addOwnLabel}
          </label>
          <p className="field__hint" id={hintId}>
            {t.extraction.addOwnHint}
          </p>
          <input
            id={inputId}
            className="input"
            aria-describedby={hintId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            spellCheck
          />
          {failed ? (
            <Notice tone="error">
              <p>{t.extraction.actionFailed}</p>
            </Notice>
          ) : null}
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={title.trim() === ""}>
              {t.extraction.add}
            </button>
            <button type="button" className="button button--quiet" onClick={() => setAdding(false)}>
              {t.extraction.cancel}
            </button>
          </div>
        </form>
      ) : null}
      <div className="points__foot">
        {adding ? null : (
          <button type="button" className="button" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            {t.extraction.addOwn}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={session.working}
          onClick={() =>
            void send({ payload: { id: session.id, text: t.extraction.proposeMoreRequest } })
          }
        >
          {t.extraction.proposeMore}
        </button>
        {dropped.length === 0 ? null : (
          <button
            type="button"
            className="button button--quiet points__dropped"
            aria-expanded={showDropped}
            onClick={() => setShowDropped(!showDropped)}
          >
            {showDropped ? t.extraction.hideDropped : t.extraction.showDropped(dropped.length)}
          </button>
        )}
      </div>
    </>
  );
}

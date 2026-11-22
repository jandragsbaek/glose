import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { nextReadingStep, type Point, type Session, type Source } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { advanceReadingAtom, KEYS } from "../state/vault.ts";
import { extractionSessionAtom, sessionAtom } from "../state/sessions.ts";
import { Desk, PointsPanel, StartExtraction, StartGroup } from "./ExtractionDesk.tsx";
import { PassageNote } from "./PassageNote.tsx";
import { elementOf, PointRow } from "./PointRow.tsx";
import { PointsFoot } from "./PointsFoot.tsx";
import { ProposedPoints } from "./ProposedPoints.tsx";
import { Composer, pointsOf, SessionProblem, Transcript } from "./Session.tsx";
import { CallNumber, Flourish, Notice, SkeletonPanel, StorageProblem } from "./ui.tsx";
import { WritePoint } from "./WritePoint.tsx";

export function Extraction({
  source,
  sourcePanels,
}: {
  readonly source: Source;
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

const groupsOf = (points: ReadonlyArray<Point>) => ({
  kept: points.filter((point) => point.state === "kept"),
  open: points.filter((point) => point.state === "open"),
  written: points.filter((point) => point.state === "written"),
  dropped: points.filter((point) => point.state === "dropped"),
});
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
  const [aboutId, setAbout] = useState<string | null>(null);
  const [writingId, setWriting] = useState<string | null>(null);
  const writing = groups.kept.find((point) => point.id === writingId) ?? groups.kept[0];
  const about = points.find((point) => point.id === aboutId && point.state !== "dropped");

  const show = (pointId: string) => {
    setAbout(pointId);
    if (groups.kept.some((point) => point.id === pointId)) setWriting(pointId);
    document
      .getElementById(elementOf(pointId))
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const headingId = useId();
  const margin = (
    <aside className="extraction__margin" data-initial="accent" aria-labelledby={headingId}>
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
        {session.started === false && !session.working ? <StartGroup source={source} /> : null}
        {points.length === 0 ? (
          <div className="points__group">
            <p className="empty">
              {session.working ? t.extraction.waiting : t.extraction.noPoints}
            </p>
          </div>
        ) : null}
        {writing === undefined ? null : (
          <div className="points__group">
            {groups.kept.map((point) => (
              <div key={point.id} hidden={point.id !== writing.id}>
                {point.passages !== undefined && point.passages.length > 0 ? (
                  <PassageNote
                    cites={point.passages}
                    ids={{ session: session.id, point: point.id }}
                    session={session}
                    point={point}
                    ensure={async () => ({ session: session.id, point: point.id })}
                    onSaved={() => undefined}
                    onClose={() => undefined}
                    closeLabel={t.extraction.drop}
                  />
                ) : (
                  <WritePoint
                    session={session}
                    point={point}
                    video={source.kind === "video"}
                    shown={point.id === writing.id}
                    about={about?.id === point.id}
                    onAbout={() => setAbout(point.id)}
                  />
                )}
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
                  <PointRow
                    key={point.id}
                    point={point}
                    video={source.kind === "video"}
                    about={about?.id === point.id}
                  >
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
            video={source.kind === "video"}
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
        <PointsFoot session={session} dropped={groups.dropped} video={source.kind === "video"} />
        {source.readingStep === "extraction" ? <NextStep source={source} /> : null}
      </PointsPanel>
    </Desk>
  );
}

function NextStep({ source }: { readonly source: Source }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const advance = useAtomSet(advanceReadingAtom, { mode: "promiseExit" });
  const next =
    nextReadingStep(source.readingStart, "extraction", source.kind) === "probe" ? "probe" : "done";
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

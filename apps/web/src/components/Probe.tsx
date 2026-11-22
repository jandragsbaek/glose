import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  openQuestion,
  planOf,
  probeFindings,
  probeTally,
  type Session,
  type SessionEntry,
  type Source,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { type ReactNode, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  finishProbeAtom,
  probeSessionAtom,
  SESSION_KEYS,
  sessionAtom,
  startSessionAtom,
} from "../state/sessions.ts";
import { AnswerBox, useAnswerDraft } from "./ProbeAnswer.tsx";
import { ProbeRow, type RowContext, rowsOf } from "./ProbeRows.tsx";
import { Live, NeedsChatGpt, SessionProblem, useChatGptReady } from "./Session.tsx";
import { PassagesLink } from "./Passages.tsx";
import { StepBar } from "./StepBar.tsx";
import { Findings } from "./ProbeFindings.tsx";
import { followRow, waitsForWhole, WholeProbe } from "./ProbeWhole.tsx";
import { Notice, Page, SkeletonPanel, StorageProblem } from "./ui.tsx";

interface Frame {
  readonly source: Source;
  readonly sub: ReactNode;
  readonly sourcePanels: ReactNode;
}

export function Probe(frame: Frame) {
  const found = useAtomValue(probeSessionAtom(frame.source.id));
  const refresh = useAtomRefresh(probeSessionAtom(frame.source.id));
  return AsyncResult.matchWithError(found, {
    onInitial: () => (
      <ProbePage {...frame} session={null}>
        <SkeletonPanel />
      </ProbePage>
    ),
    onError: () => (
      <ProbePage {...frame} session={null}>
        <StorageProblem onRetry={refresh} />
      </ProbePage>
    ),
    onDefect: () => (
      <ProbePage {...frame} session={null}>
        <StorageProblem onRetry={refresh} />
      </ProbePage>
    ),
    onSuccess: ({ value }) =>
      value === null ? (
        <ProbePage {...frame} session={null}>
          <StartProbe source={frame.source} />
        </ProbePage>
      ) : (
        <LiveProbe id={value.id} {...frame} />
      ),
  });
}

function LiveProbe({ id, ...frame }: Frame & { readonly id: string }) {
  const result = useAtomValue(sessionAtom(id));
  const refresh = useAtomRefresh(sessionAtom(id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <ProbePage {...frame} session={null}>
        <SkeletonPanel />
      </ProbePage>
    ),
    onError: () => (
      <ProbePage {...frame} session={null}>
        <StorageProblem onRetry={refresh} />
      </ProbePage>
    ),
    onDefect: () => (
      <ProbePage {...frame} session={null}>
        <StorageProblem onRetry={refresh} />
      </ProbePage>
    ),
    onSuccess: ({ value }) => <ProbeView session={value} {...frame} />,
  });
}

const isFinished = (session: Session) =>
  session.entries.some((entry) => entry._tag === "ProbeFinished");

const questionCount = (entries: ReadonlyArray<SessionEntry>) =>
  entries.filter((entry) => entry._tag === "ProbeQuestion").length;

function ProbePage({
  source,
  sub,
  sourcePanels,
  session,
  children,
  box,
}: Frame & {
  readonly session: Session | null;
  readonly children: ReactNode;
  readonly box?: ReactNode;
}) {
  const t = useT();
  const [showSource, setShowSource] = useState(false);
  const [finishFailed, setFinishFailed] = useState(false);
  const finish = useAtomSet(finishProbeAtom, { mode: "promiseExit" });
  const entries = session?.entries ?? [];
  const questions = questionCount(entries);
  const tally = { ...probeTally(probeFindings(entries)), planned: planOf(entries) !== null };
  const canFinish = session !== null && questions > 0 && !isFinished(session);

  const finishNow = async () => {
    if (session === null) return;
    const exit = await finish({ payload: { id: session.id } });
    setFinishFailed(Exit.isFailure(exit));
  };

  const actions = (
    <>
      {source.hasText ? (
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: source.id }}
          search={{ text: 1 }}
          className="button button--quiet"
        >
          {t.reader.readText}
        </Link>
      ) : source.kind === "video" ? (
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: source.id }}
          search={{ watch: 1 }}
          className="button button--quiet"
        >
          {t.watch.watchVideo}
        </Link>
      ) : source.kind === "book" ? (
        <PassagesLink source={source} />
      ) : null}
      <button
        type="button"
        className="button button--quiet"
        aria-expanded={showSource}
        onClick={() => setShowSource(!showSource)}
      >
        {showSource ? t.probe.hideFreeText : t.probe.showFreeText}
      </button>
      {canFinish ? (
        <button type="button" className="button" disabled={session.working} onClick={finishNow}>
          {t.probe.finish}
        </button>
      ) : null}
    </>
  );

  return (
    <Page title={source.title} sub={sub} actions={actions} fill flush>
      <div className="probe">
        <div className="probe__top">
          <StepBar source={source} probeNote={t.probe.stepNote(questions)} />
          {questions === 0 ? null : (
            <p className="probe__tally" role="status">
              {t.probe.tally(tally)}
            </p>
          )}
        </div>
        <div className="probe__scroll">
          {showSource ? <div className="probe__source">{sourcePanels}</div> : null}
          {finishFailed ? (
            <div className="probe__notice">
              <Notice tone="error">
                <p>{t.probe.finishFailed}</p>
              </Notice>
            </div>
          ) : null}
          {children}
        </div>
        {box}
      </div>
    </Page>
  );
}

function StartProbe({ source }: { readonly source: Source }) {
  const t = useT();
  const ready = useChatGptReady();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });

  const begin = async () => {
    setBusy(true);
    const exit = await start({
      payload: { kind: "probe", subject: source.id },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <div className="probe__start">
      {ready ? (
        <>
          <p className="empty empty--lead">{t.probe.startLead[source.readingStart ?? "write"]}</p>
          <p className="empty">{t.probe.startBody[source.readingStart ?? "write"]}</p>
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
              {t.probe.start}
            </button>
          </div>
        </>
      ) : (
        <NeedsChatGpt title={t.probe.needsChatGpt} body={t.session.needsChatGptBody} />
      )}
    </div>
  );
}

function ProbeView({ session, ...frame }: Frame & { readonly session: Session }) {
  const t = useT();
  const finished = isFinished(session);
  const rows = rowsOf(session.entries);
  const open = openQuestion(session.entries);
  const { draft, fields } = useAnswerDraft(open?.number ?? null);
  const waitsForTheWhole = !finished && frame.source.hasText && waitsForWhole(session);
  const context: RowContext = {
    session,
    draft,
    open,
    onDispute: finished ? null : (question) => draft.openTalk(question),
  };

  return (
    <ProbePage
      {...frame}
      session={session}
      box={
        finished || (waitsForTheWhole && draft.talk === null) ? undefined : (
          <AnswerBox
            session={session}
            open={open}
            draft={draft}
            fields={fields}
            waitsForWhole={waitsForTheWhole}
          />
        )
      }
    >
      {session.entries.length === 0 && !session.working ? (
        <p className="empty probe__empty">{t.probe.waiting}</p>
      ) : null}
      <ol className="probe__sheet" aria-label={t.session.transcript}>
        {rows.map((row, index) => (
          <ProbeRow
            // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so a row's place is its identity.
            key={index}
            row={row}
            context={context}
            follow={!session.working && index === rows.length - 1 ? followRow : undefined}
          />
        ))}
        {session.working ? (
          <li className="probe__row" aria-busy="true" ref={followRow}>
            <div className="probe__main">
              <p className="probe__who">{t.session.ai}</p>
              <Live session={session} points={[]} onPoint={undefined} />
            </div>
          </li>
        ) : null}
        {session.problem === null || finished ? null : (
          <li className="probe__row" ref={followRow}>
            <div className="probe__main">
              <SessionProblem session={session} />
            </div>
          </li>
        )}
      </ol>
      {waitsForTheWhole ? <WholeProbe session={session} /> : null}
      {finished ? <Findings session={session} source={frame.source} /> : null}
    </ProbePage>
  );
}

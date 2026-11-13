import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  nextReadingStep,
  openQuestion,
  probeFindings,
  probeTally,
  type ReasoningVerdict,
  type ResultVerdict,
  type Session,
  type SessionEntry,
  type Source,
  type TopicState,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { BookOpen, Check, Minus, TriangleAlert } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { advanceReadingAtom, KEYS } from "../state/graph.ts";
import {
  answerProbeAtom,
  finishProbeAtom,
  probeSessionAtom,
  SESSION_KEYS,
  sessionAtom,
  startSessionAtom,
  stopSessionAtom,
} from "../state/sessions.ts";
import { ManageUsageLink } from "./ChatGptConnection.tsx";
import {
  AiStep,
  IS_MAC,
  Live,
  MessageText,
  NeedsChatGpt,
  SessionProblem,
  ToolUses,
  useChatGptReady,
} from "./Session.tsx";
import { StepBar } from "./StepBar.tsx";
import { Notice, Page, SkeletonPanel, StorageProblem } from "./ui.tsx";

type Entry<T extends SessionEntry["_tag"]> = Extract<SessionEntry, { _tag: T }>;

interface Frame {
  readonly source: Source;
  readonly sub: ReactNode;
  /** The Free text and the Source's details, shown on demand above the transcript. */
  readonly sourcePanels: ReactNode;
}

/**
 * The Probe step of the Reading Stage. The conversation is the page, at reading width: each
 * question, the user's Reasoning and answer, and beside the answer the AI's judgment as a gloss
 * in the margin. Teaching sits in the column as AI text; the answer box stays at the foot.
 */
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

/** The page around the Probe: its header actions, the step bar and the tally, then the body. */
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
  const tally = probeTally(probeFindings(entries));
  const canFinish = session !== null && questions > 0 && !isFinished(session);

  const finishNow = async () => {
    if (session === null) return;
    const exit = await finish({ payload: { id: session.id } });
    setFinishFailed(Exit.isFailure(exit));
  };

  const actions = (
    <>
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
              {t.probe.tally(tally.known, tally.open, tally.taught)}
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

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The last row of the transcript comes into view when it mounts: a new question, answer or
 * teaching lands at the foot. The callback is stable, so a row already shown never scrolls again.
 */
const followRow = (node: HTMLElement | null) => {
  node?.scrollIntoView({ block: "end", behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

function ProbeView({ session, ...frame }: Frame & { readonly session: Session }) {
  const t = useT();
  const finished = isFinished(session);
  const rows = rowsOf(session.entries);

  return (
    <ProbePage
      {...frame}
      session={session}
      box={finished ? undefined : <AnswerBox session={session} />}
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
            session={session}
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
      {finished ? <Findings session={session} source={frame.source} /> : null}
    </ProbePage>
  );
}

type Row =
  | { readonly kind: "tools"; readonly uses: ReadonlyArray<Entry<"ToolUse">> }
  | { readonly kind: "entry"; readonly entry: SessionEntry }
  | {
      readonly kind: "answer";
      readonly answer: Entry<"ProbeAnswer">;
      readonly judgment: Entry<"ProbeJudgment"> | undefined;
    };

/**
 * The transcript as rows: a run of tool uses folds into one, and an answer takes its judgment
 * beside it, wherever in the turn the judgment came.
 */
const rowsOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<Row> => {
  const rows: Array<Row> = [];
  for (const entry of entries) {
    const last = rows.at(-1);
    if (entry._tag === "ToolUse") {
      if (last?.kind === "tools")
        rows[rows.length - 1] = { kind: "tools", uses: [...last.uses, entry] };
      else rows.push({ kind: "tools", uses: [entry] });
    } else if (entry._tag === "ProbeAnswer") {
      const judgment = entries.find(
        (other): other is Entry<"ProbeJudgment"> =>
          other._tag === "ProbeJudgment" && other.question === entry.question,
      );
      rows.push({ kind: "answer", answer: entry, judgment });
    } else if (entry._tag !== "ProbeJudgment" && entry._tag !== "ProbeFinished") {
      rows.push({ kind: "entry", entry });
    }
  }
  return rows;
};

type Follow = ((node: HTMLElement | null) => void) | undefined;

function ProbeRow({
  row,
  session,
  follow,
}: {
  readonly row: Row;
  readonly session: Session;
  readonly follow: Follow;
}) {
  switch (row.kind) {
    case "tools":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <ToolUses uses={row.uses} />
          </div>
        </li>
      );
    case "answer":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <AnswerView answer={row.answer} quote={row.judgment?.quote ?? null} />
          </div>
          {row.judgment === undefined ? null : <Judgment judgment={row.judgment} />}
        </li>
      );
    case "entry":
      return <EntryRow entry={row.entry} session={session} follow={follow} />;
  }
}

function EntryRow({
  entry,
  session,
  follow,
}: {
  readonly entry: SessionEntry;
  readonly session: Session;
  readonly follow: Follow;
}) {
  const t = useT();
  switch (entry._tag) {
    case "ProbeQuestion":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main probe__question">
            <p className="probe__who">
              {t.session.ai} <span className="probe__qn">{t.probe.question(entry.number)}</span>
              <span className="probe__topic">
                {entry.topic}
                {entry.again === null ? null : ` · ${t.probe.again(entry.again)}`}
              </span>
            </p>
            <p className="probe__ask">
              <span className="sr-only">{t.probe.questionLabel(entry.number)}: </span>
              {entry.text}
            </p>
          </div>
        </li>
      );
    case "ProbeTaught":
      return (
        <li className="probe__row" ref={follow}>
          <div
            className="probe__main ai-text probe__taught"
            data-scope="part"
            role="group"
            aria-label={entry.kind === "gap" ? t.probe.taught(entry.question) : t.probe.intro}
          >
            <p className="ai-text__gloss">
              {entry.kind === "gap" ? t.probe.taught(entry.question) : t.probe.intro}
              <span className="probe__taught-topic"> · {entry.topic}</span>
            </p>
            <MessageText text={entry.text} points={[]} onPoint={undefined} />
            <p className="probe__check">
              <BookOpen className="probe__icon" aria-hidden="true" />
              {t.probe.checkCopy}
            </p>
          </div>
        </li>
      );
    case "ProbeCovered":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__covered">{t.probe.covered}</p>
          </div>
        </li>
      );
    case "AiMessage":
    case "Thinking":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main probe__say">
            <AiStep entry={entry} session={session} points={[]} onPoint={undefined} />
          </div>
        </li>
      );
    case "UserMessage":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main you">
            <p className="you__who">{t.session.you}</p>
            <p className="you__text">{entry.text}</p>
          </div>
        </li>
      );
    default:
      return null;
  }
}

/** The Reasoning with the words the judgment points at marked. */
function withQuote(text: string, quote: string | null): ReactNode {
  if (quote === null) return text;
  const at = text.indexOf(quote);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="probe__quote">{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

function AnswerView({
  answer,
  quote,
}: {
  readonly answer: Entry<"ProbeAnswer">;
  readonly quote: string | null;
}) {
  const t = useT();
  return (
    <div className="you probe__answer">
      {answer.teachMe ? <p className="probe__teach-me">{t.probe.teachMeAsked}</p> : null}
      {answer.reasoning === "" ? null : (
        <div>
          <p className="probe__part">{t.probe.reasoning}</p>
          <p className="you__text">{withQuote(answer.reasoning, quote)}</p>
        </div>
      )}
      {answer.answer === "" ? null : (
        <div className="probe__result">
          <p className="probe__part">{t.probe.answer}</p>
          <p className="you__text probe__result-text">{answer.answer}</p>
        </div>
      )}
    </div>
  );
}

const reasoningTone = (verdict: ReasoningVerdict) =>
  verdict === "sound" ? "good" : verdict === "none" ? "none" : "gap";
const resultTone = (verdict: ResultVerdict) => (verdict === "right" ? "good" : "gap");

function VerdictIcon({ tone }: { readonly tone: "good" | "gap" | "none" }) {
  switch (tone) {
    case "good":
      return <Check className="verdict__icon" aria-hidden="true" />;
    case "gap":
      return <TriangleAlert className="verdict__icon" aria-hidden="true" />;
    case "none":
      return <Minus className="verdict__icon" aria-hidden="true" />;
  }
}

/** The AI's judgment as a gloss in the margin: the Reasoning and the result, apart. */
function Judgment({ judgment }: { readonly judgment: Entry<"ProbeJudgment"> }) {
  const t = useT();
  const headingId = useId();
  return (
    <aside className="probe__gloss" aria-labelledby={headingId}>
      <p className="probe__gloss-head" id={headingId}>
        {t.probe.judged}
      </p>
      <div className="verdict" data-tone={reasoningTone(judgment.reasoning)}>
        <VerdictIcon tone={reasoningTone(judgment.reasoning)} />
        <div>
          <p className="verdict__name">{t.probe.reasoningVerdicts[judgment.reasoning]}</p>
          {judgment.reasoningWhy === "" ? null : (
            <p className="verdict__why">{judgment.reasoningWhy}</p>
          )}
        </div>
      </div>
      <div className="verdict" data-tone={resultTone(judgment.result)}>
        <VerdictIcon tone={resultTone(judgment.result)} />
        <div>
          <p className="verdict__name">{t.probe.resultVerdicts[judgment.result]}</p>
          {judgment.resultWhy === "" ? null : <p className="verdict__why">{judgment.resultWhy}</p>}
        </div>
      </div>
    </aside>
  );
}

const DICTATION = IS_MAC
  ? "mac"
  : typeof navigator !== "undefined" && /Windows/.test(navigator.userAgent)
    ? "windows"
    : "other";

/** The answer box at the foot: Reasoning (typed or dictated), the answer, then Send. */
function AnswerBox({ session }: { readonly session: Session }) {
  const t = useT();
  const reasoningId = useId();
  const reasoningHintId = useId();
  const answerId = useId();
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [failed, setFailed] = useState(false);
  const send = useAtomSet(answerProbeAtom, { mode: "promiseExit" });
  const stop = useAtomSet(stopSessionAtom);
  const open = openQuestion(session.entries);
  const ready = open !== null && !session.working;
  const canSend = ready && answer.trim() !== "";

  const submit = async (teachMe: boolean, event?: FormEvent) => {
    event?.preventDefault();
    if (open === null || !ready || (!teachMe && !canSend)) return;
    const exit = await send({
      payload: {
        id: session.id,
        question: open.number,
        reasoning,
        answer: teachMe ? "" : answer,
        teachMe,
      },
    });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) {
      setReasoning("");
      setAnswer("");
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit(false);
  };

  return (
    <form className="probe__box" onSubmit={(event) => submit(false, event)}>
      <div className="probe__box-in">
        <div className="probe__field">
          <label className="probe__label" htmlFor={reasoningId}>
            {t.probe.reasoning}
            {open === null ? null : (
              <span className="probe__for"> · {t.probe.question(open.number)}</span>
            )}
          </label>
          <p className="field__hint" id={reasoningHintId}>
            {t.probe.reasoningHint} {t.probe.dictate[DICTATION]}
          </p>
          <textarea
            className="composer__text probe__reasoning"
            id={reasoningId}
            aria-describedby={reasoningHintId}
            value={reasoning}
            onChange={(event) => setReasoning(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck
          />
        </div>
        <div className="probe__field">
          <label className="probe__label" htmlFor={answerId}>
            {t.probe.answer}
          </label>
          <input
            className="input"
            id={answerId}
            placeholder={t.probe.answerPlaceholder}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck
          />
          {failed ? (
            <Notice tone="error">
              <p>{t.probe.sendFailed}</p>
            </Notice>
          ) : null}
          <div className="probe__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={!canSend}
              aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
            >
              {t.probe.send}
              <kbd className="key" aria-hidden="true">
                {IS_MAC ? t.session.sendKey.mac : t.session.sendKey.other}
              </kbd>
            </button>
            {session.working ? (
              <button
                type="button"
                className="button"
                onClick={() => stop({ payload: { id: session.id } })}
              >
                {t.session.stop}
              </button>
            ) : (
              <button
                type="button"
                className="button button--quiet"
                disabled={!ready}
                onClick={() => void submit(true)}
              >
                {t.probe.teachMe}
              </button>
            )}
          </div>
          <p className="probe__plan">
            {open === null && !session.working ? `${t.probe.wait} ` : null}
            {t.chatgpt.usingPlan}. <ManageUsageLink />
          </p>
        </div>
      </div>
    </form>
  );
}

const STATE_ORDER: ReadonlyArray<TopicState> = [
  "known",
  "known-after-teaching",
  "taught",
  "gap",
  "asking",
];

/** What the Probe found, by topic, and the way on to the next step. */
function Findings({ session, source }: { readonly session: Session; readonly source: Source }) {
  const t = useT();
  const headingId = useId();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const advance = useAtomSet(advanceReadingAtom, { mode: "promiseExit" });
  const findings = probeFindings(session.entries);
  const next =
    nextReadingStep(source.readingStart, "probe") === "extraction" ? "extraction" : "done";

  const go = async () => {
    setBusy(true);
    const exit = await advance({
      payload: { id: source.id, from: "probe" },
      reactivityKeys: KEYS.sources,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <section className="probe__found" aria-labelledby={headingId} ref={followRow}>
      <h2 className="probe__found-title" id={headingId}>
        {t.probe.found}
      </h2>
      {findings.length === 0 ? (
        <p className="empty">{t.probe.foundEmpty}</p>
      ) : (
        <dl className="probe__found-list">
          {STATE_ORDER.map((state) => {
            const topics = findings.filter((finding) => finding.state === state);
            if (topics.length === 0) return null;
            const tone = state === "known" || state === "known-after-teaching" ? "good" : "gap";
            return (
              <div key={state} className="verdict" data-tone={state === "asking" ? "none" : tone}>
                <VerdictIcon tone={state === "asking" ? "none" : tone} />
                <div>
                  <dt className="verdict__name">{t.probe.states[state]}</dt>
                  <dd className="verdict__why">
                    {topics.map((finding) => finding.topic).join(" · ")}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      )}
      <p className="field__hint">{t.probe.keptIn(`Probes/${source.id}.md`)}</p>
      {source.readingStep === "probe" ? (
        <>
          {failed ? (
            <Notice tone="error">
              <p>{t.extraction.nextFailed}</p>
            </Notice>
          ) : null}
          <div className="button-row">
            <button type="button" className="button button--primary" disabled={busy} onClick={go}>
              {next === "extraction" ? t.probe.continueExtraction : t.probe.doneRead(source.title)}
            </button>
            <span className="status">
              {next === "extraction" ? t.probe.continueHint : t.probe.doneHint}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

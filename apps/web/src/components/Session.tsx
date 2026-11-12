import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  CHATGPT_USAGE_URL,
  type Point,
  type Session,
  type SessionEntry,
  type SessionTool,
  WIKILINK,
  parseWikilink,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { ChevronRight, X } from "lucide-react";
import {
  type FormEvent,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from "react";

import { useT } from "../i18n/I18n.tsx";
import { chatGptStatusAtom } from "../state/chatgpt.ts";
import {
  retrySessionAtom,
  sendMessageAtom,
  sessionAtom,
  stopSessionAtom,
} from "../state/sessions.ts";
import { CardProposals } from "./CardProposals.tsx";
import { ManageUsageLink } from "./ChatGptConnection.tsx";
import { Notice, Panel, SkeletonPanel, StorageProblem } from "./ui.tsx";

/** True once ChatGPT is connected and Glose may use the user's plan. */
export function useChatGptReady(): boolean {
  const status = useAtomValue(chatGptStatusAtom);
  return AsyncResult.getOrElse(
    AsyncResult.map(status, (value) => value._tag === "Connected" && value.planUsage),
    () => false,
  );
}

/** A Session cannot start without ChatGPT; this says where to connect it. */
export function NeedsChatGpt({ title, body }: { readonly title: string; readonly body: string }) {
  const t = useT();
  return (
    <Notice tone="info" title={title}>
      <p>{body}</p>
      <p style={{ marginTop: 10 }}>
        <Link to="/settings" className="button">
          {t.session.openSettings}
        </Link>
      </p>
    </Notice>
  );
}

interface SessionFrame {
  readonly title: string;
  readonly initial: "rubric" | "lapis";
  /** More ways to go on than a message, shown above the message box. */
  readonly renderControls?: (session: Session) => ReactNode;
}

/** A Session in a panel, with its transcript and message box (Card Extraction). */
export function LiveSession({ id, ...frame }: { readonly id: string } & SessionFrame) {
  const result = useAtomValue(sessionAtom(id));
  const refresh = useAtomRefresh(sessionAtom(id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => <SkeletonPanel />,
    onError: () => (
      <Panel title={frame.title} initial={frame.initial}>
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onDefect: () => (
      <Panel title={frame.title} initial={frame.initial}>
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onSuccess: ({ value }) => <SessionView session={value} {...frame} />,
  });
}

function SessionView({
  session,
  title,
  initial,
  renderControls,
}: { readonly session: Session } & SessionFrame) {
  const t = useT();
  return (
    <Panel
      title={title}
      initial={initial}
      meta={session.model === null ? undefined : t.session.model(session.model)}
    >
      <div className="panel__body stack">
        <Transcript session={session} />
        <SessionProblem session={session} />
        {renderControls?.(session)}
        <Composer session={session} />
      </div>
    </Panel>
  );
}

/** The Points of a Session, in the order they arrived. */
export const pointsOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<Point> =>
  entries.flatMap((entry) => (entry._tag === "Points" ? entry.points : []));

/** The number the user sees: `p3` is point 3. */
export const pointNumber = (point: Pick<Point, "id">): number => Number(point.id.slice(1));

type Turn =
  | { readonly from: "user"; readonly entry: SessionEntry }
  | { readonly from: "ai"; readonly entries: ReadonlyArray<SessionEntry> };

const isUserEntry = (entry: SessionEntry) =>
  entry._tag === "UserMessage" ||
  entry._tag === "Passage" ||
  (entry._tag === "Points" && entry.points.every((point) => point.origin === "user"));

/** Entries as turns: each user entry is one, and what the AI did between them is one. */
const turnsOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<Turn> => {
  const turns: Array<Turn> = [];
  for (const entry of entries) {
    const last = turns.at(-1);
    if (isUserEntry(entry)) turns.push({ from: "user", entry });
    else if (last?.from === "ai")
      turns[turns.length - 1] = { ...last, entries: [...last.entries, entry] };
    else turns.push({ from: "ai", entries: [entry] });
  }
  return turns;
};

type Step =
  | {
      readonly kind: "tools";
      readonly uses: ReadonlyArray<Extract<SessionEntry, { _tag: "ToolUse" }>>;
    }
  | { readonly kind: "entry"; readonly entry: SessionEntry };

/** One AI turn's entries, with each run of tool uses folded into one step. */
const stepsOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<Step> => {
  const steps: Array<Step> = [];
  for (const entry of entries) {
    const last = steps.at(-1);
    if (entry._tag !== "ToolUse") steps.push({ kind: "entry", entry });
    else if (last?.kind === "tools")
      steps[steps.length - 1] = { kind: "tools", uses: [...last.uses, entry] };
    else steps.push({ kind: "tools", uses: [entry] });
  }
  return steps;
};

interface TranscriptProps {
  readonly session: Session;
  /** Shows a Point the AI names, such as [3]. */
  readonly onPoint?: (point: string) => void;
}

/**
 * What the user and the AI said, in turns. What the AI read and thought folds into one quiet
 * line each, open on demand; while it works, one live line says what it does.
 */
export function Transcript({ session, onPoint }: TranscriptProps) {
  const t = useT();
  const turns = turnsOf(session.entries);
  const points = pointsOf(session.entries);
  const last = turns.at(-1);
  const liveInLast = session.working && last?.from === "ai";
  const live = session.working ? (
    <Live session={session} points={points} onPoint={onPoint} />
  ) : null;
  return (
    <ol className="transcript" aria-label={t.session.transcript}>
      {turns.map((turn, index) => {
        const isLast = index === turns.length - 1;
        return turn.from === "user" ? (
          // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so the position is the turn's identity.
          <li key={index} className="turn">
            <UserEntry entry={turn.entry} session={session} />
          </li>
        ) : (
          // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so the position is the turn's identity.
          <li key={index} className="turn" aria-busy={isLast && liveInLast ? true : undefined}>
            <p className="turn__who">{t.session.ai}</p>
            {stepsOf(turn.entries).map((step, stepIndex) => (
              // oxlint-disable-next-line react/no-array-index-key -- steps are only ever appended within a turn.
              <Fragment key={stepIndex}>
                {step.kind === "tools" ? (
                  <ToolUses uses={step.uses} />
                ) : (
                  <AiStep entry={step.entry} session={session} points={points} onPoint={onPoint} />
                )}
              </Fragment>
            ))}
            {isLast && liveInLast ? live : null}
          </li>
        );
      })}
      {session.working && !liveInLast ? (
        <li className="turn" aria-busy="true">
          <p className="turn__who">{t.session.ai}</p>
          {live}
        </li>
      ) : null}
    </ol>
  );
}

/** The AI's answer as it arrives, or else what it does now. */
function Live({
  session,
  points,
  onPoint,
}: {
  readonly session: Session;
  readonly points: ReadonlyArray<Point>;
  readonly onPoint: ((point: string) => void) | undefined;
}) {
  const t = useT();
  if (session.draft !== "") {
    return <MessageText text={session.draft} points={points} onPoint={onPoint} />;
  }
  const last = session.entries.at(-1);
  const tool = last?._tag === "ToolUse" ? last : null;
  return (
    <p className="live" role="status">
      {t.session.live(tool?.tool ?? null, tool?.detail)}
    </p>
  );
}

function UserEntry({
  entry,
  session,
}: {
  readonly entry: SessionEntry;
  readonly session: Session;
}) {
  const t = useT();
  switch (entry._tag) {
    case "UserMessage": {
      const about = pointsOf(session.entries).find((point) => point.id === entry.about);
      return (
        <div className="you">
          <p className="you__who">
            {about === undefined ? t.session.you : t.session.youAbout(pointNumber(about))}
          </p>
          <p className="you__text">{entry.text}</p>
        </div>
      );
    }
    case "Passage":
      return (
        <div className="you">
          <p className="you__who">{t.session.passage}</p>
          <blockquote className="you__text">{entry.text}</blockquote>
        </div>
      );
    case "Points":
      return (
        <p className="turn__note">
          {t.session.pointAdded} <PointRefs points={entry.points} />
        </p>
      );
    default:
      return null;
  }
}

function AiStep({
  entry,
  session,
  points,
  onPoint,
}: {
  readonly entry: SessionEntry;
  readonly session: Session;
  readonly points: ReadonlyArray<Point>;
  readonly onPoint: ((point: string) => void) | undefined;
}) {
  const t = useT();
  switch (entry._tag) {
    case "AiMessage":
      return <MessageText text={entry.text} points={points} onPoint={onPoint} />;
    case "Thinking":
      return (
        <details className="aside">
          <summary>
            <ChevronRight className="aside__chev" aria-hidden="true" />
            {t.session.thought(entry.ms)}
          </summary>
          <div className="aside__body">
            {paragraphs(entry.text).map((text, index) => (
              // oxlint-disable-next-line react/no-array-index-key -- the summary never changes once kept.
              <p key={index}>{withBold(text)}</p>
            ))}
          </div>
        </details>
      );
    case "Points":
      return (
        <p className="turn__note">
          {t.session.pointsProposed(entry.points.length)}{" "}
          <PointRefs points={entry.points} onPoint={onPoint} />
        </p>
      );
    case "CardProposals":
      return <CardProposals sessionId={session.id} proposals={entry.proposals} />;
    default:
      return null;
  }
}

function PointRefs({
  points,
  onPoint,
}: {
  readonly points: ReadonlyArray<Point>;
  readonly onPoint?: ((point: string) => void) | undefined;
}) {
  return (
    <span className="refs">
      {points.map((point) => (
        <PointRef key={point.id} point={point} onPoint={onPoint} />
      ))}
    </span>
  );
}

function PointRef({
  point,
  onPoint,
}: {
  readonly point: Point;
  readonly onPoint: ((point: string) => void) | undefined;
}) {
  const t = useT();
  const number = pointNumber(point);
  return onPoint === undefined ? (
    <span className="ref">{number}</span>
  ) : (
    <button
      type="button"
      className="ref"
      aria-label={t.session.pointRef(number)}
      title={point.title}
      onClick={() => onPoint(point.id)}
    >
      {number}
    </button>
  );
}

/** A run of tool uses as one quiet line; open, it lists each, with the Notes as links. */
function ToolUses({
  uses,
}: {
  readonly uses: ReadonlyArray<Extract<SessionEntry, { _tag: "ToolUse" }>>;
}) {
  const t = useT();
  const count = (tool: SessionTool) => uses.filter((use) => use.tool === tool).length;
  const summary = t.session.trailSummary({
    freeText: count("read-source") > 0,
    notes: new Set(uses.filter((use) => use.tool === "read-note").map((use) => use.detail ?? ""))
      .size,
    searches: count("search-graph"),
    sources: count("list-sources") > 0,
    cards: count("list-cards") > 0,
  });
  return (
    <details className="aside">
      <summary>
        <ChevronRight className="aside__chev" aria-hidden="true" />
        {summary}
      </summary>
      <ul className="aside__body">
        {uses.map((use, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- tool uses are only ever appended.
          <li key={index}>
            <ToolUseLine use={use} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function ToolUseLine({ use }: { readonly use: Extract<SessionEntry, { _tag: "ToolUse" }> }) {
  const t = useT();
  switch (use.tool) {
    case "read-source":
      return t.session.trail.readSource;
    case "list-sources":
      return t.session.trail.listSources;
    case "list-cards":
      return t.session.trail.listCards;
    case "search-graph":
      return use.detail === undefined
        ? t.session.tools["search-graph"]
        : t.session.trail.searchGraph(use.detail);
    case "read-note":
      return use.detail === undefined ? (
        t.session.tools["read-note"]
      ) : (
        <>
          {t.session.trail.readNote}{" "}
          <Link to="/graph" search={{ node: use.detail }} className="wikilink">
            {use.detail}
          </Link>
        </>
      );
  }
}

/** A summary's `**heading**` as bold words; nothing else of Markdown. */
const withBold = (text: string): ReadonlyArray<ReactNode> =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    // oxlint-disable-next-line react/no-array-index-key -- a kept summary never changes, so a part's place is its identity.
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
  );

const paragraphs = (text: string) =>
  text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

/** `[[Note]]` and a Point's number in brackets, such as `[3]`. */
const REFERENCE = new RegExp(`${WIKILINK.source}|\\[(\\d{1,3})\\]`, "g");

/**
 * The AI's words, with its wikilinks as links into the Graph and its Point numbers as buttons
 * that show the Point. A closing question stands out: it is what the AI asks the user.
 */
function MessageText({
  text,
  points,
  onPoint,
}: {
  readonly text: string;
  readonly points: ReadonlyArray<Point>;
  readonly onPoint: ((point: string) => void) | undefined;
}) {
  const all = paragraphs(text);
  return (
    <div className="say">
      {all.map((paragraph, index) => (
        <p
          // oxlint-disable-next-line react/no-array-index-key -- a message's paragraphs only grow at the end while it arrives.
          key={index}
          className={index === all.length - 1 && paragraph.endsWith("?") ? "say__ask" : undefined}
        >
          {references(paragraph, points, onPoint)}
        </p>
      ))}
    </div>
  );
}

const references = (
  text: string,
  points: ReadonlyArray<Point>,
  onPoint: ((point: string) => void) | undefined,
): ReadonlyArray<ReactNode> => {
  const out: Array<ReactNode> = [];
  let last = 0;
  for (const match of text.matchAll(REFERENCE)) {
    const point =
      match[2] === undefined ? undefined : points.find((other) => other.id === `p${match[2]}`);
    if (match[1] === undefined && point === undefined) continue;
    if (match.index > last) out.push(text.slice(last, match.index));
    if (point !== undefined) {
      out.push(<PointRef key={match.index} point={point} onPoint={onPoint} />);
    } else {
      const { target, label } = parseWikilink(match[1] ?? "");
      out.push(
        <Link key={match.index} to="/graph" search={{ node: target }} className="wikilink">
          {label}
        </Link>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

/** Why the last turn stopped, and the way on. */
export function SessionProblem({ session }: { readonly session: Session }) {
  const t = useT();
  const retry = useAtomSet(retrySessionAtom);
  if (session.problem === null) return null;
  return (
    <Notice tone="error">
      <p>{t.session.problems[session.problem]}</p>
      <p className="button-row" style={{ marginTop: 10 }}>
        {session.problem === "usage-limit" ? (
          <a
            className="button button--primary"
            href={CHATGPT_USAGE_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t.chatgpt.manageUsage}
          </a>
        ) : null}
        {session.problem === "not-connected" || session.problem === "plan-not-allowed" ? (
          <Link to="/settings" className="button">
            {t.session.openSettings}
          </Link>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => retry({ payload: { id: session.id } })}
        >
          {t.session.retry}
        </button>
      </p>
    </Notice>
  );
}

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The message box. A message may be about one Point, named above the box. */
export function Composer({
  session,
  about,
  onClearAbout,
}: {
  readonly session: Session;
  readonly about?: Point | undefined;
  readonly onClearAbout?: () => void;
}) {
  const t = useT();
  const textId = useId();
  const hintId = useId();
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });
  const stop = useAtomSet(stopSessionAtom);
  const canSend = !session.working && text.trim() !== "";

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const exit = await send({
      payload: { id: session.id, text, ...(about === undefined ? {} : { about: about.id }) },
    });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit();
  };

  return (
    <form className="composer" onSubmit={submit}>
      {about === undefined ? null : (
        <p className="composer__about">
          <span>
            {t.session.about}{" "}
            <strong>
              {pointNumber(about)} · {about.title}
            </strong>
          </span>
          {onClearAbout === undefined ? null : (
            <button
              type="button"
              className="composer__clear"
              aria-label={t.session.clearAbout}
              title={t.session.clearAbout}
              onClick={onClearAbout}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </p>
      )}
      <label className="sr-only" htmlFor={textId}>
        {t.session.messageLabel}
      </label>
      <textarea
        className="composer__text"
        id={textId}
        aria-describedby={hintId}
        placeholder={t.session.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck
      />
      <p className="sr-only" id={hintId}>
        {t.session.messageHint}
      </p>
      {failed ? (
        <Notice tone="error">
          <p>{t.session.sendFailed}</p>
        </Notice>
      ) : null}
      <div className="composer__row">
        <button
          type="submit"
          className="button button--primary"
          disabled={!canSend}
          aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
        >
          {t.session.send}
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
        ) : null}
        <span className="composer__plan">
          {t.chatgpt.usingPlan}. <ManageUsageLink />
        </span>
      </div>
    </form>
  );
}

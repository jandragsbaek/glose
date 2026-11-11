import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { CHATGPT_USAGE_URL, type Session, type SessionEntry } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from "react";

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
  const retry = useAtomSet(retrySessionAtom);
  return (
    <Panel
      title={title}
      initial={initial}
      meta={session.model === null ? undefined : t.session.model(session.model)}
    >
      <div className="panel__body stack">
        <ol className="session" aria-label={t.session.transcript}>
          {session.entries.map((entry, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so the position is the entry's identity.
            <Entry key={index} entry={entry} sessionId={session.id} />
          ))}
          {session.draft === "" ? null : (
            <Entry entry={{ _tag: "AiMessage", text: session.draft }} sessionId={session.id} />
          )}
        </ol>
        {session.working && session.draft === "" ? (
          <p className="status" role="status">
            {t.session.working}
          </p>
        ) : null}
        {session.problem === null ? null : (
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
        )}
        {renderControls?.(session)}
        <Composer session={session} />
      </div>
    </Panel>
  );
}

function Entry({ entry, sessionId }: { readonly entry: SessionEntry; readonly sessionId: string }) {
  const t = useT();
  switch (entry._tag) {
    case "UserMessage":
      return (
        <li className="session__entry" data-from="user">
          <p className="session__who">{t.session.you}</p>
          <p className="session__text">{entry.text}</p>
        </li>
      );
    case "AiMessage":
      return (
        <li className="session__entry" data-from="ai">
          <p className="session__who">{t.session.ai}</p>
          <p className="session__text">{entry.text}</p>
        </li>
      );
    case "ToolUse":
      return (
        <li className="session__entry" data-from="tool">
          <p className="field__hint">{t.session.tools[entry.tool]}</p>
        </li>
      );
    case "Passage":
      return (
        <li className="session__entry" data-from="user">
          <p className="session__who">{t.session.passage}</p>
          <blockquote className="session__text">{entry.text}</blockquote>
        </li>
      );
    case "CardProposals":
      return (
        <li className="session__entry" data-from="ai">
          <p className="session__who">{t.session.ai}</p>
          <CardProposals sessionId={sessionId} proposals={entry.proposals} />
        </li>
      );
  }
}

function Composer({ session }: { readonly session: Session }) {
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
    const exit = await send({ payload: { id: session.id, text } });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit();
  };

  return (
    <form className="field" onSubmit={submit}>
      <label className="field__label" htmlFor={textId}>
        {t.session.messageLabel}
      </label>
      <p className="field__hint" id={hintId}>
        {t.session.messageHint}
      </p>
      <textarea
        className="textarea textarea--short"
        id={textId}
        aria-describedby={hintId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck
      />
      {failed ? (
        <Notice tone="error">
          <p>{t.session.sendFailed}</p>
        </Notice>
      ) : null}
      <div className="button-row" style={{ marginTop: 8 }}>
        <button type="submit" className="button button--primary" disabled={!canSend}>
          {t.session.send}
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
        <span className="status">
          {t.chatgpt.usingPlan}. <ManageUsageLink />
        </span>
      </div>
    </form>
  );
}

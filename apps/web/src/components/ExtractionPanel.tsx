import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { CHATGPT_USAGE_URL, type Session, type SessionEntry, type Source } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { type FormEvent, type KeyboardEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { chatGptStatusAtom } from "../state/chatgpt.ts";
import {
  extractionSessionAtom,
  retrySessionAtom,
  SESSION_KEYS,
  sendMessageAtom,
  sessionAtom,
  startSessionAtom,
  stopSessionAtom,
} from "../state/sessions.ts";
import { ManageUsageLink } from "./ChatGptConnection.tsx";
import { Notice, Panel, SkeletonPanel, StorageProblem } from "./ui.tsx";

/** The Extraction step of the Reading Stage: a Session with the AI about this Source. */
export function ExtractionPanel({ source }: { readonly source: Source }) {
  const t = useT();
  const found = useAtomValue(extractionSessionAtom(source.id));
  const refresh = useAtomRefresh(extractionSessionAtom(source.id));
  return AsyncResult.matchWithError(found, {
    onInitial: () => <SkeletonPanel />,
    onError: () => (
      <Panel title={t.session.title} initial="lapis">
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onDefect: () => (
      <Panel title={t.session.title} initial="lapis">
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onSuccess: ({ value }) =>
      value === null ? <StartExtraction source={source} /> : <LiveSession id={value.id} />,
  });
}

function StartExtraction({ source }: { readonly source: Source }) {
  const t = useT();
  const status = useAtomValue(chatGptStatusAtom);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });
  const ready = AsyncResult.getOrElse(
    AsyncResult.map(status, (value) => value._tag === "Connected" && value.planUsage),
    () => false,
  );

  const begin = async () => {
    setBusy(true);
    const exit = await start({
      payload: { kind: "extraction", sourceId: source.id },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <Panel title={t.session.title} initial="lapis">
      <div className="panel__body stack">
        {ready ? (
          <>
            <p className="field__hint">{t.session.startHint}</p>
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
                {t.session.start}
              </button>
            </div>
          </>
        ) : (
          <Notice tone="info" title={t.session.needsChatGpt}>
            <p>{t.session.needsChatGptBody}</p>
            <p style={{ marginTop: 10 }}>
              <Link to="/settings" className="button">
                {t.session.openSettings}
              </Link>
            </p>
          </Notice>
        )}
      </div>
    </Panel>
  );
}

function LiveSession({ id }: { readonly id: string }) {
  const t = useT();
  const result = useAtomValue(sessionAtom(id));
  const refresh = useAtomRefresh(sessionAtom(id));
  return AsyncResult.matchWithError(result, {
    onInitial: () => <SkeletonPanel />,
    onError: () => (
      <Panel title={t.session.title} initial="lapis">
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onDefect: () => (
      <Panel title={t.session.title} initial="lapis">
        <div className="panel__body">
          <StorageProblem onRetry={refresh} />
        </div>
      </Panel>
    ),
    onSuccess: ({ value }) => <SessionView session={value} />,
  });
}

function SessionView({ session }: { readonly session: Session }) {
  const t = useT();
  const retry = useAtomSet(retrySessionAtom);
  return (
    <Panel
      title={t.session.title}
      initial="lapis"
      meta={session.model === null ? undefined : t.session.model(session.model)}
    >
      <div className="panel__body stack">
        <ol className="session" aria-label={t.session.transcript}>
          {session.entries.map((entry, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so the position is the entry's identity.
            <Entry key={index} entry={entry} />
          ))}
          {session.draft === "" ? null : (
            <Entry entry={{ _tag: "AiMessage", text: session.draft }} />
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
        <Composer session={session} />
      </div>
    </Panel>
  );
}

function Entry({ entry }: { readonly entry: SessionEntry }) {
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

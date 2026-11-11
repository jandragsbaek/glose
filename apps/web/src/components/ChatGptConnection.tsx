import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { CHATGPT_USAGE_URL, type ChatGptStatus } from "@glose/contracts";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  cancelChatGptAtom,
  chatGptStatusAtom,
  connectChatGptAtom,
  disconnectChatGptAtom,
} from "../state/chatgpt.ts";
import { Notice } from "./ui.tsx";

/** Opens ChatGPT's own usage page, where the user sees and limits what Glose uses. */
export function ManageUsageLink() {
  const t = useT();
  return (
    <a href={CHATGPT_USAGE_URL} target="_blank" rel="noreferrer">
      {t.chatgpt.manageUsage}
    </a>
  );
}

/** Connect, follow and end the ChatGPT connection. Used in the setup and in Settings. */
export function ChatGptConnection() {
  const t = useT();
  const status = useAtomValue(chatGptStatusAtom);
  return AsyncResult.matchWithError(status, {
    onInitial: () => <p className="status">{t.common.loading}</p>,
    onError: () => <Notice tone="error" title={t.chatgpt.unknown} />,
    onDefect: () => <Notice tone="error" title={t.chatgpt.unknown} />,
    onSuccess: ({ value }) => <StatusView status={value} />,
  });
}

type Outcome = "idle" | "busy" | "storage-failed" | "unconfirmed";

function StatusView({ status }: { readonly status: ChatGptStatus }) {
  const t = useT();
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const connect = useAtomSet(connectChatGptAtom, { mode: "promiseExit" });
  const cancel = useAtomSet(cancelChatGptAtom);
  const disconnect = useAtomSet(disconnectChatGptAtom, { mode: "promiseExit" });

  const start = async (account: "saved" | "new", consent: boolean) => {
    setOutcome("busy");
    const exit = await connect({ payload: { account, consent } });
    setOutcome(Exit.isSuccess(exit) ? "idle" : "storage-failed");
  };

  const end = async () => {
    setOutcome("busy");
    const exit = await disconnect({ payload: undefined });
    if (Exit.isFailure(exit)) setOutcome("storage-failed");
    else setOutcome(exit.value.revoked ? "idle" : "unconfirmed");
  };

  const busy = outcome === "busy";
  const notices = (
    <>
      {outcome === "storage-failed" ? (
        <Notice tone="error" title={t.errors.storage}>
          <p>{t.errors.storageRecovery}</p>
        </Notice>
      ) : null}
      {outcome === "unconfirmed" ? (
        <Notice tone="warning">
          <p>{t.chatgpt.disconnectUnconfirmed}</p>
        </Notice>
      ) : null}
    </>
  );

  switch (status._tag) {
    case "Disconnected":
      return (
        <div className="stack">
          {status.problem === null ? null : (
            <Notice tone="warning">
              <p>{t.chatgpt.problems[status.problem]}</p>
            </Notice>
          )}
          {notices}
          {status.email === null ? null : (
            <p className="field__hint">{t.chatgpt.lastAccount(status.email)}</p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => start(status.email === null ? "new" : "saved", false)}
            >
              {t.chatgpt.continue}
            </button>
            {status.email === null ? null : (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => start("new", false)}
              >
                {t.chatgpt.otherAccount}
              </button>
            )}
          </div>
        </div>
      );

    case "Connecting":
      return (
        <div className="stack">
          <Notice tone="info" title={t.chatgpt.connecting}>
            <p>{t.chatgpt.connectingHint}</p>
          </Notice>
          {notices}
          <div className="button-row">
            <a className="button" href={status.authorizeUrl} target="_blank" rel="noreferrer">
              {t.chatgpt.openAgain}
            </a>
            <button type="button" className="button" onClick={() => cancel({ payload: undefined })}>
              {t.chatgpt.cancel}
            </button>
          </div>
        </div>
      );

    case "Connected":
      return (
        <div className="stack">
          <p>{t.chatgpt.connected(status.email)}</p>
          {status.planUsage ? (
            <p className="field__hint">
              {t.chatgpt.usingPlan}. <ManageUsageLink />
            </p>
          ) : (
            <Notice tone="warning" title={t.chatgpt.planNotAllowedTitle}>
              <p>{t.chatgpt.planNotAllowed}</p>
            </Notice>
          )}
          {notices}
          <div className="button-row">
            {status.planUsage ? null : (
              <button
                type="button"
                className="button button--primary"
                disabled={busy}
                onClick={() => start("saved", true)}
              >
                {t.chatgpt.allowPlan}
              </button>
            )}
            <button type="button" className="button" disabled={busy} onClick={end}>
              {t.chatgpt.disconnect}
            </button>
          </div>
        </div>
      );
  }
}

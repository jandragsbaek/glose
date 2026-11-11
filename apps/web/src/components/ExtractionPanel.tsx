import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Source } from "@glose/contracts";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { extractionSessionAtom, SESSION_KEYS, startSessionAtom } from "../state/sessions.ts";
import { LiveSession, NeedsChatGpt, useChatGptReady } from "./Session.tsx";
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
      value === null ? (
        <StartExtraction source={source} />
      ) : (
        <LiveSession id={value.id} title={t.session.title} initial="lapis" />
      ),
  });
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
          <NeedsChatGpt title={t.session.needsChatGpt} body={t.session.needsChatGptBody} />
        )}
      </div>
    </Panel>
  );
}

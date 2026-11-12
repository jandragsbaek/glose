import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { VersionsStatus } from "@glose/contracts";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, GitCommitHorizontal, TriangleAlert } from "lucide-react";
import { type FormEvent, useId, useState, useSyncExternalStore } from "react";

import type { Messages } from "../i18n/en.ts";
import { useT } from "../i18n/I18n.tsx";
import { endDayAtom, versionsStatusAtom } from "../state/versions.ts";
import { remotePlace, useOpenBackup } from "./Backup.tsx";
import { Notice, Panel } from "./ui.tsx";

type On = Extract<VersionsStatus, { _tag: "On" }>;

const dayOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/** Today's local date as a key; it changes at midnight, checked once a minute. */
function useToday() {
  return useSyncExternalStore(
    (onChange) => {
      const timer = window.setInterval(onChange, 60_000);
      return () => window.clearInterval(timer);
    },
    () => dayOf(new Date()),
  );
}

/**
 * The running foot of the window, like the foot of a printed page: quiet status along the
 * bottom of the main column. Versions sit at its right end.
 */
export function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-bar__start" />
      <div className="status-bar__end">
        <VersionsItem />
      </div>
    </footer>
  );
}

function VersionsItem() {
  const t = useT();
  const panelId = useId();
  const result = useAtomValue(versionsStatusAtom);
  const status = AsyncResult.getOrElse(result, () => null);
  const today = useToday();
  if (status === null) return null;
  const problem = status._tag === "On" ? status.problem : null;
  return (
    <>
      <button
        type="button"
        className="status-bar__item"
        popoverTarget={panelId}
        title={t.versions.title}
      >
        <GitCommitHorizontal className="status-bar__icon" aria-hidden="true" />
        <span>{label(t, status, today)}</span>
        {status._tag === "On" && status.unsaved ? (
          <span className="status-bar__unsaved" title={t.versions.unsaved}>
            <span className="sr-only">{t.versions.unsaved}</span>
          </span>
        ) : null}
        {problem === null ? null : (
          <span className="status-bar__problem">
            <TriangleAlert className="status-bar__icon" aria-hidden="true" />
            {t.versions.problemsShort[problem]}
          </span>
        )}
      </button>
      <div id={panelId} popover="auto" className="status-panel">
        <Panel title={t.versions.title} initial="lapis">
          {status._tag === "Off" ? (
            <div className="panel__body">
              <p className="status-panel__off">{t.versions.offReasons[status.reason]}</p>
            </div>
          ) : (
            <VersionsDetails status={status} today={today} />
          )}
        </Panel>
      </div>
    </>
  );
}

function label(t: Messages, status: VersionsStatus, today: string) {
  if (status._tag === "Off") return t.versions.off;
  if (status.activity === "saving") return t.versions.saving;
  if (status.activity === "syncing") return t.versions.syncing;
  if (status.savedAt === null) return t.versions.notSavedYet;
  const at = new Date(status.savedAt);
  return t.versions.saved(at, dayOf(at) === today);
}

function VersionsDetails({ status, today }: { readonly status: On; readonly today: string }) {
  const t = useT();
  const synced = status.syncedAt === null ? null : new Date(status.syncedAt);
  const openBackup = useOpenBackup();
  return (
    <>
      <div className="panel__body">
        {status.problem === null ? null : (
          <div className="status-panel__problem">
            <Notice tone="warning" title={t.versions.problemsShort[status.problem]}>
              <p>{t.versions.problems[status.problem]}</p>
            </Notice>
          </div>
        )}
        <dl className="facts">
          <dt>{t.versions.changes}</dt>
          <dd>{status.unsaved ? t.versions.pending : t.versions.allSaved}</dd>
          <dt>{t.versions.remote}</dt>
          {status.remoteUrl === null ? (
            <dd className="status-panel__none">
              {t.versions.noRemote}{" "}
              <button type="button" className="link-button" onClick={() => openBackup("github")}>
                {t.backup.backUpToGitHub}
              </button>
            </dd>
          ) : (
            <dd className="status-panel__remote">{remotePlace(status.remoteUrl).label}</dd>
          )}
          {status.remoteUrl === null ? null : (
            <>
              <dt>{t.versions.sync}</dt>
              <dd>
                {synced === null
                  ? t.versions.notSynced
                  : t.versions.synced(synced, dayOf(synced) === today)}
                {status.unpushed > 0 ? <> {t.versions.unpushed(status.unpushed)}</> : null}
              </dd>
            </>
          )}
        </dl>
      </div>
      <div className="panel__body">
        <EndDayForm activity={status.activity} />
      </div>
    </>
  );
}

/** The day's last Version, named by the user: an active choice, not a timer. */
function EndDayForm({ activity }: { readonly activity: On["activity"] }) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const endDay = useAtomSet(endDayAtom, { mode: "promiseExit" });
  const [summary, setSummary] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const busy = state === "sending" || activity !== "idle";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    const exit = await endDay({ payload: { summary } });
    if (Exit.isSuccess(exit)) {
      setSummary("");
      setState("done");
    } else {
      setState("failed");
    }
  };

  return (
    <form className="status-panel__form" onSubmit={submit}>
      <label className="field__label" htmlFor={inputId}>
        {t.versions.summary}
      </label>
      <input
        id={inputId}
        className="input"
        value={summary}
        required
        aria-describedby={hintId}
        placeholder={t.versions.summaryPlaceholder}
        onChange={(event) => {
          setSummary(event.target.value);
          if (state === "done" || state === "failed") setState("idle");
        }}
      />
      <p className="field__hint" id={hintId}>
        {t.versions.endDayHint}
      </p>
      <div className="button-row">
        <button type="submit" className="button button--primary" disabled={busy}>
          {t.versions.endDay}
        </button>
        <span className="status-panel__result" role="status">
          {state === "sending" || activity !== "idle" ? (
            activity === "syncing" ? (
              t.versions.syncing
            ) : (
              t.versions.saving
            )
          ) : state === "done" ? (
            <>
              <Check className="status-panel__done" aria-hidden="true" />
              {t.versions.dayEnded}
            </>
          ) : null}
        </span>
      </div>
      {state === "failed" ? (
        <p className="field__error" role="alert">
          <TriangleAlert className="status-bar__icon" aria-hidden="true" />
          {t.errors.unexpected}
        </p>
      ) : null}
    </form>
  );
}

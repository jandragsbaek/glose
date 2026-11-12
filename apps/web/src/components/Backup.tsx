import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  DEFAULT_BACKUP_REPOSITORY,
  GITHUB_REPOSITORY_NAME,
  GITHUB_SIGNUP_URL,
  type GitHubStatus,
  type RemoteRefusedReason,
  type VersionsStatus,
} from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, CircleAlert, Copy, ExternalLink, TriangleAlert } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  cancelGitHubAtom,
  connectGitHubAtom,
  disconnectGitHubAtom,
  gitHubStatusAtom,
} from "../state/github.ts";
import {
  backUpToGitHubAtom,
  backupSheetAtom,
  type BackupSheetMode,
  removeRemoteAtom,
  setRemoteAtom,
  versionsStatusAtom,
} from "../state/versions.ts";
import { Flourish, Notice, Panel } from "./ui.tsx";

type On = Extract<VersionsStatus, { _tag: "On" }>;

const dayOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const isToday = (date: Date) => dayOf(date) === dayOf(new Date());

/**
 * Where a remote is, as the user would say it: `github.com/jan/glose-graph`, with a link to the
 * repository's page when it is on GitHub.
 */
export const remotePlace = (url: string): { label: string; href: string | null } => {
  const github =
    /^https:\/\/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i.exec(url) ??
    /^(?:ssh:\/\/)?git@github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/i.exec(url);
  if (github) {
    return { label: `github.com/${github[1]}`, href: `https://github.com/${github[1]}` };
  }
  return { label: url.replace(/^https?:\/\//i, ""), href: null };
};

function Place({ url }: { readonly url: string }) {
  const place = remotePlace(url);
  return place.href === null ? (
    <span className="backup__place">{place.label}</span>
  ) : (
    <a className="backup__place" href={place.href} target="_blank" rel="noreferrer">
      {place.label}
    </a>
  );
}

/** A GitHub remote over HTTPS: git signs in to it with the GitHub connection. */
const usesGitHubSignIn = (url: string) => /^https:\/\/github\.com\//i.test(url);

/** The refusal a mutation failed with, or null for any other failure. */
const refusalOf = (exit: Exit.Exit<unknown, unknown>): RemoteRefusedReason | null => {
  if (Exit.isSuccess(exit)) return null;
  const error = Cause.findErrorOption(exit.cause);
  return Option.isSome(error) &&
    typeof error.value === "object" &&
    error.value !== null &&
    "_tag" in error.value &&
    error.value._tag === "RemoteRefused" &&
    "reason" in error.value
    ? (error.value.reason as RemoteRefusedReason)
    : null;
};

function useVersions() {
  return AsyncResult.getOrElse(useAtomValue(versionsStatusAtom), () => null);
}

function useGitHub() {
  return AsyncResult.getOrElse(useAtomValue(gitHubStatusAtom), () => null);
}

/** Opens the Backup sheet; Settings and the status bar's Versions panel both use it. */
export function useOpenBackup() {
  const setSheet = useAtomSet(backupSheetAtom);
  return (mode: BackupSheetMode) => setSheet(mode);
}

/**
 * The Backup panel in Settings: a short ledger of where the Graph's Versions are. Setting a
 * backup up happens once, in the Backup sheet.
 */
export function BackupPanel() {
  const t = useT();
  const status = useVersions();
  return (
    <Panel title={t.backup.title} initial="rubric">
      <div className="panel__body">
        {status === null ? (
          <p className="status">{t.common.loading}</p>
        ) : status._tag === "Off" ? (
          <p className="empty">{t.versions.offReasons[status.reason]}</p>
        ) : status.remoteUrl === null ? (
          <NotBackedUp status={status} />
        ) : (
          <BackedUp status={status} remoteUrl={status.remoteUrl} />
        )}
      </div>
    </Panel>
  );
}

function NotBackedUp({ status }: { readonly status: On }) {
  const t = useT();
  const open = useOpenBackup();
  const saved = status.savedAt === null ? null : new Date(status.savedAt);
  return (
    <>
      <dl className="facts">
        <dt>{t.backup.versions}</dt>
        <dd>{t.backup.onlyHere}</dd>
        <dt>{t.backup.lastSaved}</dt>
        <dd>{saved === null ? t.versions.notSavedYet : t.backup.savedAt(saved, isToday(saved))}</dd>
      </dl>
      <p className="inline-warning">
        <TriangleAlert className="notice__icon" aria-hidden="true" />
        <span>{t.backup.risk}</span>
      </p>
      <div className="button-row backup__actions">
        <button type="button" className="button button--primary" onClick={() => open("github")}>
          {t.backup.backUpToGitHub}
        </button>
        <button type="button" className="button button--quiet" onClick={() => open("remote")}>
          {t.backup.useRemote}
        </button>
      </div>
    </>
  );
}

function BackedUp({ status, remoteUrl }: { readonly status: On; readonly remoteUrl: string }) {
  const t = useT();
  const github = useGitHub();
  const disconnect = useAtomSet(disconnectGitHubAtom);
  const open = useOpenBackup();
  const remove = useAtomSet(removeRemoteAtom, { mode: "promiseExit" });
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const synced = status.syncedAt === null ? null : new Date(status.syncedAt);

  const stop = async () => {
    setBusy(true);
    await remove({ payload: undefined });
    setBusy(false);
    setAsking(false);
  };

  return (
    <>
      {status.problem === null ? null : (
        <div className="backup__problem">
          <Notice tone="warning" title={t.versions.problemsShort[status.problem]}>
            <p>{t.versions.problems[status.problem]}</p>
          </Notice>
        </div>
      )}
      <dl className="facts">
        <dt>{t.backup.backedUpTo}</dt>
        <dd>
          <Place url={remoteUrl} />
        </dd>
        <dt>{t.backup.lastSync}</dt>
        <dd>
          {synced === null ? t.versions.notSynced : t.backup.savedAt(synced, isToday(synced))}
          {status.unpushed > 0 ? <> {t.versions.unpushed(status.unpushed)}</> : null}
        </dd>
        {github?._tag === "Connected" ? (
          <>
            <dt>{t.backup.github}</dt>
            <dd className="backup__account">
              {github.login}
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => disconnect({ payload: undefined })}
              >
                {t.backup.disconnectGitHub}
              </button>
            </dd>
          </>
        ) : usesGitHubSignIn(remoteUrl) && github?._tag === "Disconnected" ? (
          <>
            <dt>{t.backup.github}</dt>
            <dd className="backup__account">
              {t.backup.notConnected}
              <button type="button" className="link-button" onClick={() => open("github")}>
                {t.backup.connect}
              </button>
            </dd>
          </>
        ) : null}
      </dl>
      {asking ? (
        <div className="backup__confirm" role="group" aria-label={t.backup.stop}>
          <p>{t.backup.stopQuestion(remotePlace(remoteUrl).label)}</p>
          <div className="button-row">
            <button type="button" className="button" disabled={busy} onClick={stop}>
              {t.backup.stop}
            </button>
            <button
              type="button"
              className="button button--quiet"
              autoFocus
              onClick={() => setAsking(false)}
            >
              {t.backup.keep}
            </button>
          </div>
        </div>
      ) : (
        <div className="button-row backup__actions">
          <button type="button" className="button button--quiet" onClick={() => setAsking(true)}>
            {t.backup.stop}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * The Backup sheet: a modal leaf over the page that sets a backup up, once. It lives beside the
 * status bar, so Settings and the Versions panel open the same sheet.
 */
export function BackupSheet() {
  const [mode, setMode] = useAtom(backupSheetAtom);
  return mode === null ? null : <Sheet mode={mode} onClose={() => setMode(null)} />;
}

function Sheet({
  mode,
  onClose,
}: {
  readonly mode: BackupSheetMode;
  readonly onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const github = useGitHub();
  const versions = useVersions();
  const cancel = useAtomSet(cancelGitHubAtom);
  const [chosenDone, setDone] = useState(false);
  // Signing in again for a GitHub remote set before the sheet opened is all the sheet had to do.
  // A remote the sheet itself adds counts only once its backup succeeds.
  const [hadGitHubRemote] = useState(
    () =>
      versions?._tag === "On" &&
      versions.remoteUrl !== null &&
      usesGitHubSignIn(versions.remoteUrl),
  );
  const reconnected = mode === "github" && hadGitHubRemote && github?._tag === "Connected";
  const done = chosenDone || reconnected;

  const close = () => {
    if (github?._tag === "Connecting") cancel({ payload: undefined });
    onClose();
  };

  const step = mode === "github" && !done ? (github?._tag === "Connected" ? 2 : 1) : null;

  return (
    <dialog
      className="sheet"
      aria-labelledby={titleId}
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="panel" data-initial="rubric">
        <div className="panel__head">
          <h2 className="panel__title" id={titleId}>
            {mode === "github" ? t.backup.backUpToGitHub : t.backup.useRemote}
          </h2>
          {step === null ? null : <span className="panel__meta">{t.backup.step(step, 2)}</span>}
        </div>
        <div className="panel__rule" aria-hidden="true">
          <Flourish />
        </div>
        <div className="panel__body sheet__body">
          {done ? (
            <Done mode={mode} onClose={onClose} />
          ) : mode === "remote" ? (
            <RemoteForm onDone={() => setDone(true)} onCancel={close} />
          ) : github === null ? (
            <p className="status">{t.common.loading}</p>
          ) : github._tag === "Connected" ? (
            <RepositoryForm login={github.login} onDone={() => setDone(true)} onCancel={close} />
          ) : (
            <ConnectStep status={github} onCancel={close} />
          )}
        </div>
      </div>
    </dialog>
  );
}

function SheetFoot({ children }: { readonly children: ReactNode }) {
  return <div className="button-row sheet__foot">{children}</div>;
}

function ConnectStep({
  status,
  onCancel,
}: {
  readonly status: Exclude<GitHubStatus, { _tag: "Connected" }>;
  readonly onCancel: () => void;
}) {
  const t = useT();
  const connect = useAtomSet(connectGitHubAtom);
  const setSheet = useAtomSet(backupSheetAtom);

  if (status._tag === "Unavailable") {
    return (
      <>
        <p>{t.backup.unavailable}</p>
        <SheetFoot>
          <button
            type="button"
            className="button button--primary"
            autoFocus
            onClick={() => setSheet("remote")}
          >
            {t.backup.useRemote}
          </button>
          <button type="button" className="button button--quiet" onClick={onCancel}>
            {t.backup.cancel}
          </button>
        </SheetFoot>
      </>
    );
  }

  if (status._tag === "Connecting") {
    return (
      <>
        <p>{t.backup.codeIntro}</p>
        <CodeRow code={status.userCode} />
        <p className="live backup__waiting" role="status">
          {t.backup.waiting}
        </p>
        <SheetFoot>
          <a className="button" href={status.verificationUri} target="_blank" rel="noreferrer">
            <ExternalLink className="button__icon" aria-hidden="true" />
            {t.backup.openAgain}
          </a>
          <button type="button" className="button button--quiet sheet__cancel" onClick={onCancel}>
            {t.backup.cancel}
          </button>
        </SheetFoot>
      </>
    );
  }

  return (
    <>
      <p>{t.backup.intro}</p>
      {status.problem === null ? null : (
        <Notice tone="warning">
          <p>{t.backup.problems[status.problem]}</p>
        </Notice>
      )}
      <SheetFoot>
        <button
          type="button"
          className="button button--primary"
          autoFocus
          onClick={() => connect({ payload: undefined })}
        >
          {t.backup.connect}
        </button>
        <span className="backup__signup">
          {t.backup.noAccount}{" "}
          <a href={GITHUB_SIGNUP_URL} target="_blank" rel="noreferrer">
            {t.backup.createAccount}
          </a>
        </span>
        <button type="button" className="button button--quiet sheet__cancel" onClick={onCancel}>
          {t.backup.cancel}
        </button>
      </SheetFoot>
    </>
  );
}

/** The code the user types on GitHub, typed like a label, with a way to copy it. */
function CodeRow({ code }: { readonly code: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="backup__code-row">
      <span className="backup__code" aria-label={`${t.backup.code}: ${code.split("").join(" ")}`}>
        {code}
      </span>
      <button
        type="button"
        className="button"
        autoFocus
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? (
          <Check className="button__icon backup__copied" aria-hidden="true" />
        ) : (
          <Copy className="button__icon" aria-hidden="true" />
        )}
        {copied ? t.backup.copied : t.backup.copy}
      </button>
    </div>
  );
}

function RefusedLine({
  id,
  reason,
}: {
  readonly id: string;
  readonly reason: RemoteRefusedReason | "failed";
}) {
  const t = useT();
  return (
    <p className="field__error" id={id} role="alert">
      <CircleAlert className="call__icon" aria-hidden="true" />
      {reason === "failed" ? t.errors.unexpected : t.backup.refused[reason]}
    </p>
  );
}

function RepositoryForm({
  login,
  onDone,
  onCancel,
}: {
  readonly login: string;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const backUp = useAtomSet(backUpToGitHubAtom, { mode: "promiseExit" });
  const disconnect = useAtomSet(disconnectGitHubAtom);
  const [name, setName] = useState(DEFAULT_BACKUP_REPOSITORY);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<RemoteRefusedReason | "failed" | "invalid" | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!GITHUB_REPOSITORY_NAME.test(trimmed)) return setProblem("invalid");
    setBusy(true);
    setProblem(null);
    const exit = await backUp({ payload: { name: trimmed } });
    setBusy(false);
    if (Exit.isSuccess(exit)) onDone();
    else setProblem(refusalOf(exit) ?? "failed");
  };

  return (
    <form className="sheet__form" onSubmit={submit} noValidate>
      <p>
        {t.backup.signedIn(login)}{" "}
        <button
          type="button"
          className="link-button"
          onClick={() => disconnect({ payload: undefined })}
        >
          {t.backup.otherAccount}
        </button>
      </p>
      <div className="field">
        <label className="field__label" htmlFor={inputId}>
          {t.backup.repository}
        </label>
        <input
          id={inputId}
          className="input backup__name"
          value={name}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={problem === null ? undefined : true}
          aria-describedby={problem === null ? hintId : `${errorId} ${hintId}`}
          onChange={(event) => {
            setName(event.target.value);
            if (problem !== null) setProblem(null);
          }}
        />
        {problem === null ? null : problem === "invalid" ? (
          <p className="field__error" id={errorId} role="alert">
            <CircleAlert className="call__icon" aria-hidden="true" />
            {t.backup.repositoryInvalid}
          </p>
        ) : (
          <RefusedLine id={errorId} reason={problem} />
        )}
        <p className="field__hint" id={hintId}>
          {t.backup.repositoryHint}
        </p>
      </div>
      <SheetFoot>
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? t.backup.backingUp : t.backup.backUp}
        </button>
        <button type="button" className="button button--quiet sheet__cancel" onClick={onCancel}>
          {t.backup.cancel}
        </button>
      </SheetFoot>
    </form>
  );
}

function RemoteForm({
  onDone,
  onCancel,
}: {
  readonly onDone: () => void;
  readonly onCancel: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const setRemote = useAtomSet(setRemoteAtom, { mode: "promiseExit" });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<RemoteRefusedReason | "failed" | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (url.trim() === "") return;
    setBusy(true);
    setProblem(null);
    const exit = await setRemote({ payload: { url: url.trim() } });
    setBusy(false);
    if (Exit.isSuccess(exit)) onDone();
    else setProblem(refusalOf(exit) ?? "failed");
  };

  return (
    <form className="sheet__form" onSubmit={submit}>
      <p>{t.backup.remoteIntro}</p>
      <div className="field">
        <label className="field__label" htmlFor={inputId}>
          {t.backup.remoteUrl}
        </label>
        <input
          id={inputId}
          className="input"
          value={url}
          required
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          placeholder={t.backup.remotePlaceholder}
          aria-invalid={problem === null ? undefined : true}
          aria-describedby={problem === null ? hintId : `${errorId} ${hintId}`}
          onChange={(event) => {
            setUrl(event.target.value);
            if (problem !== null) setProblem(null);
          }}
        />
        {problem === null ? null : <RefusedLine id={errorId} reason={problem} />}
      </div>
      <SheetFoot>
        <button
          type="submit"
          className="button button--primary"
          disabled={busy || url.trim() === ""}
        >
          {busy ? t.backup.checking : t.backup.useThisRemote}
        </button>
        <button type="button" className="button button--quiet sheet__cancel" onClick={onCancel}>
          {t.backup.cancel}
        </button>
      </SheetFoot>
    </form>
  );
}

function Done({ mode, onClose }: { readonly mode: BackupSheetMode; readonly onClose: () => void }) {
  const t = useT();
  const status = useVersions();
  const url = status?._tag === "On" ? status.remoteUrl : null;
  return (
    <>
      <p className="backup__done" role="status">
        <Check className="backup__done-icon" aria-hidden="true" />
        <span>{mode === "github" ? t.backup.done : t.backup.remoteDone}</span>
      </p>
      {url === null ? null : (
        <p className="backup__done-place">
          <Place url={url} />
        </p>
      )}
      <SheetFoot>
        <button type="button" className="button button--primary" autoFocus onClick={onClose}>
          {t.backup.close}
        </button>
      </SheetFoot>
    </>
  );
}

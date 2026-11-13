import { useAtomSet } from "@effect/atom-react";
import type {
  GraphFolderAction,
  GraphRemoteUnavailableReason,
  Language,
  SettingsView,
} from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { I18nProvider, LANGUAGES, useT } from "../i18n/I18n.tsx";
import type { Messages } from "../i18n/en.ts";
import { completeSetupAtom, KEYS } from "../state/graph.ts";
import { remotePlace } from "./Backup.tsx";
import { ChatGptConnection } from "./ChatGptConnection.tsx";
import {
  type ChosenRemote,
  RemoteGraphSheet,
  remoteFailureOf,
  type RemoteSheetMode,
} from "./RemoteGraphSheet.tsx";
import { Notice, Panel } from "./ui.tsx";

type FolderError = keyof Messages["setup"]["folderErrors"] | "storage";
type RemoteError = GraphRemoteUnavailableReason | "missing";

const FOLDER_ACTIONS: ReadonlyArray<GraphFolderAction> = ["create", "open", "clone"];

/**
 * The first start: language, Graph folder, and an optional ChatGPT connection. The Graph is a
 * new one, a folder on this computer, or a copy of one kept on GitHub or another git remote.
 */
export function Setup({
  view,
  initialLanguage,
}: {
  readonly view: SettingsView;
  readonly initialLanguage: Language;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  return (
    <I18nProvider language={language}>
      <SetupForm view={view} language={language} onLanguage={setLanguage} />
    </I18nProvider>
  );
}

function SetupForm({
  view,
  language,
  onLanguage,
}: {
  readonly view: SettingsView;
  readonly language: Language;
  readonly onLanguage: (language: Language) => void;
}) {
  const t = useT();
  const folderId = useId();
  const errorId = useId();
  const remoteErrorId = useId();
  const [action, setAction] = useState<GraphFolderAction>("create");
  const [folder, setFolder] = useState(view.suggestedGraphFolder);
  const [error, setError] = useState<FolderError | null>(null);
  const [remote, setRemote] = useState<ChosenRemote | null>(null);
  const [remoteError, setRemoteError] = useState<RemoteError | null>(null);
  const [sheet, setSheet] = useState<RemoteSheetMode | null>(null);
  // The button that opened the sheet gets focus back when it closes.
  const opener = useRef<HTMLButtonElement | null>(null);
  const openSheet = (mode: RemoteSheetMode, from: HTMLButtonElement) => {
    opener.current = from;
    setSheet(mode);
  };
  const closeSheet = () => {
    // The sheet leaves the page first: while a modal is open, nothing outside it takes focus.
    flushSync(() => setSheet(null));
    opener.current?.focus();
  };
  const [busy, setBusy] = useState(false);
  const completeSetup = useAtomSet(completeSetupAtom, { mode: "promiseExit" });
  const cloning = action === "clone";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cloning && remote === null) return setRemoteError("missing");
    setBusy(true);
    const exit = await completeSetup({
      payload: {
        language,
        graphFolder: folder,
        action,
        ...(cloning && remote !== null ? { remote: remote.url } : {}),
      },
      reactivityKeys: KEYS.settings,
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) return;
    const remoteFailure = remoteFailureOf(exit);
    if (remoteFailure !== null) return setRemoteError(remoteFailure);
    const failure = Cause.findErrorOption(exit.cause);
    setError(
      Option.isSome(failure) && failure.value._tag === "GraphFolderUnavailable"
        ? failure.value.reason
        : "storage",
    );
  };

  return (
    <div className="setup">
      <div className="setup__band">
        <span className="call">{t.app.mark}</span>
      </div>
      <main className="setup__body">
        <h1 className="setup__title">{t.setup.title}</h1>
        <p className="setup__intro">{t.setup.intro}</p>
        <form className="form" onSubmit={submit}>
          <Panel title={t.setup.languageStep} initial="rubric">
            <div className="panel__body">
              <fieldset className="fieldset" style={{ display: "block" }}>
                <legend className="sr-only">{t.setup.languageStep}</legend>
                <p className="field__hint" style={{ marginBottom: 12 }}>
                  {t.setup.languageHint}
                </p>
                <div className="choice-list">
                  {LANGUAGES.map((option) => (
                    <label key={option} className="choice">
                      <input
                        type="radio"
                        name="setup-language"
                        value={option}
                        checked={language === option}
                        onChange={() => onLanguage(option)}
                      />
                      <span lang={option}>{t.languages[option]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Panel>

          <Panel title={t.setup.folderStep} initial="lapis">
            <div className="panel__body field">
              <p className="field__hint">{t.setup.folderHint}</p>
              <fieldset className="fieldset" style={{ display: "block" }}>
                <legend className="sr-only">{t.setup.folderStep}</legend>
                <div className="choice-list">
                  {FOLDER_ACTIONS.map((option) => (
                    <label key={option} className="choice">
                      <input
                        type="radio"
                        name="setup-folder-action"
                        value={option}
                        checked={action === option}
                        onChange={() => {
                          setAction(option);
                          setError(null);
                          setRemoteError(null);
                        }}
                      />
                      <span>{t.setup.folderActions[option]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {cloning ? (
                <RemoteLedger
                  remote={remote}
                  error={remoteError}
                  errorId={remoteErrorId}
                  onOpen={openSheet}
                />
              ) : null}
              <label className="field__label" htmlFor={folderId}>
                {t.setup.folderLabel}
              </label>
              <p className="field__hint">{t.setup.folderActionHints[action]}</p>
              <input
                id={folderId}
                className="input"
                value={folder}
                onChange={(event) => {
                  setFolder(event.target.value);
                  setError(null);
                }}
                required
                spellCheck={false}
                autoComplete="off"
                aria-invalid={error !== null && error !== "storage"}
                aria-describedby={error === null ? undefined : errorId}
              />
              {error === null || error === "storage" ? null : (
                <p className="field__error" id={errorId}>
                  <CircleAlert className="call__icon" aria-hidden="true" />
                  {t.setup.folderErrors[error]}
                </p>
              )}
            </div>
          </Panel>

          <Panel title={t.setup.chatgptStep} initial="rubric">
            <div className="panel__body stack">
              <p className="field__hint">{t.chatgpt.intro}</p>
              <p className="field__hint">{t.setup.chatgptHint}</p>
              <ChatGptConnection />
            </div>
          </Panel>

          {error === "storage" ? (
            <Notice tone="error" title={t.errors.storage}>
              <p id={errorId}>{t.errors.storageRecovery}</p>
            </Notice>
          ) : null}

          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy && cloning ? t.setup.copying : t.setup.submit}
            </button>
            {busy && cloning ? (
              <span className="live setup__copying" role="status">
                {t.setup.remote.copyingNote}
              </span>
            ) : null}
          </div>
        </form>
      </main>
      {sheet === null ? null : (
        <RemoteGraphSheet
          mode={sheet}
          onMode={setSheet}
          onClose={closeSheet}
          onChoose={(chosen) => {
            setRemote(chosen);
            setRemoteError(null);
            closeSheet();
          }}
        />
      )}
    </div>
  );
}

/**
 * Where the copy comes from, as a short ledger; choosing happens in the sheet. Before a choice the
 * way to GitHub is the next step, so it is the primary button.
 */
function RemoteLedger({
  remote,
  error,
  errorId,
  onOpen,
}: {
  readonly remote: ChosenRemote | null;
  readonly error: RemoteError | null;
  readonly errorId: string;
  readonly onOpen: (mode: RemoteSheetMode, from: HTMLButtonElement) => void;
}) {
  const t = useT();
  const repository = remote?.repository ?? null;
  return (
    <div className="setup__remote">
      <dl className="facts">
        <dt>{t.setup.remote.from}</dt>
        <dd>
          {remote === null ? (
            <span className="setup__unset">{t.setup.remote.notChosen}</span>
          ) : (
            <>
              <span className="backup__place">{remotePlace(remote.url).label}</span>
              {repository === null ? null : " "}
              {repository === null ? null : (
                <span className="setup__owner">
                  {repository.shared
                    ? t.setup.remote.sharedBy(repository.owner)
                    : t.setup.remote.yours}
                </span>
              )}
            </>
          )}
        </dd>
      </dl>
      {remote === null ? null : <p className="field__hint">{t.setup.remote.backupNote}</p>}
      {error === null ? null : (
        <p className="field__error" id={errorId} role="alert">
          <CircleAlert className="call__icon" aria-hidden="true" />
          {error === "missing"
            ? t.setup.remote.missing
            : error === "unreachable" && repository !== null
              ? t.setup.remote.gitHubFailed
              : t.setup.remote.errors[error]}
        </p>
      )}
      <div className="button-row backup__actions setup__remote-actions">
        <button
          type="button"
          className={remote === null ? "button button--primary" : "button"}
          aria-describedby={error === null ? undefined : errorId}
          onClick={(event) => onOpen("github", event.currentTarget)}
        >
          {remote === null ? t.setup.remote.choose : t.setup.remote.chooseAgain}
        </button>
        <button
          type="button"
          className="button button--quiet"
          onClick={(event) => onOpen("remote", event.currentTarget)}
        >
          {t.setup.remote.useRemote}
        </button>
      </div>
    </div>
  );
}

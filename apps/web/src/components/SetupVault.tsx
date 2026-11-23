import { useAtomSet } from "@effect/atom-react";
import type {
  Language,
  SettingsView,
  VaultFolderAction,
  VaultRemoteUnavailableReason,
} from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert, FolderClosed, FolderOpen } from "lucide-react";
import { type FormEvent, type RefObject, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import {
  type FolderPlace,
  folderIn,
  folderPlace,
  lastName,
  parentOf,
} from "../domain/folderPlace.ts";
import { useT } from "../i18n/I18n.tsx";
import type { Messages } from "../i18n/en.ts";
import { openVaultAtom } from "../state/vault.ts";
import { remotePlace } from "./Backup.tsx";
import {
  type ChosenRemote,
  RemoteVaultSheet,
  remoteFailureOf,
  type RemoteSheetMode,
} from "./RemoteVaultSheet.tsx";
import { MoreDetails } from "./textImport.tsx";
import { Notice, Panel } from "./ui.tsx";

export interface Vault {
  readonly folder: string;
  readonly sources: number;
}

type FolderError = keyof Messages["setup"]["folderErrors"] | "needed" | "storage";
type RemoteError = VaultRemoteUnavailableReason | "missing";

const FOLDER_ACTIONS: ReadonlyArray<VaultFolderAction> = ["create", "open", "clone"];

export function VaultStep({
  view,
  language,
  vault,
  onVault,
  onBusy,
  onBack,
  onNext,
}: {
  readonly view: SettingsView;
  readonly language: Language;
  readonly vault: Vault | null;
  readonly onVault: (vault: Vault) => void;
  readonly onBusy: (busy: boolean) => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  const t = useT();
  const next = useRef<HTMLButtonElement>(null);
  const opened = (chosen: Vault) => {
    flushSync(() => onVault(chosen));
    next.current?.focus();
  };
  return (
    <Panel title={t.setup.steps.vault} initial="accent">
      {vault === null ? (
        <VaultForm
          view={view}
          language={language}
          onVault={opened}
          onBusy={onBusy}
          onBack={onBack}
        />
      ) : (
        <VaultChosen
          vault={vault}
          home={parentOf(view.suggestedVaultFolder)}
          nextRef={next}
          onBack={onBack}
          onNext={onNext}
        />
      )}
    </Panel>
  );
}

function VaultForm({
  view,
  language,
  onVault,
  onBusy,
  onBack,
}: {
  readonly view: SettingsView;
  readonly language: Language;
  readonly onVault: (vault: Vault) => void;
  readonly onBusy: (busy: boolean) => void;
  readonly onBack: () => void;
}) {
  const t = useT();
  const folderId = useId();
  const hintId = useId();
  const errorId = useId();
  const remoteErrorId = useId();
  const [action, setAction] = useState<VaultFolderAction>("create");
  const suggested = view.suggestedVaultFolder;
  const home = parentOf(suggested);
  const [places, setPlaces] = useState<Record<VaultFolderAction, string>>({
    create: suggested,
    open: "",
    clone: suggested,
  });
  const folder = places[action];
  const setFolder = (next: string) => setPlaces((all) => ({ ...all, [action]: next }));
  const [error, setError] = useState<FolderError | null>(null);
  const [remote, setRemote] = useState<ChosenRemote | null>(null);
  const [remoteError, setRemoteError] = useState<RemoteError | null>(null);
  const [sheet, setSheet] = useState<RemoteSheetMode | null>(null);
  const [busy, setBusy] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const picker = useRef<HTMLButtonElement>(null);
  const [typing, setTyping] = useState(false);
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const openVault = useAtomSet(openVaultAtom, { mode: "promiseExit" });
  const cloning = action === "clone";
  const folders = window.gloseDesktop?.folders;

  const openSheet = (mode: RemoteSheetMode, from: HTMLButtonElement) => {
    opener.current = from;
    setSheet(mode);
  };
  const closeSheet = () => {
    flushSync(() => setSheet(null));
    opener.current?.focus();
  };

  const pick = async () => {
    if (folders === undefined) return;
    setPicking(true);
    const chosen = await folders
      .choose({
        startIn: action === "open" ? folder || home : parentOf(folder) || home,
        title: t.setup.pickTitle[action],
        button: t.setup.pickButton[action],
      })
      .catch(() => {
        setTyping(true);
        return null;
      });
    setPicking(false);
    if (chosen === null) return;
    const named = lastName(chosen).toLowerCase() === lastName(suggested).toLowerCase();
    setFolder(action === "open" || named ? chosen : folderIn(chosen, lastName(suggested)));
    setError(null);
  };

  const focusFolder = () => (folders === undefined ? field.current : picker.current)?.focus();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cloning && remote === null) return setRemoteError("missing");
    if (folder.trim() === "") {
      flushSync(() => setError("needed"));
      return focusFolder();
    }
    setBusy(true);
    onBusy(true);
    const exit = await openVault({
      language,
      vaultFolder: folder,
      action,
      ...(cloning && remote !== null ? { remote: remote.url } : {}),
    });
    onBusy(false);
    if (Exit.isSuccess(exit)) {
      setBusy(false);
      return onVault(exit.value);
    }
    const remoteFailure = remoteFailureOf(exit);
    if (remoteFailure !== null) {
      setBusy(false);
      return setRemoteError(remoteFailure);
    }
    const failure = Cause.findErrorOption(exit.cause);
    flushSync(() => {
      setBusy(false);
      setError(
        Option.isSome(failure) && failure.value._tag === "VaultFolderUnavailable"
          ? failure.value.reason
          : "storage",
      );
    });
    focusFolder();
  };

  const folderError =
    error === null || error === "storage" ? null : (
      <p className="field__error" id={errorId}>
        <CircleAlert className="call__icon" aria-hidden="true" />
        {error === "needed" ? t.setup.folderNeeded : t.setup.folderErrors[error]}
      </p>
    );
  const ready = folder.trim() !== "" && (!cloning || remote !== null);

  const pathField = (
    <div className="field">
      <label className="field__label" htmlFor={folderId}>
        {t.setup.folderLabel}
      </label>
      <input
        ref={field}
        id={folderId}
        className="input"
        value={folder}
        onChange={(event) => {
          setFolder(event.target.value);
          setError(null);
        }}
        disabled={busy}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={error !== null && error !== "storage"}
        aria-describedby={error === null ? hintId : `${hintId} ${errorId}`}
      />
    </div>
  );

  return (
    <>
      <form onSubmit={submit} noValidate>
        <div className="panel__body setup__fields">
          <p className="field__hint">{t.setup.folderHint}</p>
          <fieldset className="fieldset" disabled={busy}>
            <legend className="sr-only">{t.setup.steps.vault}</legend>
            <div className="choice-list">
              {FOLDER_ACTIONS.map((option) => (
                <label key={option} className="choice">
                  <input
                    type="radio"
                    name="setup-folder-action"
                    value={option}
                    checked={action === option}
                    onChange={() => {
                      if (option === "open" && error === "not-empty") {
                        setPlaces((all) => ({ ...all, open: folder }));
                      }
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
              disabled={busy}
              onOpen={openSheet}
            />
          ) : null}
          <div className="setup__where">
            <p className="field__hint" id={hintId}>
              {t.setup.folderActionHints[action]}
            </p>
            <dl className="facts">
              <dt>{t.setup.where}</dt>
              <dd>
                <FolderShown path={folder} home={home} />
              </dd>
            </dl>
            {folders === undefined ? null : (
              <div className="button-row">
                <button
                  ref={picker}
                  type="button"
                  className={folder === "" ? "button button--primary" : "button"}
                  disabled={busy || picking}
                  aria-describedby={error === null ? hintId : `${hintId} ${errorId}`}
                  onClick={pick}
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  {action === "open" && folder === "" ? t.setup.chooseOpen : t.setup.change}
                </button>
              </div>
            )}
            {folders === undefined ? null : folderError}
            {folders === undefined ? (
              <>
                {pathField}
                {folderError}
              </>
            ) : (
              <MoreDetails summary={t.setup.typePath} open={typing} onToggle={setTyping}>
                {pathField}
              </MoreDetails>
            )}
          </div>
          {error === "storage" ? (
            <Notice tone="error" title={t.errors.storage}>
              <p id={errorId}>{t.errors.storageRecovery}</p>
            </Notice>
          ) : null}
          <p className="field__hint">{t.setup.privacy}</p>
        </div>
        <div className="panel__body setup__foot">
          <button type="button" className="button button--quiet" disabled={busy} onClick={onBack}>
            {t.setup.back}
          </button>
          <div className="setup__foot-end">
            {busy && cloning ? (
              <span className="live" role="status">
                {t.setup.remote.copyingNote}
              </span>
            ) : null}
            <button
              type="submit"
              className={ready ? "button button--primary" : "button"}
              disabled={busy}
            >
              {busy && cloning ? t.setup.copying : t.setup.vaultSubmit[action]}
            </button>
          </div>
        </div>
      </form>
      {sheet === null ? null : (
        <RemoteVaultSheet
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
    </>
  );
}

function VaultChosen({
  vault,
  home,
  nextRef,
  onBack,
  onNext,
}: {
  readonly vault: Vault;
  readonly home: string;
  readonly nextRef: RefObject<HTMLButtonElement | null>;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  const t = useT();
  return (
    <>
      <div className="panel__body setup__fields">
        <p>{t.setup.vaultDone}</p>
        <FolderShown path={vault.folder} home={home} />
        <p className="field__hint">{t.setup.vaultFound(vault.sources)}</p>
      </div>
      <div className="panel__body setup__foot">
        <button type="button" className="button button--quiet" onClick={onBack}>
          {t.setup.back}
        </button>
        <button ref={nextRef} type="button" className="button button--primary" onClick={onNext}>
          {t.setup.continue}
        </button>
      </div>
    </>
  );
}

function RemoteLedger({
  remote,
  error,
  errorId,
  disabled,
  onOpen,
}: {
  readonly remote: ChosenRemote | null;
  readonly error: RemoteError | null;
  readonly errorId: string;
  readonly disabled: boolean;
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
          disabled={disabled}
          aria-describedby={error === null ? undefined : errorId}
          onClick={(event) => onOpen("github", event.currentTarget)}
        >
          {remote === null ? t.setup.remote.choose : t.setup.remote.chooseAgain}
        </button>
        <button
          type="button"
          className="button button--quiet"
          disabled={disabled}
          onClick={(event) => onOpen("remote", event.currentTarget)}
        >
          {t.setup.remote.useRemote}
        </button>
      </div>
    </div>
  );
}

export function usePlaceWords(): (path: string, home: string) => string {
  const t = useT();
  return (path, home) => {
    const place = folderPlace(path, home);
    return `${place.name}, ${withinWords(t, place)}`;
  };
}

const withinWords = (t: ReturnType<typeof useT>, place: FolderPlace) =>
  place.within._tag === "Home"
    ? t.setup.placeHome(place.within.home)
    : place.within._tag === "InHome"
      ? t.setup.placeIn(place.within.trail.join(" › "))
      : t.setup.placeIn(place.within.parent);

function FolderShown({ path, home }: { readonly path: string; readonly home: string }) {
  const t = useT();
  if (path.trim() === "") return <span className="setup__unset">{t.setup.folderNotChosen}</span>;
  const place = folderPlace(path, home);
  const within = withinWords(t, place);
  return (
    <span className="setup__place">
      <span className="setup__place-name">
        <FolderClosed className="setup__place-icon" aria-hidden="true" />
        <strong>{place.name}</strong> <span className="setup__place-within">{within}</span>
      </span>
      <span className="setup__place-path">{path}</span>
    </span>
  );
}

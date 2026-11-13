import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { GitHubRepository, GraphRemoteUnavailableReason } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { CircleAlert, Waypoints } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import {
  cancelGitHubAtom,
  disconnectGitHubAtom,
  gitHubRepositoriesAtom,
  gitHubStatusAtom,
} from "../state/github.ts";
import { checkRemoteAtom } from "../state/graph.ts";
import { ConnectStep, SheetFoot } from "./Backup.tsx";
import { Flourish, Notice } from "./ui.tsx";

/** Where the first start copies the Graph from: a GitHub repository, or any git remote. */
export interface ChosenRemote {
  readonly url: string;
  /** The GitHub repository, when the user picked one from the list. */
  readonly repository: GitHubRepository | null;
}

export type RemoteSheetMode = "github" | "remote";

/** The reason a setup call failed with GraphRemoteUnavailable, or null for any other failure. */
export const remoteFailureOf = (
  exit: Exit.Exit<unknown, unknown>,
): GraphRemoteUnavailableReason | null => {
  if (Exit.isSuccess(exit)) return null;
  const error = Cause.findErrorOption(exit.cause);
  return Option.isSome(error) &&
    typeof error.value === "object" &&
    error.value !== null &&
    "_tag" in error.value &&
    error.value._tag === "GraphRemoteUnavailable" &&
    "reason" in error.value
    ? (error.value.reason as GraphRemoteUnavailableReason)
    : null;
};

/**
 * The first start's sheet: the Backup sheet run the other way. It connects GitHub and lets the
 * user pick the repository that holds their Graph, or takes the address of another git remote.
 * It only chooses; the setup page copies the Graph when the user starts.
 */
export function RemoteGraphSheet({
  mode,
  onMode,
  onChoose,
  onClose,
}: {
  readonly mode: RemoteSheetMode;
  readonly onMode: (mode: RemoteSheetMode) => void;
  readonly onChoose: (chosen: ChosenRemote) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const github = AsyncResult.getOrElse(useAtomValue(gitHubStatusAtom), () => null);
  const cancel = useAtomSet(cancelGitHubAtom);

  const close = () => {
    if (github?._tag === "Connecting") cancel({ payload: undefined });
    onClose();
  };

  const step = mode === "github" ? (github?._tag === "Connected" ? 2 : 1) : null;

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
            {mode === "github" ? t.setup.remote.title : t.setup.remote.useRemote}
          </h2>
          {step === null ? null : <span className="panel__meta">{t.backup.step(step, 2)}</span>}
        </div>
        <div className="panel__rule" aria-hidden="true">
          <Flourish />
        </div>
        <div className="panel__body sheet__body">
          {mode === "remote" ? (
            <RemoteForm onChoose={onChoose} onCancel={close} />
          ) : github === null ? (
            <p className="status">{t.common.loading}</p>
          ) : github._tag === "Connected" ? (
            <RepositoryStep login={github.login} onChoose={onChoose} onCancel={close} />
          ) : (
            <ConnectStep
              status={github}
              intro={t.setup.remote.intro}
              codeIntro={t.setup.remote.codeIntro}
              onUseRemote={() => onMode("remote")}
              onCancel={close}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

/** Step 2: the account's private repositories, Graphs first, one of them to copy. */
function RepositoryStep({
  login,
  onChoose,
  onCancel,
}: {
  readonly login: string;
  readonly onChoose: (chosen: ChosenRemote) => void;
  readonly onCancel: () => void;
}) {
  const t = useT();
  const listing = useAtomValue(gitHubRepositoriesAtom(login));
  const retry = useAtomRefresh(gitHubRepositoriesAtom(login));
  const disconnect = useAtomSet(disconnectGitHubAtom);
  const [chosen, setChosen] = useState<string | null>(null);

  const repositories = AsyncResult.getOrElse(listing, () => []);
  // Until the user picks, the latest pushed Graph is chosen: it is the likeliest one.
  const current = chosen ?? repositories.find((repository) => repository.graph)?.url ?? null;
  const picked = repositories.find((repository) => repository.url === current) ?? null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (picked !== null) onChoose({ url: picked.url, repository: picked });
  };

  return (
    <form className="sheet__form" onSubmit={submit}>
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
      {AsyncResult.isInitial(listing) || (listing.waiting && !AsyncResult.isSuccess(listing)) ? (
        <p className="live" role="status">
          {t.common.loading}
        </p>
      ) : AsyncResult.isSuccess(listing) ? (
        repositories.length === 0 ? (
          <p className="empty">{t.setup.remote.none}</p>
        ) : (
          <RepositoryList repositories={repositories} chosen={current} onChange={setChosen} />
        )
      ) : (
        <Notice tone="warning">
          <p>{t.setup.remote.listFailed}</p>
          <button type="button" className="button" onClick={retry}>
            {t.common.retry}
          </button>
        </Notice>
      )}
      <SheetFoot>
        <button type="submit" className="button button--primary" disabled={picked === null}>
          {t.setup.remote.useThis}
        </button>
        <button type="button" className="button button--quiet sheet__cancel" onClick={onCancel}>
          {t.backup.cancel}
        </button>
      </SheetFoot>
    </form>
  );
}

function RepositoryList({
  repositories,
  chosen,
  onChange,
}: {
  readonly repositories: ReadonlyArray<GitHubRepository>;
  readonly chosen: string | null;
  readonly onChange: (url: string) => void;
}) {
  const t = useT();
  const name = useId();
  const hintId = useId();
  const graphs = repositories.filter((repository) => repository.graph);
  const others = repositories.filter((repository) => !repository.graph);
  // A repository the user picked stays in sight when they fold the others away.
  const otherChosen = others.some((repository) => repository.url === chosen);

  const row = (repository: GitHubRepository) => (
    <label key={repository.url} className="repo">
      <input
        type="radio"
        name={name}
        value={repository.url}
        checked={repository.url === chosen}
        // The task's first control takes focus, as in every sheet: the chosen row.
        autoFocus={repository.url === chosen}
        onChange={() => onChange(repository.url)}
      />
      <span className="repo__main">
        <span className="call repo__name">{repository.fullName}</span>
        {repository.pushedAt === null ? null : (
          <span className="repo__meta">
            {t.setup.remote.updated(new Date(repository.pushedAt))}
          </span>
        )}
      </span>
      <span className="repo__side">
        {repository.graph ? (
          <span className="repo__graph">
            <Waypoints className="repo__graph-icon" aria-hidden="true" />
            {t.setup.remote.graph}
          </span>
        ) : null}
        <span className="repo__owner">
          {repository.shared ? t.setup.remote.sharedBy(repository.owner) : t.setup.remote.yours}
        </span>
      </span>
    </label>
  );

  return (
    <fieldset className="repo-list" aria-describedby={hintId}>
      <legend className="field__label">{t.setup.remote.chooseGraph}</legend>
      <p className="field__hint" id={hintId}>
        {t.setup.remote.listHint}
      </p>
      {graphs.length === 0 ? null : <div className="repo-list__rows">{graphs.map(row)}</div>}
      {others.length === 0 ? null : (
        <details className="repo-others" open={graphs.length === 0 || otherChosen}>
          <summary className="repo-others__summary">{t.setup.remote.others(others.length)}</summary>
          <p className="field__hint">{t.setup.remote.othersHint}</p>
          <div className="repo-list__rows">{others.map(row)}</div>
        </details>
      )}
    </fieldset>
  );
}

/** Another git remote: Glose checks that git can read it before the sheet closes. */
function RemoteForm({
  onChoose,
  onCancel,
}: {
  readonly onChoose: (chosen: ChosenRemote) => void;
  readonly onCancel: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const errorId = useId();
  const check = useAtomSet(checkRemoteAtom, { mode: "promiseExit" });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<GraphRemoteUnavailableReason | "failed" | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed === "") return;
    setBusy(true);
    setProblem(null);
    const exit = await check({ payload: { url: trimmed } });
    setBusy(false);
    if (Exit.isSuccess(exit)) onChoose({ url: trimmed, repository: null });
    else setProblem(remoteFailureOf(exit) ?? "failed");
  };

  return (
    <form className="sheet__form" onSubmit={submit}>
      <p>{t.setup.remote.remoteIntro}</p>
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
          aria-describedby={problem === null ? undefined : errorId}
          onChange={(event) => {
            setUrl(event.target.value);
            if (problem !== null) setProblem(null);
          }}
        />
        {problem === null ? null : (
          <p className="field__error" id={errorId} role="alert">
            <CircleAlert className="call__icon" aria-hidden="true" />
            {problem === "failed" ? t.errors.unexpected : t.setup.remote.errors[problem]}
          </p>
        )}
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

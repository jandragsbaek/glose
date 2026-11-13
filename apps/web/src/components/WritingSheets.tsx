import { useAtomSet } from "@effect/atom-react";
import { type GraphNode, linkKey, type Source, type SiteFolderUnavailable } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert, Search } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { KEYS } from "../state/graph.ts";
import { setSiteFolderAtom } from "../state/writing.ts";
import { SheetFoot } from "./Backup.tsx";
import { CallNumber, Flourish } from "./ui.tsx";

/** A Glose sheet: a modal leaf for one task, closed by Esc as by Cancel. */
function Sheet({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <dialog
      className="sheet"
      aria-labelledby={titleId}
      ref={(node) => {
        if (node === null || node.open) return;
        node.showModal();
        // The task's own control takes the focus, not simply the first one in the leaf.
        node.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="panel" data-initial="rubric">
        <div className="panel__head">
          <h2 className="panel__title" id={titleId}>
            {title}
          </h2>
        </div>
        <div className="panel__rule" aria-hidden="true">
          <Flourish />
        </div>
        <div className="panel__body sheet__body">{children}</div>
      </div>
    </dialog>
  );
}

/** At most this many matches show; typing narrows them. */
const MAX_MATCHES = 40;

/** Chooses a Note or a Source to cite, and the page, for a Reference at the cursor. */
export function CiteSheet({
  nodes,
  sources,
  onCite,
  onClose,
}: {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly sources: ReadonlyArray<Source>;
  readonly onCite: (target: string, page: string | null) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const searchId = useId();
  const pageId = useId();
  const pageHintId = useId();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const sourceById = new Map(sources.map((source) => [linkKey(source.id), source]));
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = nodes
    .filter((node) => {
      const text = `${node.id} ${node.title}`.toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(
      (a, b) =>
        Number(a.kind === "source") - Number(b.kind === "source") || a.id.localeCompare(b.id),
    )
    .slice(0, MAX_MATCHES);
  const choice = chosen ?? matches[0]?.id ?? null;

  const cite = () => {
    if (choice === null) return;
    onCite(choice, page.trim() === "" ? null : page.trim());
  };

  return (
    <Sheet title={t.writing.citeTitle} onClose={onClose}>
      <form
        className="sheet__form"
        onSubmit={(event) => {
          event.preventDefault();
          cite();
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor={searchId}>
            {t.writing.citeSearch}
          </label>
          <span className="register-tools__find">
            <Search className="register-tools__icon" aria-hidden="true" />
            <input
              id={searchId}
              className="input"
              type="search"
              autoComplete="off"
              data-autofocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setChosen(null);
              }}
            />
          </span>
        </div>
        {matches.length === 0 ? (
          <p className="empty">{t.writing.citeEmpty}</p>
        ) : (
          <fieldset className="cite-list">
            <legend className="sr-only">{t.writing.citeSearch}</legend>
            {matches.map((node) => {
              const source =
                node.kind === "source"
                  ? (sourceById.get(linkKey(node.id)) ?? null)
                  : node.sourceId === null
                    ? null
                    : (sourceById.get(linkKey(node.sourceId)) ?? null);
              return (
                <label key={node.id} className="cite-list__row">
                  <input
                    type="radio"
                    name="cite"
                    checked={choice === node.id}
                    onChange={() => setChosen(node.id)}
                  />
                  <span className="cite-list__text">
                    <span className="cite-list__title">
                      {node.kind === "source" ? node.title : node.id}
                    </span>
                    <span className="cite-list__kind">
                      {node.kind === "source" ? t.writing.citeSource : t.writing.citeNote}
                    </span>
                  </span>
                  {source === null ? null : (
                    <CallNumber source={source} page={node.kind === "note" ? node.page : null} />
                  )}
                </label>
              );
            })}
          </fieldset>
        )}
        <div className="field cite-page">
          <label className="field__label" htmlFor={pageId}>
            {t.writing.citePage} <span className="field__optional">({t.common.optional})</span>
          </label>
          <input
            id={pageId}
            className="input"
            inputMode="text"
            aria-describedby={pageHintId}
            value={page}
            onChange={(event) => setPage(event.target.value)}
          />
          <p className="field__hint" id={pageHintId}>
            {t.writing.citePageHint}
          </p>
        </div>
        <SheetFoot>
          <button type="submit" className="button button--primary" disabled={choice === null}>
            {t.writing.citeAction}
          </button>
          <button type="button" className="button button--quiet sheet__cancel" onClick={onClose}>
            {t.writing.cancel}
          </button>
        </SheetFoot>
      </form>
    </Sheet>
  );
}

/** Asks for the folder of the user's Bridgetown site, on first publishing or when it moved. */
export function SiteFolderSheet({
  initial,
  onDone,
  onClose,
}: {
  readonly initial: string;
  readonly onDone: () => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [folder, setFolder] = useState(initial);
  const [error, setError] = useState<SiteFolderUnavailable["reason"] | "storage" | null>(null);
  const [saving, setSaving] = useState(false);
  const setSiteFolder = useAtomSet(setSiteFolderAtom, { mode: "promiseExit" });

  const save = async () => {
    setSaving(true);
    const exit = await setSiteFolder({
      payload: { siteFolder: folder },
      reactivityKeys: KEYS.settings,
    });
    setSaving(false);
    if (Exit.isSuccess(exit)) {
      onDone();
      return;
    }
    const failure = Cause.findErrorOption(exit.cause);
    setError(
      Option.isSome(failure) && failure.value._tag === "SiteFolderUnavailable"
        ? failure.value.reason
        : "storage",
    );
  };

  return (
    <Sheet title={t.writing.siteTitle} onClose={onClose}>
      <form
        className="sheet__form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p>{t.writing.siteBody}</p>
        <div className="field">
          <label className="field__label" htmlFor={inputId}>
            {t.writing.siteLabel}
          </label>
          <input
            id={inputId}
            className="input"
            spellCheck={false}
            autoComplete="off"
            data-autofocus
            aria-invalid={error === null ? undefined : true}
            aria-describedby={error === null ? hintId : `${hintId} ${errorId}`}
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              setError(null);
            }}
          />
          <p className="field__hint" id={hintId}>
            {t.writing.siteHint}
          </p>
          {error === null ? null : (
            <p className="field__error" id={errorId}>
              <CircleAlert className="call__icon" aria-hidden="true" />
              {error === "storage" ? t.errors.storage : t.writing.siteErrors[error]}
            </p>
          )}
        </div>
        <SheetFoot>
          <button
            type="submit"
            className="button button--primary"
            disabled={saving || folder.trim() === ""}
          >
            {t.writing.siteSave}
          </button>
          <button type="button" className="button button--quiet sheet__cancel" onClick={onClose}>
            {t.writing.cancel}
          </button>
        </SheetFoot>
      </form>
    </Sheet>
  );
}

/** The site already has the post's file: replace it only when the writer says so. */
export function ReplaceSheet({
  file,
  onReplace,
  onClose,
}: {
  readonly file: string;
  readonly onReplace: () => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet title={t.writing.replaceTitle} onClose={onClose}>
      <p>{t.writing.replaceBody(file)}</p>
      <SheetFoot>
        <button type="button" className="button" onClick={onReplace}>
          {t.writing.replace}
        </button>
        <button
          type="button"
          className="button button--quiet sheet__cancel"
          data-autofocus
          onClick={onClose}
        >
          {t.writing.keep}
        </button>
      </SheetFoot>
    </Sheet>
  );
}

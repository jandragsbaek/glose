import { useAtomSet } from "@effect/atom-react";
import type { SiteFolderUnavailable } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { KEYS } from "../state/graph.ts";
import { setSiteFolderAtom } from "../state/writing.ts";
import { SheetFoot } from "./Backup.tsx";
import { Flourish } from "./ui.tsx";

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

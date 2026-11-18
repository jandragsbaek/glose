import { ChevronRight, CircleAlert } from "lucide-react";
import { type DragEvent, type ReactNode, type RefObject, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";

export const YEAR = /^-?\d{1,4}$/;
export const PART = /^\d{1,2}\.\d{1,2}$/;

export const blank = (value: string) => (value.trim() === "" ? null : value.trim());

export const today = () => {
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
};

export const focusAfterRender = (
  refs: RefObject<HTMLElement | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
  frames = 10,
): void => {
  requestAnimationFrame(() => {
    const target = (Array.isArray(refs) ? refs : [refs])
      .map((ref: RefObject<HTMLElement | null>) => ref.current)
      .find((element) => element?.isConnected === true);
    if (target !== undefined && target !== null) target.focus();
    else if (frames > 0) focusAfterRender(refs, frames - 1);
  });
};

export const cursorIsFree = (around: HTMLElement | null) => {
  const active = document.activeElement;
  return active === null || active === document.body || (around?.contains(active) ?? false);
};

export const focusFirstProblem = (root: HTMLElement | null) =>
  requestAnimationFrame(() => {
    const target = root?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)');
    target?.closest("details")?.setAttribute("open", "");
    target?.focus();
  });

export interface TextFile {
  readonly name: string;
  readonly markdown: string;
}

export const readFiles = async (files: ReadonlyArray<File>): Promise<ReadonlyArray<TextFile>> =>
  Promise.all(files.map(async (file) => ({ name: file.name, markdown: await file.text() })));

export const droppedFiles = async (event: DragEvent): Promise<ReadonlyArray<File>> => {
  const items = [...event.dataTransfer.items];
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => entry != null);
  if (entries.length === 0) return [...event.dataTransfer.files];
  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      Object.defineProperty(file, "webkitRelativePath", { value: entry.fullPath.slice(1) });
      out.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        );
        if (batch.length === 0) break;
        for (const child of batch) await walk(child);
      }
    }
  };
  for (const entry of entries) await walk(entry);
  return out;
};

export function DropZone({
  children,
  onFiles,
  hint,
}: {
  readonly children: ReactNode;
  readonly onFiles: (files: Promise<ReadonlyArray<File>>) => void;
  readonly hint: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className="dropzone"
      data-over={over ? "" : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onFiles(droppedFiles(event));
      }}
    >
      <div className="dropzone__actions">{children}</div>
      <p className="dropzone__hint">{hint}</p>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  name,
  hint,
  required = false,
  wide = false,
  filledFrom,
  error,
  multiline = false,
  inputMode,
  disabled = false,
  inputRef,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly name?: string;
  readonly hint?: string | undefined;
  readonly required?: boolean;
  readonly wide?: boolean;
  readonly filledFrom?: string | undefined;
  readonly error?: string | undefined;
  readonly multiline?: boolean;
  readonly inputMode?: "numeric" | "url" | undefined;
  readonly disabled?: boolean;
  readonly inputRef?: RefObject<HTMLInputElement | null> | undefined;
}) {
  const t = useT();
  const id = useId();
  const describedBy = [
    hint === undefined ? null : `${id}-hint`,
    filledFrom === undefined ? null : `${id}-filled`,
    error === undefined ? null : `${id}-error`,
  ]
    .filter(Boolean)
    .join(" ");
  const props = {
    id,
    name,
    value,
    "aria-describedby": describedBy === "" ? undefined : describedBy,
    "aria-invalid": error === undefined ? undefined : true,
    required,
    disabled,
  } as const;
  return (
    <div className={wide ? "field field--wide" : "field"}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__need"> {t.common.required}</span> : null}
      </label>
      <div className="field__control" data-filled={filledFrom === undefined ? undefined : ""}>
        {multiline ? (
          <textarea
            {...props}
            className="input field__lines"
            rows={2}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            {...props}
            ref={inputRef}
            className="input"
            inputMode={inputMode}
            autoComplete="off"
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </div>
      {filledFrom === undefined ? null : (
        <span className="sr-only" id={`${id}-filled`}>
          {filledFrom}
        </span>
      )}
      {hint === undefined ? null : (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p className="field__error" id={`${id}-error`}>
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function FillLine({
  children,
  marked = true,
  onUndo,
}: {
  readonly children: ReactNode;
  readonly marked?: boolean;
  readonly onUndo?: (() => void) | undefined;
}) {
  const t = useT();
  return (
    <div className="fill-line">
      {marked ? <span className="fill-line__dot" aria-hidden="true" /> : null}
      <p className="fill-line__text">{children}</p>
      {onUndo === undefined ? null : (
        <button type="button" className="link-button fill-line__undo" onClick={onUndo}>
          {t.addSource.undoFill}
        </button>
      )}
    </div>
  );
}

export function MoreDetails({
  summary,
  open,
  onToggle,
  children,
}: {
  readonly summary: string;
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
  readonly children: ReactNode;
}) {
  return (
    <details
      className="more-details field--wide"
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="more-details__summary">
        <ChevronRight className="more-details__chev" aria-hidden="true" />
        {summary}
      </summary>
      <div className="fieldset more-details__fields">{children}</div>
    </details>
  );
}

export function FormFoot({
  problem,
  status,
  children,
}: {
  readonly problem: string | null;
  readonly status?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="panel__foot">
      {status === undefined ? null : (
        <p role="status" className="form-status">
          {status}
        </p>
      )}
      <p role="alert" className="form-problem">
        {problem === null ? null : (
          <span className="field__error">
            <CircleAlert className="field__error-icon" aria-hidden="true" />
            {problem}
          </span>
        )}
      </p>
      <div className="button-row">{children}</div>
    </div>
  );
}

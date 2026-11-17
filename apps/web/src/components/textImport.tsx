import { CircleAlert } from "lucide-react";
import { type DragEvent, type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";

export const YEAR = /^-?\d{1,4}$/;
export const PART = /^\d{1,2}\.\d{1,2}$/;

export const blank = (value: string) => (value.trim() === "" ? null : value.trim());

export const today = () => {
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
};

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
  const walk = async (entry: FileSystemEntry, depth: number): Promise<void> => {
    if (entry.isFile) {
      out.push(
        await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject),
        ),
      );
    } else if (entry.isDirectory && depth < 2) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      for (const child of children) await walk(child, depth + 1);
    }
  };
  for (const entry of entries) await walk(entry, 0);
  return out;
};

export function DropZone({
  children,
  onFiles,
  hint,
}: {
  readonly children: ReactNode;
  readonly onFiles: (files: ReadonlyArray<File>) => void;
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
        void droppedFiles(event).then(onFiles);
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
  hint,
  required = false,
  wide = false,
  filled = false,
  error,
  multiline = false,
  inputMode,
  disabled = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly required?: boolean;
  readonly wide?: boolean;
  readonly filled?: boolean;
  readonly error?: string | undefined;
  readonly multiline?: boolean;
  readonly inputMode?: "numeric" | "url";
  readonly disabled?: boolean;
}) {
  const t = useT();
  const id = useId();
  const describedBy = [
    hint === undefined ? null : `${id}-hint`,
    filled ? `${id}-filled` : null,
    error === undefined ? null : `${id}-error`,
  ]
    .filter(Boolean)
    .join(" ");
  const props = {
    id,
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
        {required ? null : <span className="field__optional"> {t.common.optional}</span>}
      </label>
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
          className="input"
          inputMode={inputMode}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint === undefined ? null : (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {filled ? (
        <p className="field__hint field__hint--catalog" id={`${id}-filled`}>
          {t.importText.fromFile}
        </p>
      ) : null}
      {error === undefined ? null : (
        <p className="field__error" id={`${id}-error`}>
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

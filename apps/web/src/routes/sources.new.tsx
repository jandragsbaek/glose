import { useAtomSet } from "@effect/atom-react";
import type { CatalogRecord, SourceDetails } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type FormEvent, type RefObject, useId, useRef, useState } from "react";

import { CallNumber, Notice, Page, Panel } from "../components/ui.tsx";
import {
  EMPTY_FORM,
  type FieldName,
  fillFromCatalog,
  type FormValues,
  formValuesOf,
  isFromCatalog,
} from "../domain/sourceForm.ts";
import { useT } from "../i18n/I18n.tsx";
import { createSourceAtom, KEYS, searchCatalogAtom } from "../state/graph.ts";

export const Route = createFileRoute("/sources/new")({ component: AddSource });

const YEAR = /^-?\d{1,4}$/;
const YEAR_FIELDS = ["firstPublished", "editionYear"] as const;

const text = (values: FormValues, name: FieldName) => {
  const value = values[name].trim();
  return value === "" ? null : value;
};

const year = (values: FormValues, name: FieldName) => {
  const value = text(values, name);
  return value === null ? null : Number(value);
};

/** The last Catalog fill: which record, what it wrote, and the form before it, for Undo. */
interface Fill {
  readonly record: CatalogRecord;
  readonly values: FormValues;
  readonly kept: ReadonlyArray<FieldName>;
  readonly before: { readonly values: FormValues; readonly fill: Fill | null };
}

type Search =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Searching" }
  | { readonly _tag: "Found"; readonly records: ReadonlyArray<CatalogRecord> }
  | { readonly _tag: "Unavailable" };

function AddSource() {
  const t = useT();
  const navigate = useNavigate();
  const createSource = useAtomSet(createSourceAtom, { mode: "promiseExit" });
  const [invalidYears, setInvalidYears] = useState<ReadonlyArray<FieldName>>([]);
  const [failure, setFailure] = useState<{ readonly nameTaken: string } | "storage" | null>(null);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fill, setFill] = useState<Fill | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const focusFirstField = () => {
    const input = firstFieldRef.current;
    input?.scrollIntoView({ block: "center" });
    input?.focus({ preventScroll: true });
  };

  const choose = (record: CatalogRecord) => {
    const filled = fillFromCatalog(values, fill?.values ?? null, formValuesOf(record.details));
    setFill({
      record,
      values: formValuesOf(record.details),
      kept: filled.kept,
      before: { values, fill },
    });
    setValues(filled.values);
    setInvalidYears([]);
    focusFirstField();
  };

  const undoFill = () => {
    if (fill === null) return;
    setValues(fill.before.values);
    setFill(fill.before.fill);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = YEAR_FIELDS.filter((name) => {
      const value = text(values, name);
      return value !== null && !YEAR.test(value);
    });
    setInvalidYears(invalid);
    if (invalid.length > 0) return;

    const details: SourceDetails = {
      familyName: text(values, "familyName") ?? "",
      givenName: text(values, "givenName"),
      title: text(values, "title") ?? "",
      firstPublished: year(values, "firstPublished"),
      edition: text(values, "edition"),
      editionYear: year(values, "editionYear"),
      publisher: text(values, "publisher"),
      translator: text(values, "translator"),
    };
    setBusy(true);
    const exit = await createSource({ payload: details, reactivityKeys: KEYS.sources });
    setBusy(false);
    if (Exit.isSuccess(exit)) {
      await navigate({ to: "/sources/$sourceId", params: { sourceId: exit.value.id } });
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    setFailure(
      Option.isSome(error) && error.value._tag === "SourceNameTaken"
        ? { nameTaken: error.value.fileName }
        : "storage",
    );
  };

  const field = (name: FieldName, label: string, options: FieldOptions = {}) => (
    <Field
      name={name}
      label={label}
      optionalLabel={options.required ? undefined : t.common.optional}
      hint={options.hint}
      wide={options.wide}
      year={options.year}
      error={invalidYears.includes(name) ? t.addSource.yearInvalid : undefined}
      value={values[name]}
      fromCatalog={isFromCatalog(values, fill?.values ?? null, name)}
      onChange={(value) => setValues((current) => ({ ...current, [name]: value }))}
      inputRef={name === "familyName" ? firstFieldRef : undefined}
    />
  );

  return (
    <Page title={t.addSource.title}>
      <div className="narrow">
        <p className="empty" style={{ marginBottom: 20 }}>
          {t.addSource.intro}
        </p>
        <div className="form">
          <FindBook chosen={fill?.record.id ?? null} onChoose={choose} />
          <div role="status">
            {fill === null ? null : (
              <Notice tone="info" title={t.addSource.filledTitle(fill.record.details.title)}>
                <p>
                  {t.addSource.filled}
                  {fill.kept.length === 0 ? null : ` ${t.addSource.keptTyped}`}
                </p>
                <div className="button-row" style={{ marginTop: 8 }}>
                  <button type="button" className="button" onClick={undoFill}>
                    {t.addSource.undoFill}
                  </button>
                </div>
              </Notice>
            )}
          </div>
        </div>
        <form className="form" onSubmit={submit} style={{ marginTop: 24 }}>
          <Panel title={t.addSource.author} initial="lapis">
            <div className="panel__body">
              <fieldset className="fieldset">
                <legend className="sr-only">{t.addSource.author}</legend>
                {field("familyName", t.addSource.familyName, { required: true })}
                {field("givenName", t.addSource.givenName)}
              </fieldset>
            </div>
          </Panel>
          <Panel title={t.addSource.work} initial="rubric">
            <div className="panel__body">
              <fieldset className="fieldset">
                <legend className="sr-only">{t.addSource.work}</legend>
                {field("title", t.addSource.titleField, { required: true, wide: true })}
                {field("firstPublished", t.addSource.firstPublished, {
                  hint: t.addSource.firstPublishedHint,
                  year: true,
                })}
                {field("publisher", t.addSource.publisher)}
                {field("edition", t.addSource.edition, { hint: t.addSource.editionHint })}
                {field("editionYear", t.addSource.editionYear, { year: true })}
                {field("translator", t.addSource.translator)}
              </fieldset>
            </div>
          </Panel>
          {failure === null ? null : (
            <Notice tone="error" title={failure === "storage" ? t.errors.storage : undefined}>
              <p>
                {failure === "storage"
                  ? t.errors.storageRecovery
                  : t.addSource.nameTaken(failure.nameTaken)}
              </p>
            </Notice>
          )}
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={busy}>
              {t.addSource.submit}
            </button>
            <Link to="/" className="button">
              {t.addSource.cancel}
            </Link>
          </div>
        </form>
      </div>
    </Page>
  );
}

/** Searches the Catalog; choosing a record fills the form, which stays editable. */
function FindBook({
  chosen,
  onChoose,
}: {
  readonly chosen: string | null;
  readonly onChoose: (record: CatalogRecord) => void;
}) {
  const t = useT();
  const searchCatalog = useAtomSet(searchCatalogAtom, { mode: "promiseExit" });
  const [search, setSearch] = useState<Search>({ _tag: "Idle" });
  const latest = useRef(0);
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
    if (query === "") return;
    const request = ++latest.current;
    setSearch({ _tag: "Searching" });
    const exit = await searchCatalog({ payload: { query } });
    // An answer to an older search must not replace the newer one.
    if (request !== latest.current) return;
    setSearch(
      Exit.isSuccess(exit) ? { _tag: "Found", records: exit.value } : { _tag: "Unavailable" },
    );
  };

  return (
    <Panel title={t.addSource.find} initial="rubric">
      <div className="panel__body">
        <form role="search" onSubmit={submit} aria-describedby={hintId}>
          <div className="field">
            <label className="field__label" htmlFor={inputId}>
              {t.addSource.searchLabel}
            </label>
            <div className="button-row">
              <input
                id={inputId}
                name="query"
                type="search"
                className="input"
                autoComplete="off"
                style={{ flex: 1 }}
              />
              <button type="submit" className="button" disabled={search._tag === "Searching"}>
                {t.addSource.search}
              </button>
            </div>
            <p className="field__hint" id={hintId}>
              {t.addSource.findHint}
            </p>
          </div>
        </form>
        <div aria-live="polite" style={{ marginTop: 12 }}>
          {search._tag === "Searching" ? <p className="status">{t.addSource.searching}</p> : null}
          {search._tag === "Unavailable" ? (
            <Notice tone="warning">
              <p>{t.addSource.unavailable}</p>
            </Notice>
          ) : null}
          {search._tag === "Found" && search.records.length === 0 ? (
            <p className="status">{t.addSource.noResults}</p>
          ) : null}
          {search._tag === "Found" && search.records.length > 0 ? (
            <ul className="catalog-results" aria-label={t.addSource.results}>
              {search.records.map((record) => (
                <li key={record.id}>
                  <CatalogChoice
                    record={record}
                    chosen={record.id === chosen}
                    onChoose={() => onChoose(record)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {search._tag === "Found" && search.records.length > 0 ? (
            <p className="field__hint" style={{ marginTop: 8 }}>
              {t.addSource.notYourCopy}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function CatalogChoice({
  record: { details },
  chosen,
  onChoose,
}: {
  readonly record: CatalogRecord;
  readonly chosen: boolean;
  readonly onChoose: () => void;
}) {
  const t = useT();
  const author = [details.givenName, details.familyName].filter(Boolean).join(" ");
  const edition = t.addSource.resultEdition(details.publisher, details.editionYear);
  // Each part ends a phrase for screen readers, which otherwise read the row as one run-on name.
  const parts = [
    author,
    details.firstPublished === null ? null : t.source.firstPublished(details.firstPublished),
    edition,
  ].filter((part): part is string => part !== null && part !== "");
  return (
    <button type="button" className="choice" aria-pressed={chosen} onClick={onChoose}>
      <CallNumber source={details} />
      <cite>
        {details.title}
        <span className="sr-only">{t.addSource.partBreak}</span>
      </cite>
      {parts.map((part) => (
        <span key={part}>
          {part}
          <span className="sr-only">{t.addSource.partBreak}</span>
        </span>
      ))}
    </button>
  );
}

interface FieldOptions {
  readonly required?: boolean;
  readonly hint?: string;
  readonly wide?: boolean;
  readonly year?: boolean;
}

function Field({
  name,
  label,
  optionalLabel,
  hint,
  wide,
  year: isYear,
  error,
  value,
  fromCatalog,
  onChange,
  inputRef,
}: {
  readonly name: FieldName;
  readonly label: string;
  readonly optionalLabel: string | undefined;
  readonly hint: string | undefined;
  readonly wide: boolean | undefined;
  readonly year: boolean | undefined;
  readonly error: string | undefined;
  readonly value: string;
  readonly fromCatalog: boolean;
  readonly onChange: (value: string) => void;
  readonly inputRef: RefObject<HTMLInputElement | null> | undefined;
}) {
  const t = useT();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const catalogId = `${id}-catalog`;
  const describedBy = [
    hint === undefined ? null : hintId,
    fromCatalog ? catalogId : null,
    error === undefined ? null : errorId,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={wide ? "field field--wide" : "field"}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optionalLabel === undefined ? null : (
          <span className="field__optional"> ({optionalLabel})</span>
        )}
      </label>
      <input
        id={id}
        ref={inputRef}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input"
        required={optionalLabel === undefined}
        inputMode={isYear ? "numeric" : undefined}
        autoComplete="off"
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      />
      {hint === undefined ? null : (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {fromCatalog ? (
        <p className="field__hint field__hint--catalog" id={catalogId}>
          {t.addSource.fromCatalog}
        </p>
      ) : null}
      {error === undefined ? null : (
        <p className="field__error" id={errorId}>
          <CircleAlert className="call__icon" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

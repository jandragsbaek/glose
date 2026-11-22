import { useAtomSet } from "@effect/atom-react";
import type { CatalogRecord, SourceDetails } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { type FormEvent, useId, useRef, useState } from "react";

import { AddArticle } from "../components/AddArticle.tsx";
import { AddLessons } from "../components/AddLessons.tsx";
import { AddVideo } from "../components/AddVideo.tsx";
import {
  FillLine,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  MoreDetails,
  TextField,
} from "../components/textImport.tsx";
import { CallNumber, Notice, Page, Panel } from "../components/ui.tsx";
import {
  EMPTY_FORM,
  type FieldName,
  fillFromCatalog,
  type FormValues,
  formValuesOf,
} from "../domain/sourceForm.ts";
import { useT } from "../i18n/I18n.tsx";
import { createSourceAtom, KEYS, searchCatalogAtom } from "../state/vault.ts";

type AddKind = "book" | "article" | "lesson" | "video";
const KINDS = ["book", "article", "lesson", "video"] as const satisfies ReadonlyArray<AddKind>;

export const Route = createFileRoute("/sources/new")({
  component: AddSource,
  validateSearch: (search: Record<string, unknown>): AddSearch => ({
    ...(search.kind === "article" || search.kind === "lesson" || search.kind === "video"
      ? { kind: search.kind }
      : {}),
    ...(typeof search.family === "string" ? { family: search.family } : {}),
    ...(typeof search.given === "string" ? { given: search.given } : {}),
  }),
});

type AddSearch = {
  readonly kind?: AddKind;
  readonly family?: string;
  readonly given?: string;
};

function AddSource() {
  const t = useT();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const kind = search.kind ?? "book";
  const hintId = useId();
  const [saving, setSaving] = useState(false);
  return (
    <Page title={t.addSource.title}>
      <div className="add-source">
        <div className="add-source__kind">
          <fieldset className="kind-choice" aria-describedby={hintId} disabled={saving}>
            <legend className="sr-only">{t.kinds.label}</legend>
            {KINDS.map((option) => (
              <label key={option} className="kind-choice__option">
                <input
                  type="radio"
                  name="add-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() =>
                    void navigate({
                      to: "/sources/new",
                      search: {
                        ...(option === "book" ? {} : { kind: option }),
                        ...(search.family === undefined ? {} : { family: search.family }),
                        ...(search.given === undefined ? {} : { given: search.given }),
                      },
                      replace: true,
                    })
                  }
                />
                <span className="kind-choice__name">{t.kinds.names[option]}</span>
              </label>
            ))}
          </fieldset>
          <p className="kind-choice__hint" id={hintId}>
            {t.kinds.hints[kind]}
          </p>
        </div>
        <div hidden={kind !== "book"}>
          <AddBook author={search} onSaving={setSaving} />
        </div>
        <div hidden={kind !== "article"}>
          <AddArticle author={search} onSaving={setSaving} />
        </div>
        <div hidden={kind !== "lesson"}>
          <AddLessons onSaving={setSaving} />
        </div>
        <div hidden={kind !== "video"}>
          <AddVideo author={search} onSaving={setSaving} />
        </div>
      </div>
    </Page>
  );
}

const YEAR = /^-?\d{1,4}$/;
const YEAR_FIELDS = ["firstPublished", "editionYear"] as const;
const REQUIRED: ReadonlyArray<FieldName> = ["familyName", "title"];

const text = (values: FormValues, name: FieldName) => {
  const value = values[name].trim();
  return value === "" ? null : value;
};

const year = (values: FormValues, name: FieldName) => {
  const value = text(values, name);
  return value === null ? null : Number(value);
};

interface Fill {
  readonly record: CatalogRecord;
  readonly filled: ReadonlyArray<FieldName>;
  readonly kept: ReadonlyArray<FieldName>;
  readonly replaced: ReadonlyArray<FieldName>;
  readonly before: { readonly values: FormValues; readonly fill: Fill | null };
}

const forget = (fill: Fill | null, name: FieldName): Fill | null =>
  fill === null
    ? null
    : {
        ...fill,
        filled: fill.filled.filter((other) => other !== name),
        replaced: fill.replaced.filter((other) => other !== name),
        before: { ...fill.before, fill: forget(fill.before.fill, name) },
      };

type FieldProblem = "need" | "year";

type Search =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Searching" }
  | { readonly _tag: "Found"; readonly records: ReadonlyArray<CatalogRecord> }
  | { readonly _tag: "Unavailable" };

type Failure = "fields" | "storage" | { readonly nameTaken: string };

const FOLDED: ReadonlyArray<FieldName> = ["edition", "translator"];

function AddBook({
  author,
  onSaving,
}: {
  readonly author: { readonly family?: string; readonly given?: string };
  readonly onSaving: (saving: boolean) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const createSource = useAtomSet(createSourceAtom, { mode: "promiseExit" });
  const [errors, setErrors] = useState<Partial<Record<FieldName, FieldProblem>>>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<FormValues>(() => ({
    ...EMPTY_FORM,
    familyName: author.family ?? "",
    givenName: author.given ?? "",
  }));
  const [fill, setFill] = useState<Fill | null>(null);
  const [more, setMore] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const focusFirstField = () => {
    const input = firstFieldRef.current;
    input?.scrollIntoView({ block: "center" });
    input?.focus({ preventScroll: true });
  };

  const choose = (record: CatalogRecord) => {
    const filled = fillFromCatalog(values, fill?.filled ?? [], formValuesOf(record.details));
    setFill({
      record,
      filled: filled.filled,
      kept: filled.kept,
      replaced: filled.replaced,
      before: { values, fill },
    });
    setValues(filled.values);
    setErrors({});
    setFailure(null);
    if (FOLDED.some((name) => filled.values[name] !== "")) setMore(true);
    focusFirstField();
  };

  const undoFill = () => {
    if (fill === null) return;
    const untouched = fill.replaced.map((name) => [name, fill.before.values[name]] as const);
    setValues((current) => ({ ...current, ...Object.fromEntries(untouched) }));
    setFill(fill.before.fill);
    focusAfterRender(firstFieldRef);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: Partial<Record<FieldName, FieldProblem>> = {};
    for (const name of REQUIRED) {
      if (text(values, name) === null) found[name] = "need";
    }
    for (const name of YEAR_FIELDS) {
      const value = text(values, name);
      if (value !== null && !YEAR.test(value)) found[name] = "year";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFailure("fields");
      focusFirstProblem(formRef.current);
      return;
    }

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
    setFailure(null);
    setBusy(true);
    onSaving(true);
    const exit = await createSource({ payload: details, reactivityKeys: KEYS.sources });
    setBusy(false);
    onSaving(false);
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

  const field = (
    name: FieldName,
    label: string,
    options: { readonly required?: boolean; readonly hint?: string; readonly wide?: boolean } = {},
  ) => (
    <TextField
      name={name}
      label={label}
      required={options.required ?? false}
      hint={options.hint}
      wide={options.wide ?? false}
      inputMode={YEAR_FIELDS.some((other) => other === name) ? "numeric" : undefined}
      error={
        errors[name] === undefined
          ? undefined
          : errors[name] === "year"
            ? t.addSource.yearInvalid
            : t.importText.needField
      }
      value={values[name]}
      filledFrom={fill?.filled.includes(name) ? t.addSource.fromCatalog : undefined}
      onChange={(value) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors(({ [name]: _, ...rest }) => rest);
        setFill((current) => forget(current, name));
      }}
      inputRef={name === "familyName" ? firstFieldRef : undefined}
    />
  );

  return (
    <Panel title={t.addSource.book} initial="rubric">
      <div className="panel__body">
        <FindBook chosen={fill?.record.id ?? null} onChoose={choose} />
      </div>
      <form ref={formRef} className="add-source__form" onSubmit={submit} noValidate>
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {fill === null || (fill.filled.length === 0 && fill.replaced.length === 0) ? null : (
              <FillLine marked={fill.filled.length > 0} onUndo={undoFill}>
                {fill.filled.length > 0 ? t.addSource.filled : t.addSource.emptied}
                {fill.kept.length === 0 ? null : ` ${t.addSource.keptTyped}`}
              </FillLine>
            )}
          </div>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addSource.author}</legend>
            {field("familyName", t.addSource.familyName, { required: true })}
            {field("givenName", t.addSource.givenName)}
          </fieldset>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addSource.work}</legend>
            {field("title", t.addSource.titleField, { required: true, wide: true })}
            {field("firstPublished", t.addSource.firstPublished, {
              hint: t.addSource.firstPublishedHint,
            })}
            {field("editionYear", t.addSource.editionYear, { hint: t.addSource.editionYearHint })}
            {field("publisher", t.addSource.publisher, { wide: true })}
            <MoreDetails summary={t.addSource.more} open={more} onToggle={setMore}>
              {field("edition", t.addSource.edition, { hint: t.addSource.editionHint })}
              {field("translator", t.addSource.translator)}
            </MoreDetails>
          </fieldset>
        </div>
        <FormFoot
          problem={
            failure === null
              ? null
              : failure === "fields"
                ? t.addSource.checkFields
                : failure === "storage"
                  ? `${t.errors.storage} ${t.errors.storageRecovery}`
                  : t.addSource.nameTaken(failure.nameTaken)
          }
        >
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? t.importText.adding : t.addSource.submit}
          </button>
          <Link to="/sources" className="button button--quiet">
            {t.addSource.cancel}
          </Link>
        </FormFoot>
      </form>
    </Panel>
  );
}

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
  const [folded, setFolded] = useState(false);
  const latest = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
    if (query === "") return;
    const request = ++latest.current;
    setFolded(false);
    setSearch({ _tag: "Searching" });
    const exit = await searchCatalog({ payload: { query } });
    if (request !== latest.current) return;
    setSearch(
      Exit.isSuccess(exit) ? { _tag: "Found", records: exit.value } : { _tag: "Unavailable" },
    );
  };

  const records = search._tag === "Found" ? search.records : [];
  const showOnlyChosen =
    folded && records.length > 1 && records.some((record) => record.id === chosen);
  const shown = showOnlyChosen ? records.filter((record) => record.id === chosen) : records;

  return (
    <div className="find-book">
      <form role="search" onSubmit={submit}>
        <div className="field">
          <label className="field__label" htmlFor={inputId}>
            {t.addSource.searchLabel}
          </label>
          <div className="find-book__row">
            <input
              id={inputId}
              name="query"
              type="search"
              className="input"
              autoComplete="off"
              aria-describedby={hintId}
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
      <div aria-live="polite" className="find-book__answer">
        {search._tag === "Searching" ? <p className="status">{t.addSource.searching}</p> : null}
        {search._tag === "Unavailable" ? (
          <Notice tone="warning">
            <p>{t.addSource.unavailable}</p>
          </Notice>
        ) : null}
        {search._tag === "Found" && records.length === 0 ? (
          <p className="status">{t.addSource.noResults}</p>
        ) : null}
        {shown.length > 0 ? (
          <ul ref={listRef} className="catalog-results" aria-label={t.addSource.results}>
            {shown.map((record) => (
              <li key={record.id}>
                <CatalogChoice
                  record={record}
                  chosen={record.id === chosen}
                  onChoose={() => {
                    setFolded(true);
                    onChoose(record);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {showOnlyChosen ? (
          <button
            type="button"
            className="link-button find-book__more"
            onClick={() => {
              setFolded(false);
              requestAnimationFrame(() =>
                listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus(),
              );
            }}
          >
            {t.addSource.showResults(records.length)}
          </button>
        ) : null}
      </div>
    </div>
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
  const parts = [
    author,
    details.firstPublished === null ? null : t.source.firstPublished(details.firstPublished),
    edition,
  ].filter((part): part is string => part !== null && part !== "");
  return (
    <button type="button" className="choice" aria-pressed={chosen} onClick={onChoose}>
      <CallNumber source={details} />
      <span className="choice__text">
        <cite>
          {details.title}
          <span className="sr-only">{t.addSource.partBreak}</span>
        </cite>
        {parts.map((part) => (
          <span key={part} className="choice__meta">
            {part}
            <span className="sr-only">{t.addSource.partBreak}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

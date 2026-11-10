import { useAtomSet } from "@effect/atom-react";
import type { SourceDetails } from "@glose/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { Notice, Page, Panel } from "../components/ui.tsx";
import { useT } from "../i18n/I18n.tsx";
import { createSourceAtom, KEYS } from "../state/graph.ts";

export const Route = createFileRoute("/sources/new")({ component: AddSource });

type FieldName =
  | "familyName"
  | "givenName"
  | "title"
  | "firstPublished"
  | "edition"
  | "editionYear"
  | "publisher"
  | "translator";

const YEAR = /^-?\d{1,4}$/;
const YEAR_FIELDS = ["firstPublished", "editionYear"] as const;

const text = (form: FormData, name: FieldName) => {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : value;
};

const year = (form: FormData, name: FieldName) => {
  const value = text(form, name);
  return value === null ? null : Number(value);
};

function AddSource() {
  const t = useT();
  const navigate = useNavigate();
  const createSource = useAtomSet(createSourceAtom, { mode: "promiseExit" });
  const [invalidYears, setInvalidYears] = useState<ReadonlyArray<FieldName>>([]);
  const [failure, setFailure] = useState<{ readonly nameTaken: string } | "storage" | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const invalid = YEAR_FIELDS.filter((name) => {
      const value = text(form, name);
      return value !== null && !YEAR.test(value);
    });
    setInvalidYears(invalid);
    if (invalid.length > 0) return;

    const details: SourceDetails = {
      familyName: text(form, "familyName") ?? "",
      givenName: text(form, "givenName"),
      title: text(form, "title") ?? "",
      firstPublished: year(form, "firstPublished"),
      edition: text(form, "edition"),
      editionYear: year(form, "editionYear"),
      publisher: text(form, "publisher"),
      translator: text(form, "translator"),
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
    />
  );

  return (
    <Page title={t.addSource.title}>
      <div className="narrow">
        <p className="empty" style={{ marginBottom: 20 }}>
          {t.addSource.intro}
        </p>
        <form className="form" onSubmit={submit}>
          <Panel title={t.addSource.author} initial="rubric">
            <div className="panel__body">
              <fieldset className="fieldset">
                <legend className="sr-only">{t.addSource.author}</legend>
                {field("familyName", t.addSource.familyName, { required: true })}
                {field("givenName", t.addSource.givenName)}
              </fieldset>
            </div>
          </Panel>
          <Panel title={t.addSource.work} initial="lapis">
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
}: {
  readonly name: FieldName;
  readonly label: string;
  readonly optionalLabel: string | undefined;
  readonly hint: string | undefined;
  readonly wide: boolean | undefined;
  readonly year: boolean | undefined;
  readonly error: string | undefined;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
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
        name={name}
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
      {error === undefined ? null : (
        <p className="field__error" id={errorId}>
          <CircleAlert className="call__icon" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

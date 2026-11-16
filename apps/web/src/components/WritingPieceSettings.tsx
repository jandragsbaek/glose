import {
  bibliographyEntry,
  type CitationStyle,
  noteCitation,
  type ReferenceForm,
  type ResolvedReference,
  shortCitation,
  type WritingProjectFields,
  type WritingProjectType,
} from "@glose/contracts";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { Citation } from "./WritingProof.tsx";

const TYPES: ReadonlyArray<WritingProjectType> = ["blog-post", "assignment"];
const FORMS: ReadonlyArray<ReferenceForm> = ["footnotes", "links", "side-notes"];
const STYLES: ReadonlyArray<CitationStyle> = ["chicago", "apa", "harvard"];

export function PieceSettings({
  fields,
  onChange,
}: {
  readonly fields: WritingProjectFields;
  readonly onChange: (change: Partial<WritingProjectFields>) => void;
}) {
  const t = useT();
  const id = useId();
  const languageId = useId();
  const sample: ResolvedReference = {
    start: 0,
    end: 0,
    target: "",
    location: "64",
    number: 1,
    noteId: null,
    page: "64",
    quote: null,
    problems: [],
    source: {
      id: "",
      familyName: "Newport",
      givenName: "Cal",
      title: "Deep Work",
      firstPublished: 2016,
      edition: null,
      editionYear: null,
      publisher: "Grand Central Publishing",
      translator: null,
    },
  };
  const source = sample.source;
  const slip = useRef<HTMLDetailsElement | null>(null);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- listeners, not state: the open slip closes on a click outside it or on Esc, as a menu does.
  useEffect(() => {
    const close = (event: Event) => {
      const node = slip.current;
      if (node === null || !node.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !node.contains(event.target as Node)
      ) {
        node.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details className="piece-settings" ref={slip}>
      <summary className="piece-settings__chip">
        <span className="sr-only">{t.writing.settingsOfPiece}: </span>
        {fields.type === "blog-post"
          ? `${t.writing.types[fields.type]} · ${t.writing.referenceForms[fields.referenceForm]}`
          : `${t.writing.types[fields.type]} · ${t.writing.citationStyles[fields.citationStyle]}`}
        <ChevronDown className="piece-settings__icon" aria-hidden="true" />
      </summary>
      <div className="piece-settings__panel">
        <fieldset className="piece-settings__group">
          <legend className="piece-settings__legend">{t.writing.typeLabel}</legend>
          {TYPES.map((type) => (
            <label key={type} className="piece-settings__choice">
              <input
                type="radio"
                name={`${id}-type`}
                checked={fields.type === type}
                onChange={() => onChange({ type })}
              />
              <span>
                <span className="piece-settings__choice-title">{t.writing.types[type]}</span>
                <span className="piece-settings__choice-text">{t.writing.endsAs[type]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {fields.type === "blog-post" ? (
          <fieldset className="piece-settings__group">
            <legend className="piece-settings__legend">{t.writing.referenceFormLabel}</legend>
            <div className="segmented">
              {FORMS.map((form) => (
                <label key={form}>
                  <input
                    type="radio"
                    name={`${id}-form`}
                    checked={fields.referenceForm === form}
                    onChange={() => onChange({ referenceForm: form })}
                  />
                  <span>{t.writing.referenceForms[form]}</span>
                </label>
              ))}
            </div>
            {source === null ? null : (
              <p className="piece-settings__sample">
                {t.writing.sample}
                {fields.referenceForm === "links" ? (
                  <span className="piece-settings__link">
                    {` (${shortCitation(source, "64", "chicago")})`}
                  </span>
                ) : (
                  <sup>1</sup>
                )}
                <span className="piece-settings__sample-note">
                  {fields.referenceForm === "links" ? (
                    <Citation text={bibliographyEntry(source, "chicago")} />
                  ) : (
                    <>
                      1. <Citation text={noteCitation(source, "64")} />
                    </>
                  )}
                </span>
              </p>
            )}
            <p className="field__hint">{t.writing.referenceFormHint}</p>
          </fieldset>
        ) : (
          <fieldset className="piece-settings__group">
            <legend className="piece-settings__legend">{t.writing.citationStyleLabel}</legend>
            <div className="segmented">
              {STYLES.map((style) => (
                <label key={style}>
                  <input
                    type="radio"
                    name={`${id}-style`}
                    checked={fields.citationStyle === style}
                    onChange={() => onChange({ citationStyle: style })}
                  />
                  <span>{t.writing.citationStyles[style]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="field">
          <label className="field__label" htmlFor={languageId}>
            {t.writing.languageLabel}
          </label>
          <span className="select">
            <select
              id={languageId}
              className="input"
              value={fields.language}
              onChange={(event) => onChange({ language: event.target.value })}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t.languages[language]}
                </option>
              ))}
              {LANGUAGES.some((language) => language === fields.language) ? null : (
                <option value={fields.language}>{fields.language}</option>
              )}
            </select>
            <ChevronDown className="select__icon" aria-hidden="true" />
          </span>
        </div>
      </div>
    </details>
  );
}

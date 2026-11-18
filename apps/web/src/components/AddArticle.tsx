import { useAtomSet } from "@effect/atom-react";
import {
  type ArticleType,
  BOOK_TEXT_DETAILS,
  type ImportText,
  parseArticle,
} from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { CircleAlert, FileText } from "lucide-react";
import { type ChangeEvent, type FormEvent, useId, useRef, useState } from "react";

import {
  type ArticleField,
  articleValuesOf,
  type ArticleValues,
  EMPTY_ARTICLE,
  FIELDS_OF,
  fillFromFile,
  folded,
  SHOWN_OF,
  TYPES,
} from "../domain/articleForm.ts";
import { detailsFromMarkdown, isMarkdownName } from "../domain/importText.ts";
import type { Messages } from "../i18n/en.ts";
import { useT } from "../i18n/I18n.tsx";
import { importTextAtom, KEYS } from "../state/graph.ts";
import {
  blank,
  DropZone,
  cursorIsFree,
  FillLine,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  MoreDetails,
  readFiles,
  type TextFile,
  TextField,
  today,
  YEAR,
} from "./textImport.tsx";
import { Panel } from "./ui.tsx";

type Say = (t: Messages) => string;

export function AddArticle() {
  const t = useT();
  const navigate = useNavigate();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const fileRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const anotherRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pasteId = useId();
  const problemId = useId();
  const [text, setText] = useState<TextFile | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [type, setTypeState] = useState<ArticleType>("web");
  const typeRef = useRef(type);
  const wayInRef = useRef<HTMLDivElement>(null);
  const setType = (next: ArticleType) => {
    typeRef.current = next;
    setTypeState(next);
  };
  const [values, setValues] = useState<ArticleValues>({ ...EMPTY_ARTICLE, accessed: today() });
  const [filled, setFilled] = useState<ReadonlyArray<ArticleField>>([]);
  const [problem, setProblem] = useState<{ readonly say: Say } | null>(null);
  const [submitProblem, setSubmitProblem] = useState<{ readonly say: Say } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [fromPaste, setFromPaste] = useState(false);
  const [reading, setReading] = useState(false);
  const readRef = useRef(0);
  const valuesRef = useRef(values);
  const filledRef = useRef(filled);
  const [missing, setMissing] = useState<ReadonlyArray<ArticleField>>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const article = text === null ? null : parseArticle(text.markdown);

  const writeValues = (next: ArticleValues) => {
    valuesRef.current = next;
    setValues(next);
  };

  const writeFilled = (next: ReadonlyArray<ArticleField>) => {
    filledRef.current = next;
    setFilled(next);
  };

  const take = (found: TextFile, pasted = false) => {
    if (found.markdown.trim() === "") {
      setProblem({ say: (m) => m.importText.empty });
      return;
    }
    setProblem(null);
    setText(found);
    setFromPaste(pasted);
    setChoosing(false);
    setPasting(false);
    if (pasted || cursorIsFree(wayInRef.current)) focusAfterRender(anotherRef);
    const details = detailsFromMarkdown(found.markdown);
    const next = articleValuesOf(details);
    const fill = fillFromFile(valuesRef.current, filledRef.current, next);
    writeValues(fill.values);
    writeFilled(fill.filled);
    const keys = fill.filled;
    setMissing([]);
    setSubmitProblem(null);
    const nextType = details.doi === null ? typeRef.current : "paper";
    setType(nextType);
    if (keys.some((key) => key === "otherAuthors" || folded(nextType).includes(key))) {
      setMore(true);
    }
  };

  const onFiles = async (pending: Promise<ReadonlyArray<File>>) => {
    if (busy) return;
    const request = ++readRef.current;
    setReading(true);
    try {
      const [file] = await pending;
      if (request !== readRef.current || file === undefined) return;
      if (!isMarkdownName(file.name)) {
        setProblem({ say: (m) => m.importText.notMarkdown(file.name) });
        return;
      }
      const [found] = await readFiles([file]);
      if (request === readRef.current && found !== undefined) take(found);
    } catch {
      if (request === readRef.current) setProblem({ say: (m) => m.importText.readFailed });
    } finally {
      if (request === readRef.current) setReading(false);
    }
  };

  const cancelRead = () => {
    readRef.current += 1;
    setReading(false);
  };

  const keep = () => {
    cancelRead();
    setChoosing(false);
    setPasting(false);
    setProblem(null);
    focusAfterRender(anotherRef);
  };

  const set = (name: ArticleField) => (value: string) => {
    writeValues({ ...valuesRef.current, [name]: value });
    writeFilled(filledRef.current.filter((other) => other !== name));
    setMissing((current) => current.filter((other) => other !== name));
  };

  const year = /\b(\d{4})\b/.exec(values.published)?.[1] ?? null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (text === null) {
      setMissing([]);
      setSubmitProblem(null);
      setProblem({ say: (m) => (pasting ? m.importText.needPasted : m.importText.needText) });
      focusAfterRender(pasting ? pasteRef : chooseRef);
      return;
    }
    const empty = (["familyName", "title"] as const).filter((name) => values[name].trim() === "");
    const lacking: ReadonlyArray<ArticleField> = [
      ...empty,
      ...(year === null || !YEAR.test(year) ? (["published"] as const) : []),
    ];
    setMissing(lacking);
    if (lacking.length > 0) {
      setSubmitProblem({ say: (m) => m.addSource.checkFields });
      focusFirstProblem(formRef.current);
      return;
    }
    setSubmitProblem(null);
    const shown = new Set(FIELDS_OF[type]);
    const kept = (name: ArticleField) => (shown.has(name) ? blank(values[name]) : null);
    const payload: ImportText = {
      ...BOOK_TEXT_DETAILS,
      kind: "article",
      articleType: type,
      familyName: values.familyName.trim(),
      givenName: blank(values.givenName),
      otherAuthors: values.otherAuthors
        .split(/\n/)
        .map((name) => name.trim())
        .filter((name) => name !== ""),
      title: values.title.trim(),
      firstPublished: Number(year),
      edition: null,
      editionYear: null,
      publisher: null,
      translator: null,
      container: blank(values.container),
      published: blank(values.published),
      volume: kept("volume"),
      issue: kept("issue"),
      pages: kept("pages"),
      doi: kept("doi"),
      url: kept("url"),
      accessed: kept("accessed"),
      markdown: text.markdown,
    };
    setBusy(true);
    const exit = await importText({ payload, reactivityKeys: KEYS.sources });
    setBusy(false);
    if (Exit.isSuccess(exit)) {
      await navigate({
        to: "/sources/$sourceId",
        params: { sourceId: exit.value.id },
        search: {},
      });
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    const taken = Option.isSome(error) && error.value._tag === "SourceNameTaken";
    const fileName = taken ? error.value.fileName : "";
    setSubmitProblem({
      say: (m) =>
        taken ? m.addSource.nameTaken(fileName) : `${m.errors.storage} ${m.errors.storageRecovery}`,
    });
  };

  const errorOf = (name: ArticleField) =>
    name === "published" ? t.importText.needYear : t.importText.needField;

  const field = (
    name: ArticleField,
    label: string,
    options: { readonly required?: boolean; readonly wide?: boolean; readonly hint?: string } = {},
  ) => (
    <TextField
      key={name}
      label={label}
      value={values[name]}
      onChange={set(name)}
      filledFrom={
        filled.includes(name)
          ? fromPaste
            ? t.importText.fromPaste
            : t.importText.fromFile
          : undefined
      }
      {...options}
      error={missing.includes(name) ? errorOf(name) : undefined}
      multiline={name === "otherAuthors"}
      {...(name === "url" ? { inputMode: "url" as const } : {})}
    />
  );

  const extraLabels: Record<ArticleField, string> = {
    familyName: t.addSource.familyName,
    givenName: t.addSource.givenName,
    otherAuthors: t.importText.otherAuthors,
    title: t.addSource.titleField,
    published: t.importText.published,
    container: t.importText.containers[type],
    volume: t.importText.volume,
    issue: t.importText.issue,
    pages: t.importText.pages,
    doi: t.importText.doi,
    url: t.importText.url,
    accessed: t.importText.accessed,
  };

  return (
    <Panel title={t.importText.article} initial="rubric">
      <div ref={wayInRef} className="panel__body">
        {text === null || choosing ? (
          pasting ? (
            <div className="field">
              <label className="field__label" htmlFor={pasteId}>
                {t.importText.pasteLabel}
              </label>
              <textarea
                ref={pasteRef}
                id={pasteId}
                className="textarea add-text__paste"
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                spellCheck={false}
              />
              <div className="button-row">
                <button
                  type="button"
                  className="button button--primary"
                  disabled={pasted.trim() === ""}
                  onClick={() => {
                    cancelRead();
                    take({ name: t.importText.pasted, markdown: pasted }, true);
                  }}
                >
                  {t.importText.usePasted}
                </button>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => {
                    setPasting(false);
                    setProblem(null);
                    focusAfterRender(chooseRef);
                  }}
                >
                  {t.importText.backToFile}
                </button>
              </div>
            </div>
          ) : (
            <DropZone onFiles={(files) => void onFiles(files)} hint={t.importText.dropHint}>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  void onFiles(Promise.resolve([...(event.currentTarget.files ?? [])]));
                  event.currentTarget.value = "";
                }}
              />
              <button
                ref={chooseRef}
                type="button"
                aria-describedby={problem === null ? undefined : problemId}
                className="button button--primary"
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="button__icon" aria-hidden="true" />
                {t.importText.chooseFile}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => {
                  cancelRead();
                  setPasting(true);
                  setProblem(null);
                  focusAfterRender(pasteRef);
                }}
              >
                {t.importText.paste}
              </button>
              {text === null ? null : (
                <button type="button" className="button button--quiet" onClick={keep}>
                  {fromPaste ? t.importText.keepPasted : t.importText.keep(text.name)}
                </button>
              )}
            </DropZone>
          )
        ) : (
          <div className="add-text__chosen">
            <FileText className="add-text__icon" aria-hidden="true" />
            <div className="add-text__file">
              <p className="add-text__name">{fromPaste ? t.importText.pasted : text.name}</p>
              <p className="add-text__meta">
                {article === null
                  ? null
                  : t.importText.chosenMeta(article.units.length, article.words)}
              </p>
            </div>
            <button
              ref={anotherRef}
              type="button"
              className="button button--small"
              disabled={busy}
              onClick={() => {
                setChoosing(true);
                setPasting(false);
                focusAfterRender(chooseRef);
              }}
            >
              {t.importText.another}
            </button>
          </div>
        )}
        <p role="status" className="add-text__status" id={problemId}>
          {problem === null ? (
            reading ? (
              <span className="form-status">{t.importText.reading}</span>
            ) : null
          ) : (
            <span className="field__error">
              <CircleAlert className="field__error-icon" aria-hidden="true" />
              {problem.say(t)}
            </span>
          )}
        </p>
      </div>
      <form ref={formRef} className="add-source__form" onSubmit={submit} noValidate>
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {filled.length === 0 ? null : (
              <FillLine>
                {fromPaste ? t.importText.filledFromPaste : t.importText.filledFromFile}
              </FillLine>
            )}
          </div>
          <fieldset className="add-text__type">
            <legend className="field__label">{t.importText.type}</legend>
            <div className="segmented">
              {TYPES.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="article-type"
                    value={option}
                    checked={type === option}
                    onChange={() => setType(option)}
                  />
                  <span>{t.kinds.articleTypes[option]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addSource.author}</legend>
            {field("familyName", t.addSource.familyName, { required: true })}
            {field("givenName", t.addSource.givenName)}
          </fieldset>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.addSource.work}</legend>
            {field("title", t.addSource.titleField, { required: true, wide: true })}
            {field("published", t.importText.published, {
              required: true,
              hint: t.importText.publishedHint,
            })}
            {field("container", t.importText.containers[type])}
            {SHOWN_OF[type].map((name) => field(name, extraLabels[name], { wide: true }))}
            <MoreDetails summary={t.importText.more[type]} open={more} onToggle={setMore}>
              {field("otherAuthors", t.importText.otherAuthors, {
                wide: true,
                hint: t.importText.otherAuthorsHint,
              })}
              {folded(type).map((name) =>
                field(name, extraLabels[name], {
                  ...(name === "url" ? { wide: true } : {}),
                  ...(name === "accessed" ? { hint: t.importText.accessedHint } : {}),
                }),
              )}
            </MoreDetails>
          </fieldset>
        </div>
        <FormFoot problem={submitProblem === null ? null : submitProblem.say(t)}>
          <button
            type="submit"
            className={text === null || choosing ? "button" : "button button--primary"}
            disabled={busy || reading}
          >
            {busy ? t.importText.adding : t.importText.submit}
          </button>
          <Link to="/sources" className="button button--quiet">
            {t.addSource.cancel}
          </Link>
        </FormFoot>
      </form>
    </Panel>
  );
}

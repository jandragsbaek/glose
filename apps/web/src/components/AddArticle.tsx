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

import { detailsFromMarkdown, isMarkdownName } from "../domain/importText.ts";
import { useT } from "../i18n/I18n.tsx";
import { importTextAtom, KEYS } from "../state/graph.ts";
import {
  blank,
  DropZone,
  FillLine,
  FormFoot,
  MoreDetails,
  readFiles,
  type TextFile,
  TextField,
  today,
  YEAR,
} from "./textImport.tsx";
import { Panel } from "./ui.tsx";

const ARTICLE_FIELDS = [
  "familyName",
  "givenName",
  "otherAuthors",
  "title",
  "published",
  "container",
  "volume",
  "issue",
  "pages",
  "doi",
  "url",
  "accessed",
] as const;
type ArticleField = (typeof ARTICLE_FIELDS)[number];
type ArticleValues = Record<ArticleField, string>;

const EMPTY_ARTICLE: ArticleValues = {
  familyName: "",
  givenName: "",
  otherAuthors: "",
  title: "",
  published: "",
  container: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
  accessed: "",
};

const TYPES = ["paper", "web", "press"] as const satisfies ReadonlyArray<ArticleType>;

const FIELDS_OF: Record<ArticleType, ReadonlyArray<ArticleField>> = {
  paper: ["volume", "issue", "pages", "doi", "url"],
  web: ["url", "accessed"],
  press: ["pages", "url"],
};

const SHOWN_OF: Record<ArticleType, ReadonlyArray<ArticleField>> = {
  paper: ["doi"],
  web: ["url"],
  press: ["url"],
};

export function AddArticle() {
  const t = useT();
  const navigate = useNavigate();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const [text, setText] = useState<TextFile | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [type, setType] = useState<ArticleType>("web");
  const [values, setValues] = useState<ArticleValues>({ ...EMPTY_ARTICLE, accessed: today() });
  const [filled, setFilled] = useState<ReadonlyArray<ArticleField>>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [submitProblem, setSubmitProblem] = useState<string | null>(null);
  const [missing, setMissing] = useState<ReadonlyArray<ArticleField>>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const article = text === null ? null : parseArticle(text.markdown);

  const take = (found: TextFile) => {
    if (found.markdown.trim() === "") {
      setProblem(t.importText.empty);
      return;
    }
    setProblem(null);
    setText(found);
    const details = detailsFromMarkdown(found.markdown);
    const next: Partial<ArticleValues> = {
      ...(details.family === null ? {} : { familyName: details.family }),
      ...(details.given === null ? {} : { givenName: details.given }),
      ...(details.otherAuthors.length === 0
        ? {}
        : { otherAuthors: details.otherAuthors.join("\n") }),
      ...(details.title === null ? {} : { title: details.title }),
      ...(details.published === null ? {} : { published: details.published }),
      ...(details.container === null ? {} : { container: details.container }),
      ...(details.url === null ? {} : { url: details.url }),
      ...(details.doi === null ? {} : { doi: details.doi }),
    };
    const keys = (Object.keys(next) as ArticleField[]).filter(
      (key) => values[key].trim() === "" || filled.includes(key),
    );
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(keys.map((key) => [key, next[key] ?? ""])),
    }));
    setFilled(keys);
    setMissing((current) => current.filter((name) => !keys.includes(name)));
    setSubmitProblem(null);
    const nextType = details.doi === null ? type : "paper";
    setType(nextType);
    if (keys.some((key) => key === "otherAuthors" || folded(nextType).includes(key))) {
      setMore(true);
    }
  };

  const onFiles = async (files: ReadonlyArray<File>) => {
    const file = files[0];
    if (file === undefined) return;
    if (!isMarkdownName(file.name)) {
      setProblem(t.importText.notMarkdown(file.name));
      return;
    }
    try {
      const [found] = await readFiles([file]);
      if (found !== undefined) take(found);
    } catch {
      setProblem(t.importText.readFailed);
    }
  };

  const set = (name: ArticleField) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFilled((current) => current.filter((other) => other !== name));
    setMissing((current) => current.filter((other) => other !== name));
  };

  const year = /\b(\d{4})\b/.exec(values.published)?.[1] ?? null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const empty = (["familyName", "title"] as const).filter((name) => values[name].trim() === "");
    const lacking: ReadonlyArray<ArticleField> = [
      ...empty,
      ...(year === null || !YEAR.test(year) ? (["published"] as const) : []),
    ];
    setMissing(lacking);
    if (text === null) {
      setSubmitProblem(t.importText.needText);
      return;
    }
    if (lacking.length > 0) {
      setSubmitProblem(t.importText.needDetails);
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
    setSubmitProblem(
      Option.isSome(error) && error.value._tag === "SourceNameTaken"
        ? t.addSource.nameTaken(error.value.fileName)
        : t.errors.storage,
    );
  };

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
      filledFrom={filled.includes(name) ? t.importText.fromFile : undefined}
      {...options}
      error={missing.includes(name) ? errorOf(name) : undefined}
      multiline={name === "otherAuthors"}
      {...(name === "url" ? { inputMode: "url" as const } : {})}
    />
  );

  const errorOf = (name: ArticleField) =>
    name === "published" ? t.importText.needYear : t.importText.needField;

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
      <div className="panel__body">
        {text === null ? (
          pasting ? (
            <div className="field">
              <label className="field__label" htmlFor={pasteId}>
                {t.importText.pasteLabel}
              </label>
              <textarea
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
                  onClick={() => take({ name: t.importText.pasted, markdown: pasted })}
                >
                  {t.importText.usePasted}
                </button>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => setPasting(false)}
                >
                  {t.addSource.cancel}
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
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  void onFiles([...(event.target.files ?? [])])
                }
              />
              <button
                type="button"
                className="button button--primary"
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="button__icon" aria-hidden="true" />
                {t.importText.chooseFile}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setPasting(true)}
              >
                {t.importText.paste}
              </button>
            </DropZone>
          )
        ) : (
          <div className="add-text__chosen">
            <FileText className="add-text__icon" aria-hidden="true" />
            <div className="add-text__file">
              <p className="add-text__name">{text.name}</p>
              <p className="add-text__meta">
                {article === null
                  ? null
                  : t.importText.chosenMeta(article.units.length, article.words)}
              </p>
            </div>
            <button
              type="button"
              className="button button--small"
              onClick={() => {
                setText(null);
                setPasted("");
              }}
            >
              {t.importText.another}
            </button>
          </div>
        )}
        <p role="status" className="add-text__status">
          {problem === null ? null : (
            <span className="field__error">
              <CircleAlert className="field__error-icon" aria-hidden="true" />
              {problem}
            </span>
          )}
        </p>
      </div>
      <form className="add-source__form" onSubmit={submit} noValidate>
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {filled.length === 0 ? null : <FillLine>{t.importText.filledFromFile}</FillLine>}
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
        <FormFoot problem={submitProblem}>
          <button type="submit" className="button button--primary" disabled={busy}>
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

const folded = (type: ArticleType): ReadonlyArray<ArticleField> =>
  FIELDS_OF[type].filter((name) => !SHOWN_OF[type].includes(name));

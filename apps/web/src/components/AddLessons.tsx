import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { BOOK_TEXT_DETAILS, parseArticle } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { CircleAlert, FolderOpen } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import {
  byFileName,
  comparePart,
  detailsFromMarkdown,
  isMarkdownName,
  lessonTitle,
  partByOrder,
  partFromName,
} from "../domain/importText.ts";
import { useT } from "../i18n/I18n.tsx";
import { importTextAtom, sourcesAtom } from "../state/graph.ts";
import {
  blank,
  DropZone,
  FillLine,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  PART,
  readFiles,
  TextField,
  YEAR,
} from "./textImport.tsx";
import { type Lesson, LessonTable } from "./LessonTable.tsx";
import { Panel } from "./ui.tsx";

type CourseField = "name" | "family" | "given" | "year" | "url";
type Course = Record<CourseField, string>;
const FROM_FILES = [
  "name",
  "family",
  "given",
  "year",
] as const satisfies ReadonlyArray<CourseField>;

export function AddLessons() {
  const t = useT();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => []);
  const refreshSources = useAtomRefresh(sourcesAtom);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const [lessons, setLessons] = useState<ReadonlyArray<Lesson>>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [course, setCourse] = useState<Course>({
    name: "",
    family: "",
    given: "",
    year: "",
    url: "",
  });
  const [courseFilled, setCourseFilled] = useState<ReadonlyArray<CourseField>>([]);
  const [errors, setErrors] = useState<Partial<Record<CourseField, string>>>({});
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ readonly done: number; readonly all: number } | null>(
    null,
  );
  const [finished, setFinished] = useState<{ added: number; skipped: number } | null>(null);
  const [perWeek, setPerWeek] = useState("5");
  const perWeekId = useId();
  const fileProblemId = useId();
  const partProblemId = useId();
  const busy = progress !== null;

  const taken = (part: string) =>
    sources.some(
      (source) =>
        source.kind === "lesson" &&
        source.container !== null &&
        source.container.toLowerCase() === course.name.trim().toLowerCase() &&
        source.part === part,
    );

  const onFiles = async (files: ReadonlyArray<File>) => {
    if (busyRef.current) return;
    const markdown = files.filter((file) => isMarkdownName(file.name));
    setSkipped(files.length - markdown.length);
    if (markdown.length === 0) {
      setFileProblem(t.lessons.needFiles);
      return;
    }
    setFileProblem(null);
    setProblem(null);
    setFinished(null);
    setChoosing(false);
    const read = byFileName(await readFiles(markdown));
    const week = Math.max(1, Number(perWeek) || 5);
    const next = read.map((file, index): Lesson => {
      const article = parseArticle(file.markdown);
      const named = partFromName(file.name);
      return {
        name: file.name,
        markdown: file.markdown,
        order: index,
        partByName: named !== null,
        part: named ?? partByOrder(index, week),
        title: lessonTitle(file.name, file.markdown),
        words: article.words,
        state: "new",
        id: null,
      };
    });
    setLessons([...next].sort((a, b) => comparePart(a.part, b.part)));
    const first = detailsFromMarkdown(read[0]!.markdown);
    const folder =
      (markdown[0] as File & { readonly webkitRelativePath?: string }).webkitRelativePath?.split(
        "/",
      )[0] || null;
    setFrom(folder);
    const found: Record<(typeof FROM_FILES)[number], string> = {
      name: first.container ?? folder ?? "",
      family: first.family ?? "",
      given: first.given ?? "",
      year: first.year ?? String(new Date().getFullYear()),
    };
    const replace = FROM_FILES.filter(
      (key) => course[key].trim() === "" || courseFilled.includes(key),
    );
    setCourse((current) => ({
      ...current,
      ...Object.fromEntries(replace.map((key) => [key, found[key]])),
    }));
    setCourseFilled(replace.filter((key) => found[key] !== ""));
    setErrors({});
  };

  const changeCourse = (key: CourseField) => (value: string) => {
    setCourse((current) => ({ ...current, [key]: value }));
    setCourseFilled((current) => current.filter((other) => other !== key));
    setErrors(({ [key]: _, ...rest }) => rest);
  };

  const change = (name: string, patch: Partial<Lesson>) =>
    setLessons((current) =>
      current.map((lesson) => (lesson.name === name ? { ...lesson, ...patch } : lesson)),
    );

  const changePerWeek = (value: string) => {
    setPerWeek(value);
    const week = Number(value);
    if (!Number.isInteger(week) || week < 1) return;
    setLessons((current) =>
      current.map((lesson) =>
        lesson.partByName || lesson.state === "added"
          ? lesson
          : { ...lesson, part: partByOrder(lesson.order, week) },
      ),
    );
  };

  const badParts = lessons.filter((lesson) => !PART.test(lesson.part));
  const clashes = new Set(
    lessons
      .map((lesson) => lesson.part)
      .filter((part, index, parts) => parts.indexOf(part) !== index),
  );
  const partProblem =
    badParts.length > 0
      ? t.lessons.badPart
      : clashes.size > 0
        ? t.lessons.clash([...clashes].join(", "))
        : null;
  const toAdd = lessons.filter((lesson) => lesson.state !== "added" && !taken(lesson.part));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lessons.length === 0) {
      setFileProblem(t.lessons.needFiles);
      focusAfterRender(chooseRef);
      return;
    }
    const found: Partial<Record<CourseField, string>> = {};
    if (course.name.trim() === "") found.name = t.importText.needField;
    if (course.family.trim() === "") found.family = t.importText.needField;
    if (!YEAR.test(course.year.trim())) {
      found.year = course.year.trim() === "" ? t.importText.needField : t.addSource.yearInvalid;
    }
    setErrors(found);
    if (Object.keys(found).length > 0 || partProblem !== null) {
      setProblem(t.addSource.checkFields);
      focusFirstProblem(formRef.current);
      return;
    }
    setProblem(null);
    busyRef.current = true;
    let added = 0;
    let missed = 0;
    const batch = toAdd;
    const all = batch.length;
    setProgress({ done: 0, all });
    for (const lesson of batch) {
      const exit = await importText({
        payload: {
          ...BOOK_TEXT_DETAILS,
          kind: "lesson",
          familyName: course.family.trim(),
          givenName: blank(course.given),
          title: lesson.title.trim() === "" ? lesson.name : lesson.title.trim(),
          firstPublished: Number(course.year.trim()),
          edition: null,
          editionYear: null,
          publisher: null,
          translator: null,
          container: course.name.trim(),
          part: lesson.part,
          url: blank(course.url),
          markdown: lesson.markdown,
        },
      });
      if (Exit.isSuccess(exit)) {
        added += 1;
        change(lesson.name, { state: "added", id: exit.value.id });
      } else {
        missed += 1;
        const error = Cause.findErrorOption(exit.cause);
        change(lesson.name, {
          state:
            Option.isSome(error) && error.value._tag === "SourceNameTaken" ? "taken" : "failed",
        });
      }
      setProgress({ done: added + missed, all });
    }
    busyRef.current = false;
    setProgress(null);
    setFinished({ added, skipped: missed + (lessons.length - all) });
    refreshSources();
  };

  const firstAdded = lessons.find((lesson) => lesson.state === "added");
  const locked = busy || (lessons.length > 0 && toAdd.length === 0 && finished !== null);
  const byOrder = lessons.some((lesson) => !lesson.partByName && lesson.state !== "added");
  const showDrop = lessons.length === 0 || choosing;

  return (
    <Panel title={t.lessons.course} initial="rubric">
      <form ref={formRef} className="add-source__form add-lessons" onSubmit={submit} noValidate>
        <div className="panel__body">
          <input
            ref={folderRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple
            {...({ webkitdirectory: "" } as Record<string, string>)}
            onChange={(event) => void onFiles([...(event.target.files ?? [])])}
          />
          <input
            ref={filesRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple
            accept=".md,.markdown,.mdown,.txt,text/markdown"
            onChange={(event) => void onFiles([...(event.target.files ?? [])])}
          />
          {showDrop ? (
            <DropZone onFiles={(files) => void onFiles(files)} hint={t.lessons.dropHint}>
              <button
                ref={chooseRef}
                type="button"
                className="button button--primary"
                aria-describedby={fileProblem === null ? undefined : fileProblemId}
                onClick={() => folderRef.current?.click()}
              >
                <FolderOpen className="button__icon" aria-hidden="true" />
                {t.lessons.chooseFolder}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => filesRef.current?.click()}
              >
                {t.lessons.chooseFiles}
              </button>
              {lessons.length > 0 ? (
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => setChoosing(false)}
                >
                  {t.lessons.keep(lessons.length)}
                </button>
              ) : null}
            </DropZone>
          ) : (
            <div className="add-text__chosen">
              <FolderOpen className="add-text__icon" aria-hidden="true" />
              <div className="add-text__file">
                <p className="add-text__name">{from ?? t.lessons.someFiles(lessons.length)}</p>
                {from === null ? null : (
                  <p className="add-text__meta">{t.lessons.count(lessons.length)}</p>
                )}
              </div>
              <button
                type="button"
                className="button button--small"
                disabled={locked}
                onClick={() => {
                  setChoosing(true);
                  focusAfterRender(chooseRef);
                }}
              >
                {t.lessons.another}
              </button>
            </div>
          )}
          <p role="status" className="add-text__status" id={fileProblemId}>
            {fileProblem === null ? null : (
              <span className="field__error">
                <CircleAlert className="field__error-icon" aria-hidden="true" />
                {fileProblem}
              </span>
            )}
          </p>
          {skipped === 0 ? null : (
            <p className="field__hint add-lessons__skipped">{t.lessons.skippedFiles(skipped)}</p>
          )}
        </div>
        {lessons.length === 0 ? null : (
          <LessonTable
            lessons={lessons}
            taken={taken}
            clashes={clashes}
            problemId={partProblemId}
            busy={busy}
            onChange={change}
          />
        )}
        <div aria-live="polite" className="add-lessons__part-problem">
          {partProblem === null ? null : (
            <p className="field__error" id={partProblemId}>
              <CircleAlert className="field__error-icon" aria-hidden="true" />
              {partProblem}
            </p>
          )}
        </div>
        {byOrder ? (
          <div className="panel__body add-lessons__per-week">
            <label className="field__label" htmlFor={perWeekId}>
              {t.lessons.perWeek}
            </label>
            <input
              id={perWeekId}
              className="input add-lessons__per-week-input"
              value={perWeek}
              inputMode="numeric"
              disabled={locked}
              aria-describedby={`${perWeekId}-hint`}
              onChange={(event) => changePerWeek(event.target.value)}
            />
            <p className="field__hint" id={`${perWeekId}-hint`}>
              {t.lessons.perWeekHint}
            </p>
          </div>
        ) : null}
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {courseFilled.length === 0 ? null : <FillLine>{t.lessons.filled}</FillLine>}
          </div>
          <fieldset className="fieldset">
            <legend className="sr-only">{t.lessons.course}</legend>
            <TextField
              disabled={locked}
              label={t.lessons.courseName}
              value={course.name}
              onChange={changeCourse("name")}
              filledFrom={courseFilled.includes("name") ? t.importText.fromFile : undefined}
              error={errors.name}
              hint={t.lessons.courseHint}
              required
              wide
            />
            <fieldset className="fieldset field--wide add-lessons__teacher">
              <legend>{t.lessons.teacher}</legend>
              <TextField
                disabled={locked}
                label={t.addSource.familyName}
                value={course.family}
                onChange={changeCourse("family")}
                filledFrom={courseFilled.includes("family") ? t.importText.fromFile : undefined}
                error={errors.family}
                hint={t.lessons.teacherHint}
                required
              />
              <TextField
                disabled={locked}
                label={t.addSource.givenName}
                value={course.given}
                onChange={changeCourse("given")}
                filledFrom={courseFilled.includes("given") ? t.importText.fromFile : undefined}
              />
            </fieldset>
            <TextField
              disabled={locked}
              label={t.lessons.year}
              value={course.year}
              onChange={changeCourse("year")}
              filledFrom={courseFilled.includes("year") ? t.importText.fromFile : undefined}
              error={errors.year}
              required
              inputMode="numeric"
            />
            <TextField
              disabled={locked}
              label={t.lessons.url}
              value={course.url}
              onChange={changeCourse("url")}
              inputMode="url"
            />
          </fieldset>
        </div>
        <FormFoot
          problem={problem}
          status={
            progress !== null
              ? t.lessons.adding(progress.done, progress.all)
              : finished !== null
                ? t.lessons.done(finished.added, finished.skipped)
                : null
          }
        >
          {lessons.length === 0 ? (
            <button type="submit" className="button">
              {t.lessons.submitAny}
            </button>
          ) : toAdd.length > 0 ? (
            <button
              type="submit"
              className={showDrop ? "button" : "button button--primary"}
              disabled={busy}
            >
              {busy
                ? t.importText.adding
                : finished === null
                  ? t.lessons.submit(toAdd.length)
                  : t.lessons.retry(toAdd.length)}
            </button>
          ) : null}
          {finished !== null && firstAdded?.id != null ? (
            <>
              <Link
                to="/sources/$sourceId"
                params={{ sourceId: firstAdded.id }}
                search={{}}
                className={toAdd.length > 0 ? "button" : "button button--primary"}
              >
                {t.lessons.openFirst(firstAdded.part)}
              </Link>
              <Link to="/sources" className="button button--quiet">
                {t.lessons.seeSources}
              </Link>
            </>
          ) : (
            <Link to="/sources" className="button button--quiet">
              {t.addSource.cancel}
            </Link>
          )}
        </FormFoot>
      </form>
    </Panel>
  );
}

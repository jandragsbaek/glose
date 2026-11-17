import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { BOOK_TEXT_DETAILS, parseArticle } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, CircleAlert, FolderOpen, Minus } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

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
import { blank, DropZone, PART, readFiles, TextField, YEAR } from "./textImport.tsx";
import { Panel } from "./ui.tsx";

type LessonState = "new" | "taken" | "added" | "failed";

interface Lesson {
  readonly name: string;
  readonly markdown: string;
  readonly part: string;
  readonly title: string;
  readonly words: number;
  readonly state: LessonState;
  readonly id: string | null;
  readonly order: number;
  readonly partByName: boolean;
}

export function AddLessons() {
  const t = useT();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => []);
  const refreshSources = useAtomRefresh(sourcesAtom);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const [lessons, setLessons] = useState<ReadonlyArray<Lesson>>([]);
  const [skipped, setSkipped] = useState(0);
  const [course, setCourse] = useState({ name: "", family: "", given: "", year: "", url: "" });
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ readonly done: number; readonly all: number } | null>(
    null,
  );
  const [finished, setFinished] = useState<{ added: number; skipped: number } | null>(null);
  const [perWeek, setPerWeek] = useState("5");

  const taken = (part: string) =>
    sources.some(
      (source) =>
        source.kind === "lesson" &&
        source.container !== null &&
        source.container.toLowerCase() === course.name.trim().toLowerCase() &&
        source.part === part,
    );

  const onFiles = async (files: ReadonlyArray<File>) => {
    const markdown = files.filter((file) => isMarkdownName(file.name));
    setSkipped(files.length - markdown.length);
    if (markdown.length === 0) {
      setProblem(t.lessons.needFiles);
      return;
    }
    setProblem(null);
    setFinished(null);
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
    const folder = (
      markdown[0] as File & { readonly webkitRelativePath?: string }
    ).webkitRelativePath?.split("/")[0];
    setCourse((current) => ({
      name: current.name || first.container || folder || "",
      family: current.family || first.family || "",
      given: current.given || first.given || "",
      year: current.year || first.year || String(new Date().getFullYear()),
      url: current.url,
    }));
  };

  const change = (index: number, patch: Partial<Lesson>) =>
    setLessons((current) =>
      current.map((lesson, at) => (at === index ? { ...lesson, ...patch } : lesson)),
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

  const ready =
    course.name.trim() !== "" && course.family.trim() !== "" && YEAR.test(course.year.trim());
  const badParts = lessons.filter((lesson) => !PART.test(lesson.part));
  const clashes = new Set(
    lessons
      .map((lesson) => lesson.part)
      .filter((part, index, parts) => parts.indexOf(part) !== index),
  );
  const toAdd = lessons.filter((lesson) => lesson.state !== "added" && !taken(lesson.part));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lessons.length === 0) return setProblem(t.lessons.needFiles);
    if (!ready) return setProblem(t.lessons.needCourse);
    if (badParts.length > 0) return setProblem(t.lessons.badPart);
    if (clashes.size > 0) return setProblem(t.lessons.clash([...clashes].join(", ")));
    setProblem(null);
    let added = 0;
    let missed = 0;
    const all = toAdd.length;
    setProgress({ done: 0, all });
    for (const [index, lesson] of lessons.entries()) {
      if (lesson.state === "added" || taken(lesson.part)) continue;
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
        change(index, { state: "added", id: exit.value.id });
      } else {
        missed += 1;
        const error = Cause.findErrorOption(exit.cause);
        change(index, {
          state:
            Option.isSome(error) && error.value._tag === "SourceNameTaken" ? "taken" : "failed",
        });
      }
      setProgress({ done: added + missed, all });
    }
    setProgress(null);
    setFinished({ added, skipped: missed + (lessons.length - all) });
    refreshSources();
  };

  const firstAdded = lessons.find((lesson) => lesson.state === "added");
  const locked = lessons.length > 0 && toAdd.length === 0 && finished !== null;

  return (
    <form className="form add-lessons" onSubmit={submit} noValidate>
      <Panel
        title={t.lessons.files}
        initial="rubric"
        meta={lessons.length === 0 ? undefined : t.lessons.count(lessons.length)}
      >
        <div className="panel__body">
          <DropZone onFiles={(files) => void onFiles(files)} hint={t.lessons.dropHint}>
            <input
              ref={folderRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              multiple
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={(event) => void onFiles([...(event.target.files ?? [])])}
            />
            <input
              ref={filesRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              multiple
              accept=".md,.markdown,.mdown,.txt,text/markdown"
              onChange={(event) => void onFiles([...(event.target.files ?? [])])}
            />
            <button
              type="button"
              className="button button--primary"
              onClick={() => folderRef.current?.click()}
            >
              <FolderOpen className="button__icon" aria-hidden="true" />
              {t.lessons.chooseFolder}
            </button>
            <button type="button" className="button" onClick={() => filesRef.current?.click()}>
              {t.lessons.chooseFiles}
            </button>
          </DropZone>
          {skipped === 0 ? null : (
            <p className="field__hint add-lessons__skipped">{t.lessons.skippedFiles(skipped)}</p>
          )}
        </div>
        {lessons.length === 0 ? null : (
          <div className="add-lessons__table-wrap">
            <table className="add-lessons__table">
              <thead>
                <tr>
                  <th scope="col">{t.lessons.columns.part}</th>
                  <th scope="col">{t.lessons.columns.title}</th>
                  <th scope="col">{t.lessons.columns.file}</th>
                  <th scope="col" className="num">
                    {t.lessons.columns.words}
                  </th>
                  <th scope="col">{t.lessons.columns.state}</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson, index) => {
                  const state: LessonState =
                    lesson.state === "new" && taken(lesson.part) ? "taken" : lesson.state;
                  return (
                    <tr
                      key={lesson.name}
                      data-state={state}
                      data-clash={clashes.has(lesson.part) ? "" : undefined}
                    >
                      <td>
                        <input
                          className="input add-lessons__part"
                          value={lesson.part}
                          aria-label={t.lessons.partLabel(lesson.name)}
                          aria-invalid={PART.test(lesson.part) ? undefined : true}
                          inputMode="decimal"
                          disabled={state === "added"}
                          onChange={(event) =>
                            change(index, { part: event.target.value, partByName: true })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input add-lessons__title"
                          value={lesson.title}
                          aria-label={t.lessons.titleLabel(lesson.name)}
                          disabled={state === "added"}
                          onChange={(event) => change(index, { title: event.target.value })}
                        />
                      </td>
                      <td className="add-lessons__file">{lesson.name}</td>
                      <td className="num">{lesson.words}</td>
                      <td className="add-lessons__state">
                        <LessonStateMark state={state} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title={t.lessons.course} initial="lapis">
        <div className="panel__body">
          <fieldset className="fieldset">
            <legend className="sr-only">{t.lessons.course}</legend>
            <TextField
              disabled={locked}
              label={t.lessons.courseName}
              value={course.name}
              onChange={(name) => setCourse((current) => ({ ...current, name }))}
              hint={t.lessons.courseHint}
              required
              wide
            />
            <TextField
              disabled={locked}
              label={t.addSource.familyName}
              value={course.family}
              onChange={(family) => setCourse((current) => ({ ...current, family }))}
              hint={t.lessons.teacherHint}
              required
            />
            <TextField
              disabled={locked}
              label={t.addSource.givenName}
              value={course.given}
              onChange={(given) => setCourse((current) => ({ ...current, given }))}
            />
            <TextField
              disabled={locked}
              label={t.lessons.year}
              value={course.year}
              onChange={(year) => setCourse((current) => ({ ...current, year }))}
              required
              inputMode="numeric"
            />
            <TextField
              disabled={locked}
              label={t.lessons.perWeek}
              value={perWeek}
              onChange={changePerWeek}
              hint={t.lessons.perWeekHint}
              inputMode="numeric"
            />
            <TextField
              disabled={locked}
              label={t.lessons.url}
              value={course.url}
              onChange={(url) => setCourse((current) => ({ ...current, url }))}
              wide
              inputMode="url"
            />
          </fieldset>
        </div>
      </Panel>
      <p role="status" className="add-lessons__status">
        {progress === null ? null : t.lessons.adding(progress.done, progress.all)}
        {finished === null ? null : t.lessons.done(finished.added, finished.skipped)}
        {problem === null ? null : (
          <span className="field__error">
            <CircleAlert className="field__error-icon" aria-hidden="true" />
            {problem}
          </span>
        )}
      </p>
      <div className="button-row">
        {toAdd.length > 0 ? (
          <button type="submit" className="button button--primary" disabled={progress !== null}>
            {progress === null
              ? finished === null
                ? t.lessons.submit(toAdd.length)
                : t.lessons.retry(toAdd.length)
              : t.lessons.adding(progress.done, progress.all)}
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
            <Link to="/sources" className="button">
              {t.lessons.seeSources}
            </Link>
          </>
        ) : (
          <Link to="/sources" className="button">
            {t.addSource.cancel}
          </Link>
        )}
      </div>
    </form>
  );
}

function LessonStateMark({ state }: { readonly state: LessonState }) {
  const t = useT();
  const Icon = state === "added" ? Check : state === "new" ? Minus : CircleAlert;
  return (
    <span className="lesson-state" data-state={state}>
      <Icon className="lesson-state__icon" aria-hidden="true" />
      {t.lessons.states[state]}
    </span>
  );
}

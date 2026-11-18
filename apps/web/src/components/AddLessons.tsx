import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { BOOK_TEXT_DETAILS } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { CircleAlert, FolderOpen } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { byFileName, isMarkdownName, partByOrder } from "../domain/importText.ts";
import { useT } from "../i18n/I18n.tsx";
import { importTextAtom, sourcesAtom } from "../state/graph.ts";
import {
  blank,
  DropZone,
  FillLine,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  handCursorOn,
  PART,
  readFiles,
  YEAR,
} from "./textImport.tsx";
import {
  type Course,
  type CourseField,
  CourseFields,
  type FromFiles,
  type Origin,
  type Say,
} from "./CourseFields.tsx";
import { isHeld, lessonBatch, pathOf } from "./lessonBatch.ts";
import { type Lesson, LessonTable, PerWeek, wholeAtLeastOne } from "./LessonTable.tsx";
import { Panel } from "./ui.tsx";

const FROM_FILES = ["name", "family", "given", "year"] as const satisfies ReadonlyArray<FromFiles>;

export function AddLessons({ onSaving }: { readonly onSaving: (saving: boolean) => void }) {
  const t = useT();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => []);
  const refreshSources = useAtomRefresh(sourcesAtom);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const anotherRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const readRef = useRef(0);
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
  const [origins, setOrigins] = useState<Partial<Record<FromFiles, Origin>>>({});
  const [errors, setErrors] = useState<Partial<Record<CourseField, Say>>>({});
  const [fileProblem, setFileProblem] = useState<{ readonly say: Say } | null>(null);
  const [problem, setProblem] = useState<{ readonly say: Say } | null>(null);
  const [progress, setProgress] = useState<{ readonly done: number; readonly all: number } | null>(
    null,
  );
  const [finished, setFinished] = useState(false);
  const [perWeek, setPerWeek] = useState("5");
  const perWeekRef = useRef(perWeek);
  const wayInRef = useRef<HTMLDivElement>(null);
  const fileProblemId = useId();
  const partProblemId = useId();
  const [reading, setReading] = useState(false);
  const courseRef = useRef(course);
  const originsRef = useRef(origins);
  const submitRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLAnchorElement>(null);
  const busy = progress !== null;

  const writeCourse = (next: Course) => {
    courseRef.current = next;
    setCourse(next);
  };

  const writeOrigins = (next: Partial<Record<FromFiles, Origin>>) => {
    originsRef.current = next;
    setOrigins(next);
  };

  const taken = (part: string) =>
    sources.some(
      (source) =>
        source.kind === "lesson" &&
        source.container !== null &&
        source.container.toLowerCase() === course.name.trim().toLowerCase() &&
        source.part === part,
    );

  const onFiles = async (pending: Promise<ReadonlyArray<File>>) => {
    if (busyRef.current) return;
    const request = ++readRef.current;
    setFileProblem(null);
    setReading(true);
    let files: ReadonlyArray<File>;
    let markdown: ReadonlyArray<File>;
    let read;
    try {
      files = await pending;
      if (request !== readRef.current) return;
      markdown = files.filter((file) => isMarkdownName(file.name));
      if (markdown.length === 0) {
        setFileProblem({ say: (m) => m.lessons.noMarkdown });
        return;
      }
      const texts = await readFiles(markdown);
      const empty = texts.filter((text) => text.markdown.trim() === "").map((text) => text.name);
      if (empty.length > 0) {
        if (request === readRef.current) {
          setFileProblem({ say: (m) => m.lessons.emptyFiles(empty.join(", ")) });
        }
        return;
      }
      read = byFileName(texts.map((text, index) => ({ ...text, path: pathOf(markdown[index]!) })));
    } catch {
      if (request === readRef.current) setFileProblem({ say: (m) => m.importText.readFailed });
      return;
    } finally {
      if (request === readRef.current) setReading(false);
    }
    if (request !== readRef.current || busyRef.current) return;
    setSkipped(files.length - markdown.length);
    setFileProblem(null);
    setProblem(null);
    setFinished(false);
    setChoosing(false);
    const batch = lessonBatch(read, markdown, Math.max(1, Number(perWeekRef.current) || 5));
    setLessons(batch.lessons);
    setFrom(batch.folder);
    const found = batch.found;
    const current = courseRef.current;
    const replace = FROM_FILES.filter(
      (key) => current[key].trim() === "" || originsRef.current[key] !== undefined,
    );
    writeCourse({
      ...current,
      ...Object.fromEntries(replace.map((key) => [key, found[key].value])),
    });
    writeOrigins(
      Object.fromEntries(
        replace.filter((key) => found[key].value !== "").map((key) => [key, found[key].origin]),
      ),
    );
    setErrors({});
    handCursorOn(wayInRef.current, anotherRef);
  };

  const cancelRead = () => {
    readRef.current += 1;
    setReading(false);
  };

  const pick = (input: HTMLInputElement) => {
    void onFiles(Promise.resolve([...(input.files ?? [])]));
    input.value = "";
  };

  const changeCourse = (key: CourseField) => (value: string) => {
    writeCourse({ ...courseRef.current, [key]: value });
    const { [key as FromFiles]: _, ...rest } = originsRef.current;
    writeOrigins(rest);
    setErrors(({ [key]: _, ...rest }) => rest);
  };

  const change = (key: string, patch: Partial<Lesson>) =>
    setLessons((current) =>
      current.map((lesson) =>
        lesson.key !== key
          ? lesson
          : {
              ...lesson,
              ...patch,
            },
      ),
    );

  const changePerWeek = (value: string) => {
    setPerWeek(value);
    if (!wholeAtLeastOne(value)) return;
    const week = Number(value);
    perWeekRef.current = value;
    setLessons((current) =>
      current.map((lesson) =>
        lesson.partByName || lesson.state === "added"
          ? lesson
          : {
              ...lesson,
              part: partByOrder(lesson.order, week),
            },
      ),
    );
  };

  const badParts = lessons.filter((lesson) => !PART.test(lesson.part));
  const clashes = new Set(
    lessons
      .map((lesson) => lesson.part)
      .filter((part, index, parts) => parts.indexOf(part) !== index),
  );
  const partProblems = [
    badParts.length > 0 ? t.lessons.badPart : null,
    clashes.size > 0 ? t.lessons.clash([...clashes].join(", ")) : null,
  ].filter((line): line is string => line !== null);
  const held = (lesson: Lesson) => isHeld(lesson, course);
  const toAdd = lessons.filter(
    (lesson) => lesson.state !== "added" && !held(lesson) && !taken(lesson.part),
  );
  const added = lessons.filter((lesson) => lesson.state === "added").length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busyRef.current || reading) return;
    if (choosing && lessons.length > 0) setChoosing(false);
    if (lessons.length === 0) {
      setFileProblem({ say: (m) => m.lessons.needFiles });
      focusAfterRender(chooseRef);
      return;
    }
    const found: Partial<Record<CourseField, Say>> = {};
    if (course.name.trim() === "") found.name = (m) => m.importText.needField;
    if (course.family.trim() === "") found.family = (m) => m.importText.needField;
    if (!YEAR.test(course.year.trim())) {
      found.year =
        course.year.trim() === "" ? (m) => m.importText.needField : (m) => m.addSource.yearInvalid;
    }
    setErrors(found);
    const perWeekBad =
      lessons.some((lesson) => !lesson.partByName && lesson.state !== "added") &&
      !wholeAtLeastOne(perWeek);
    if (Object.keys(found).length > 0 || partProblems.length > 0 || perWeekBad) {
      setProblem({ say: (m) => m.addSource.checkFields });
      focusFirstProblem(formRef.current, "[data-held]");
      return;
    }
    setProblem(null);
    busyRef.current = true;
    onSaving(true);
    const batch = toAdd;
    const all = batch.length;
    setProgress({ done: 0, all });
    let missed = 0;
    let named = 0;
    for (const [index, lesson] of batch.entries()) {
      setProgress({ done: index, all });
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
        change(lesson.key, { state: "added", id: exit.value.id });
      } else {
        missed += 1;
        const error = Cause.findErrorOption(exit.cause);
        const nameTaken = Option.isSome(error) && error.value._tag === "SourceNameTaken";
        if (nameTaken) named += 1;
        change(lesson.key, {
          state: nameTaken ? "named" : "failed",
          takenAs: nameTaken ? error.value.fileName : null,
        });
      }
    }
    busyRef.current = false;
    onSaving(false);
    setProgress(null);
    setFinished(true);
    refreshSources();
    if (named > 0) focusFirstProblem(formRef.current);
    else focusAfterRender(missed > 0 ? [submitRef, openRef] : [openRef, submitRef]);
  };

  const firstAdded = lessons.find((lesson) => lesson.state === "added");
  const waiting = lessons.some(held);
  const locked = busy || (lessons.length > 0 && toAdd.length === 0 && !waiting && finished);
  const byOrder = lessons.some((lesson) => !lesson.partByName && lesson.state !== "added");
  const showDrop = lessons.length === 0 || choosing;
  const fromFile = Object.values(origins).includes("file");
  const fromFolder = Object.values(origins).includes("folder");
  const fillSaid = fromFile
    ? fromFolder
      ? t.lessons.filledBoth
      : t.lessons.filled
    : fromFolder
      ? t.lessons.filledFolder
      : null;

  return (
    <Panel title={t.lessons.course} initial="rubric">
      <form ref={formRef} className="add-source__form add-lessons" onSubmit={submit} noValidate>
        <div ref={wayInRef} className="panel__body">
          <input
            ref={folderRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple
            {...({ webkitdirectory: "" } as Record<string, string>)}
            onChange={(event) => pick(event.currentTarget)}
          />
          <input
            ref={filesRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple
            accept=".md,.markdown,.mdown,.txt,text/markdown"
            onChange={(event) => pick(event.currentTarget)}
          />
          {showDrop ? (
            <DropZone onFiles={(files) => void onFiles(files)} hint={t.lessons.dropHint}>
              <button
                ref={chooseRef}
                type="button"
                className="button button--primary"
                disabled={busy}
                aria-describedby={fileProblem === null ? undefined : fileProblemId}
                onClick={() => folderRef.current?.click()}
              >
                <FolderOpen className="button__icon" aria-hidden="true" />
                {t.lessons.chooseFolder}
              </button>
              <button
                type="button"
                className="button button--quiet"
                disabled={busy}
                onClick={() => filesRef.current?.click()}
              >
                {t.lessons.chooseFiles}
              </button>
              {lessons.length > 0 ? (
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={busy}
                  onClick={() => {
                    cancelRead();
                    setChoosing(false);
                    setFileProblem(null);
                    focusAfterRender(anotherRef);
                  }}
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
                ref={anotherRef}
                type="button"
                className="button button--small"
                disabled={locked || added > 0}
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
            {fileProblem === null ? (
              reading ? (
                <span className="form-status">{t.lessons.reading}</span>
              ) : null
            ) : (
              <span className="field__error">
                <CircleAlert className="field__error-icon" aria-hidden="true" />
                {fileProblem.say(t)}
              </span>
            )}
          </p>
          {skipped === 0 ? null : (
            <p className="field__hint add-lessons__skipped">{t.lessons.skippedFiles(skipped)}</p>
          )}
        </div>
        <div className="panel__body add-source__fields">
          <div role="status" className="fill-status">
            {fillSaid === null ? null : <FillLine>{fillSaid}</FillLine>}
          </div>
          <CourseFields
            course={course}
            origins={origins}
            errors={errors}
            locked={locked || added > 0}
            onChange={changeCourse}
          />
        </div>
        {lessons.length === 0 ? null : (
          <LessonTable
            lessons={lessons}
            taken={taken}
            clashes={clashes}
            problemId={partProblemId}
            busy={busy}
            held={held}
            onChange={change}
          />
        )}
        <div aria-live="polite" className="add-lessons__part-problem" id={partProblemId}>
          {partProblems.map((line) => (
            <p key={line} className="field__error">
              <CircleAlert className="field__error-icon" aria-hidden="true" />
              {line}
            </p>
          ))}
        </div>
        {byOrder ? <PerWeek value={perWeek} locked={locked} onChange={changePerWeek} /> : null}
        <FormFoot
          problem={problem === null ? null : problem.say(t)}
          status={
            progress !== null
              ? t.lessons.adding(Math.min(progress.done + 1, progress.all), progress.all)
              : finished
                ? t.lessons.done(added, lessons.length - added)
                : null
          }
        >
          {lessons.length === 0 ? (
            <button type="submit" className="button" disabled={reading}>
              {t.lessons.submitAny}
            </button>
          ) : toAdd.length > 0 ? (
            <button
              ref={submitRef}
              type="submit"
              className={showDrop ? "button" : "button button--primary"}
              disabled={busy || reading}
            >
              {busy
                ? t.importText.adding
                : finished
                  ? t.lessons.retry(toAdd.length)
                  : t.lessons.submit(toAdd.length)}
            </button>
          ) : null}
          {busy ? (
            <button type="button" className="button button--quiet" disabled>
              {t.addSource.cancel}
            </button>
          ) : finished && firstAdded?.id != null ? (
            <>
              <Link
                ref={openRef}
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

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { BOOK_TEXT_DETAILS, courseVideoExtension, parseArticle } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { FileText } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { type Course, type Shelf, slotAfter } from "../domain/course.ts";
import { isMarkdownName, lessonTitle, partFromName } from "../domain/importText.ts";
import { useT } from "../i18n/I18n.tsx";
import { uploadCourseVideo } from "../state/courseVideo.ts";
import { importTextAtom, sourcesAtom } from "../state/vault.ts";
import {
  DropZone,
  focusAfterRender,
  focusFirstProblem,
  FormFoot,
  TextField,
} from "./textImport.tsx";
import { Panel } from "./ui.tsx";
import { NO_VIDEO, VideoFields, type VideoDraft, videoLinkOf } from "./VideoFields.tsx";

interface DayText {
  readonly name: string | null;
  readonly markdown: string;
}

export interface DayDraft {
  readonly text: DayText | null;
  readonly title: string;
  readonly empty: boolean;
  readonly video: VideoDraft;
}

export const NO_DRAFT: DayDraft = { text: null, title: "", empty: false, video: NO_VIDEO };

export const textOfFile = async (
  file: File,
): Promise<Pick<DayDraft, "text" | "title" | "empty">> => {
  const markdown = await file.text();
  return markdown.trim() === ""
    ? { text: null, title: "", empty: true }
    : {
        text: { name: file.name, markdown },
        title: lessonTitle(file.name, markdown),
        empty: false,
      };
};

type Problem = "text" | "title" | "titleTaken" | "link" | "file";

export function AddCourseDay({
  course,
  shelf,
  part,
  draft,
  notice,
  onDraft,
  onMove,
  onAdded,
}: {
  readonly course: Course;
  readonly shelf: Shelf;
  readonly part: string;
  readonly draft: DayDraft;
  readonly notice: string | null;
  readonly onDraft: (draft: DayDraft) => void;
  readonly onMove: (part: string, said: string) => void;
  readonly onAdded: (part: string, said: string) => void;
}) {
  const t = useT();
  const importText = useAtomSet(importTextAtom, { mode: "promiseExit" });
  const refreshSources = useAtomRefresh(sourcesAtom);
  const fileRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pasteId = useId();
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [problems, setProblems] = useState<ReadonlySet<Problem>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const next = slotAfter(shelf, part);

  const clear = (...gone: ReadonlyArray<Problem>) =>
    setProblems((current) => new Set([...current].filter((one) => !gone.includes(one))));

  const { text, title, video } = draft;

  const takeText = (found: DayText) => {
    onDraft({
      ...draft,
      text: found,
      title: lessonTitle(found.name ?? "", found.markdown),
      empty: false,
    });
    setPasting(false);
    clear("text", "title", "titleTaken");
    setProblem(null);
  };

  const readFile = async (file: File) => {
    if (!isMarkdownName(file.name)) return;
    const read = await textOfFile(file);
    onDraft({ ...draft, ...read });
    if (read.text === null) return;
    setPasting(false);
    clear("text", "title", "titleTaken");
    setProblem(null);
    const named = partFromName(file.name);
    if (named === null || named === part) return;
    const free = !shelf.weeks.some((week) =>
      week.slots.some((slot) => slot.part === named && slot.lesson !== null),
    );
    if (free) onMove(named, t.course.otherDay(named));
    else onMove(part, t.course.dayTaken(named));
  };

  const submit = async (then: boolean) => {
    const link = video.link.trim() === "" ? null : videoLinkOf(video.link);
    const found = new Set<Problem>();
    if (text === null) found.add("text");
    else if (title.trim() === "") found.add("title");
    if (video.link.trim() !== "" && link === null) found.add("link");
    if (video.file !== null && courseVideoExtension(video.file.name) === null) found.add("file");
    setProblems(found);
    if (text === null || found.size > 0) {
      setProblem(null);
      if (text === null) focusAfterRender(chooseRef);
      else focusFirstProblem(formRef.current);
      return;
    }
    setProblem(null);
    setBusy(t.course.adding);
    const exit = await importText({
      payload: {
        ...BOOK_TEXT_DETAILS,
        kind: "lesson",
        familyName: course.familyName,
        givenName: course.givenName,
        title: title.trim(),
        firstPublished: course.firstPublished,
        edition: null,
        editionYear: null,
        publisher: null,
        translator: null,
        container: course.name,
        part,
        url: course.url,
        markdown: text.markdown,
        videoLink: link,
      },
    });
    if (Exit.isFailure(exit)) {
      setBusy(null);
      const error = Cause.findErrorOption(exit.cause);
      if (Option.isSome(error) && error.value._tag === "SourceNameTaken") {
        setProblems(new Set(["titleTaken"]));
        focusFirstProblem(formRef.current);
      } else {
        setProblem(t.course.addFailed);
      }
      return;
    }
    let copied = true;
    if (video.file !== null) {
      setBusy(t.course.uploading(0));
      copied = await uploadCourseVideo(exit.value.id, video.file, (percent) =>
        setBusy(t.course.uploading(percent)),
      );
    }
    setBusy(null);
    setPasted("");
    const shown = then && next !== null && copied ? next : part;
    onAdded(shown, copied ? t.course.added(part) : t.course.uploadFailed);
    refreshSources();
    if (shown !== part) focusAfterRender(chooseRef);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const then = (event.nativeEvent as SubmitEvent).submitter?.dataset.then === "";
    void submit(then);
  };

  const article = text === null ? null : parseArticle(text.markdown);
  const locked = busy !== null;

  return (
    <Panel title={t.course.dayName(part)} initial="accent" meta={t.course.notAdded}>
      <form ref={formRef} className="add-day" onSubmit={onSubmit} noValidate>
        <div className="panel__body add-day__body">
          <p className="course__hint">{t.course.addHint}</p>
          <p role="status" className="add-day__notice">
            {notice}
          </p>
          <h3 className="add-day__piece">{t.course.text}</h3>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            accept=".md,.markdown,.mdown,.txt,text/markdown"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file !== undefined) void readFile(file);
            }}
          />
          {pasting ? (
            <div className="add-day__paste">
              <label className="field__label" htmlFor={pasteId}>
                {t.course.pasteLabel}
              </label>
              <textarea
                ref={pasteRef}
                id={pasteId}
                className="input add-text__paste"
                value={pasted}
                disabled={locked}
                onChange={(event) => setPasted(event.target.value)}
              />
              <div className="button-row">
                <button
                  type="button"
                  className="button button--primary"
                  disabled={pasted.trim() === "" || locked}
                  onClick={() => takeText({ name: null, markdown: pasted })}
                >
                  {t.course.useText}
                </button>
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={locked}
                  onClick={() => {
                    setPasting(false);
                    focusAfterRender(chooseRef);
                  }}
                >
                  {t.course.chooseInstead}
                </button>
              </div>
            </div>
          ) : text === null ? (
            <DropZone
              hint={t.course.dropText}
              onFiles={(files) =>
                void files.then((list) => {
                  const file = list.find((one) => isMarkdownName(one.name));
                  if (file !== undefined) void readFile(file);
                })
              }
            >
              <button
                ref={chooseRef}
                type="button"
                className="button button--primary"
                disabled={locked}
                aria-invalid={problems.has("text") ? true : undefined}
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="button__icon" aria-hidden="true" />
                {t.course.chooseText}
              </button>
              <button
                type="button"
                className="button button--quiet"
                disabled={locked}
                onClick={() => {
                  setPasting(true);
                  focusAfterRender(pasteRef);
                }}
              >
                {t.course.pasteText}
              </button>
            </DropZone>
          ) : (
            <div className="add-text__chosen">
              <FileText className="add-text__icon" aria-hidden="true" />
              <div className="add-text__file">
                <p className="add-text__name">{text.name ?? t.course.pasteLabel}</p>
                <p className="add-text__meta">
                  {t.course.textCounts(article?.units.length ?? 0, article?.words ?? 0)}
                </p>
              </div>
              <button
                ref={chooseRef}
                type="button"
                className="button button--small"
                disabled={locked}
                onClick={() => {
                  onDraft({ ...NO_DRAFT, video });
                  focusAfterRender(chooseRef);
                }}
              >
                {t.course.another}
              </button>
            </div>
          )}
          {(problems.has("text") || draft.empty) && text === null ? (
            <p className="field__error">{t.course.needText}</p>
          ) : null}
          {text === null ? null : (
            <TextField
              label={t.course.title}
              value={title}
              onChange={(value) => {
                onDraft({ ...draft, title: value });
                clear("title", "titleTaken");
              }}
              hint={t.course.titleHint}
              error={
                problems.has("titleTaken")
                  ? t.course.titleTaken
                  : problems.has("title")
                    ? t.course.needTitle
                    : undefined
              }
              disabled={locked}
              required
              wide
            />
          )}
        </div>
        <div className="panel__body add-day__body">
          <h3 className="add-day__piece">
            {t.course.video} <span className="field__need">{t.course.videoOptional}</span>
          </h3>
          <VideoFields
            draft={video}
            keptFile={null}
            linkError={problems.has("link")}
            fileError={problems.has("file")}
            disabled={locked}
            onChange={(next) => {
              onDraft({ ...draft, video: next });
              clear("link", "file");
            }}
          />
        </div>
        <FormFoot problem={problem} status={busy ?? undefined}>
          <button type="submit" className="button button--primary" disabled={locked}>
            {t.course.addDay(part)}
          </button>
          {next === null ? null : (
            <button type="submit" className="button" data-then="" disabled={locked}>
              {t.course.addThen(next)}
            </button>
          )}
        </FormFoot>
      </form>
    </Panel>
  );
}

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { courseVideoExtension, type Source } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import { ArrowRight, CircleAlert, ExternalLink, SquarePlay } from "lucide-react";
import { type RefObject, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { courseVideoUrl, uploadCourseVideo } from "../state/courseVideo.ts";
import { KEYS, setLessonVideoAtom, sourcesAtom } from "../state/vault.ts";
import { ReadingMarks } from "./ReadingMarks.tsx";
import { focusAfterRender } from "./textImport.tsx";
import { CallNumber, Panel } from "./ui.tsx";
import { videoLinkOf, VideoFields, type VideoDraft } from "./VideoFields.tsx";

export function CourseDay({
  lesson,
  notice,
}: {
  readonly lesson: Source;
  readonly notice: string | null;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState<string | null>(null);
  const part = lesson.part ?? "";
  const hasVideo = lesson.videoLink !== null || lesson.videoFile !== null;
  const started = lesson.readingStep !== "read" || lesson.readingPlace !== null;
  return (
    <Panel title={t.course.dayName(part)} initial="accent" meta={<CallNumber source={lesson} />}>
      <div className="panel__body course-day">
        <p role="status" className="add-day__notice">
          {notice}
        </p>
        <h3 className="course-day__title">
          <Link to="/sources/$sourceId" params={{ sourceId: lesson.id }}>
            {lesson.title}
          </Link>
        </h3>
        <p className="course-day__state">
          <ReadingMarks
            step={lesson.readingStep}
            start={lesson.readingStart}
            kind={lesson.kind}
            labelled={false}
          />
          {t.sources.steps[lesson.readingStep]}
        </p>
        <p>
          <Link
            to="/sources/$sourceId"
            params={{ sourceId: lesson.id }}
            className="button button--primary"
          >
            {started ? t.course.continueReading : t.course.read}
            <ArrowRight className="button__icon" aria-hidden="true" />
          </Link>
        </p>
      </div>
      <div className="panel__body course-day__pieces">
        <div className="piece piece--video">
          <SquarePlay className="piece__icon" aria-hidden="true" />
          <span className="piece__name">{t.course.video}</span>
          {editing ? null : (
            <button
              ref={editRef}
              type="button"
              className="button button--small piece__action"
              onClick={() => {
                setSaid(null);
                setEditing(true);
                focusAfterRender(linkRef);
              }}
            >
              {hasVideo ? t.course.editVideo : t.course.addVideo}
            </button>
          )}
        </div>
        {editing ? (
          <VideoEdit
            lesson={lesson}
            linkRef={linkRef}
            onDone={(message) => {
              setEditing(false);
              setSaid(message);
              focusAfterRender(editRef);
            }}
          />
        ) : (
          <VideoShown lesson={lesson} />
        )}
        <p role="status" className="course-day__said">
          {said}
        </p>
      </div>
    </Panel>
  );
}

function VideoShown({ lesson }: { readonly lesson: Source }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  if (lesson.videoLink === null && lesson.videoFile === null) {
    return <p className="empty piece__empty">{t.course.videoNone}</p>;
  }
  return (
    <div className="piece__body">
      {lesson.videoFile === null ? null : failed ? (
        <p className="field__error">
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {t.course.playerFailed}
        </p>
      ) : (
        <div className="course-plate">
          <video
            className="course-plate__frame"
            controls
            preload="metadata"
            src={courseVideoUrl(lesson.id, lesson.videoFile)}
            aria-label={t.course.player(lesson.title)}
            onError={() => setFailed(true)}
          />
        </div>
      )}
      {lesson.videoLink === null ? null : (
        <a className="button" href={lesson.videoLink} target="_blank" rel="noreferrer">
          {t.course.openVideo}
          <ExternalLink className="button__icon" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function VideoEdit({
  lesson,
  linkRef,
  onDone,
}: {
  readonly lesson: Source;
  readonly linkRef: RefObject<HTMLInputElement | null>;
  readonly onDone: (said: string | null) => void;
}) {
  const t = useT();
  const setLessonVideo = useAtomSet(setLessonVideoAtom, { mode: "promiseExit" });
  const refreshSources = useAtomRefresh(sourcesAtom);
  const [draft, setDraft] = useState<VideoDraft>({
    link: lesson.videoLink ?? "",
    file: null,
    keepFile: lesson.videoFile !== null,
  });
  const [linkError, setLinkError] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async () => {
    const link = draft.link.trim() === "" ? null : videoLinkOf(draft.link);
    const badLink = draft.link.trim() !== "" && link === null;
    const badFile = draft.file !== null && courseVideoExtension(draft.file.name) === null;
    setLinkError(badLink);
    setFileError(badFile);
    if (badLink || badFile) return;
    setProblem(null);
    setBusy(t.course.savingVideo);
    const exit = await setLessonVideo({
      payload: {
        id: lesson.id,
        link,
        removeFile: !draft.keepFile && draft.file === null && lesson.videoFile !== null,
      },
      reactivityKeys: KEYS.sources,
    });
    if (Exit.isFailure(exit)) {
      setBusy(null);
      setProblem(t.course.videoFailed);
      return;
    }
    if (draft.file !== null) {
      setBusy(t.course.uploading(0));
      const copied = await uploadCourseVideo(lesson.id, draft.file, (percent) =>
        setBusy(t.course.uploading(percent)),
      );
      refreshSources();
      if (!copied) {
        setBusy(null);
        setProblem(t.course.uploadFailed);
        return;
      }
    }
    onDone(t.course.videoSaved);
  };

  return (
    <form
      className="piece__body"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <VideoFields
        draft={draft}
        keptFile={lesson.videoFile}
        linkError={linkError}
        fileError={fileError}
        disabled={busy !== null}
        linkRef={linkRef}
        onChange={(next) => {
          setDraft(next);
          setLinkError(false);
          setFileError(false);
        }}
      />
      <p role="status" className="form-status">
        {busy}
      </p>
      {problem === null ? null : (
        <p role="alert" className="field__error">
          <CircleAlert className="field__error-icon" aria-hidden="true" />
          {problem}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="button button--primary" disabled={busy !== null}>
          {t.course.saveVideo}
        </button>
        <button
          type="button"
          className="button button--quiet"
          disabled={busy !== null}
          onClick={() => onDone(null)}
        >
          {t.course.cancel}
        </button>
      </div>
    </form>
  );
}

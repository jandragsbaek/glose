import { COURSE_VIDEO_TYPES } from "@glose/contracts";
import { CircleAlert, Film } from "lucide-react";
import { type RefObject, useId, useRef } from "react";

import { useT } from "../i18n/I18n.tsx";
import { TextField } from "./textImport.tsx";

export interface VideoDraft {
  readonly link: string;
  readonly file: File | null;
  readonly keepFile: boolean;
}

export const NO_VIDEO: VideoDraft = { link: "", file: null, keepFile: false };

const WEB_LINK = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export const videoLinkOf = (text: string): string | null => {
  const trimmed = text.trim();
  const link = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return WEB_LINK.test(link) && link.includes(".") ? link : null;
};

const ACCEPT = COURSE_VIDEO_TYPES.map((type) => `.${type}`).join(",");

export function VideoFields({
  draft,
  keptFile,
  linkError,
  fileError,
  disabled,
  linkRef,
  onChange,
}: {
  readonly draft: VideoDraft;
  readonly keptFile: string | null;
  readonly linkError: boolean;
  readonly fileError: boolean;
  readonly disabled: boolean;
  readonly linkRef?: RefObject<HTMLInputElement | null>;
  readonly onChange: (draft: VideoDraft) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const shownFile = draft.file?.name ?? (draft.keepFile ? keptFile : null);
  return (
    <div className="video-fields">
      <TextField
        label={t.course.videoLink}
        value={draft.link}
        onChange={(link) => onChange({ ...draft, link })}
        hint={t.course.videoLinkHint}
        error={linkError ? t.course.videoLinkBad : undefined}
        inputMode="url"
        disabled={disabled}
        inputRef={linkRef}
        wide
      />
      <div className="field field--wide">
        <span className="field__label">{t.course.videoFile}</span>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          accept={ACCEPT}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            event.currentTarget.value = "";
            if (file !== null) onChange({ ...draft, file, keepFile: false });
          }}
        />
        <div className="video-fields__file">
          <Film className="video-fields__icon" aria-hidden="true" />
          <span className="video-fields__name">{shownFile ?? t.course.noVideoFile}</span>
          <button
            type="button"
            className="button button--small"
            disabled={disabled}
            aria-describedby={`${hintId}${fileError ? ` ${errorId}` : ""}`}
            onClick={() => fileRef.current?.click()}
          >
            {t.course.chooseVideo}
          </button>
          {shownFile === null ? null : (
            <button
              type="button"
              className="button button--small button--quiet"
              disabled={disabled}
              onClick={() => onChange({ ...draft, file: null, keepFile: false })}
            >
              {t.course.removeVideoFile}
            </button>
          )}
        </div>
        <p className="field__hint" id={hintId}>
          {t.course.videoFileHint}
        </p>
        {fileError ? (
          <p className="field__error" id={errorId}>
            <CircleAlert className="field__error-icon" aria-hidden="true" />
            {t.course.videoFileBad}
          </p>
        ) : null}
      </div>
    </div>
  );
}

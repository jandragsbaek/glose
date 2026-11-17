import { POSTS_FOLDER, type WritingProjectFields, type WritingReview } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { Check, TriangleAlert, Waypoints } from "lucide-react";

import { useT } from "../i18n/I18n.tsx";
import { OpenSettingsButton } from "./SettingsWindow.tsx";
import { PieceSettings } from "./WritingPieceSettings.tsx";
import type { SaveState } from "./WritingSave.ts";

export type ReviewState = "idle" | "running" | "done" | "off" | "failed";
export type PublishState =
  | { readonly kind: "idle" }
  | { readonly kind: "writing" }
  | { readonly kind: "written"; readonly file: string }
  | { readonly kind: "failed" };

export const isMac = () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export function DeskBar({
  deskId,
  fields,
  onChange,
  saveState,
  pending,
  mode,
  onMode,
  onCite,
  reviewing,
  onReview,
  siteFolder,
  postFile,
  publishing,
  onPublish,
  graph,
}: {
  readonly deskId: string;
  readonly fields: WritingProjectFields;
  readonly onChange: (change: Partial<WritingProjectFields>) => void;
  readonly saveState: SaveState;
  readonly pending: boolean;
  readonly mode: "write" | "proof";
  readonly onMode: (mode: "write" | "proof") => void;
  readonly onCite: () => void;
  readonly reviewing: boolean;
  readonly onReview: () => void;
  readonly siteFolder: string | null;
  readonly postFile: string;
  readonly publishing: boolean;
  readonly onPublish: () => void;
  readonly graph: {
    readonly open: boolean;
    readonly panelId: string;
    readonly onToggle: () => void;
  } | null;
}) {
  const t = useT();
  const shortcut = isMac() ? "⌘K" : "Ctrl+K";
  return (
    <header className="desk-bar">
      <div className="desk-bar__where">
        <Link to="/writing" className="desk-bar__back">
          {t.writing.title}
        </Link>
        <span className="desk-bar__title">{fields.title}</span>
        <PieceSettings fields={fields} onChange={onChange} />
      </div>
      <div className="desk-bar__tools">
        <span className="desk-bar__status" role="status">
          {saveState === "saving"
            ? t.writing.saving
            : saveState === "failed" || saveState === "taken"
              ? t.writing.notSaved
              : pending
                ? ""
                : t.writing.saved}
        </span>
        <fieldset className="segmented desk-bar__mode">
          <legend className="sr-only">{t.writing.mode}</legend>
          {(["write", "proof"] as const).map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={`${deskId}-mode`}
                checked={mode === option}
                onChange={() => onMode(option)}
              />
              <span>{option === "write" ? t.writing.write : t.writing.proof}</span>
            </label>
          ))}
        </fieldset>
        {graph === null ? null : (
          <button
            type="button"
            className="button desk-bar__graph"
            aria-pressed={graph.open}
            aria-controls={graph.open ? graph.panelId : undefined}
            aria-keyshortcuts={isMac() ? "Meta+G" : "Control+G"}
            title={t.writing.graphToggleTitle}
            onClick={graph.onToggle}
          >
            <Waypoints className="button__icon" aria-hidden="true" />
            {t.writing.graphToggle}
            <kbd className="key" aria-hidden="true">
              {isMac() ? "⌘G" : "Ctrl+G"}
            </kbd>
          </button>
        )}
        {mode === "write" ? (
          <>
            <button
              type="button"
              className="button"
              aria-keyshortcuts={isMac() ? "Meta+K" : "Control+K"}
              onClick={onCite}
            >
              {t.writing.cite}
              <kbd className="key" aria-hidden="true">
                {shortcut}
              </kbd>
            </button>
            <button
              type="button"
              className="button button--quiet"
              disabled={reviewing}
              onClick={onReview}
            >
              {reviewing ? t.writing.reviewing : t.writing.askAi}
            </button>
          </>
        ) : fields.type === "assignment" ? (
          <span className="desk-bar__note">{t.writing.pdfLater}</span>
        ) : (
          <>
            {siteFolder === null ? null : (
              <code
                className="desk-bar__path"
                title={`${siteFolder}/${POSTS_FOLDER.join("/")}/${postFile}`}
              >
                {`${POSTS_FOLDER.join("/")}/${postFile}`}
              </code>
            )}
            <button
              type="button"
              className="button button--primary"
              disabled={publishing}
              onClick={onPublish}
            >
              {publishing
                ? t.writing.writingToSite
                : siteFolder === null
                  ? t.writing.chooseSite
                  : t.writing.writeToSite}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export function DeskNote({
  reviewState,
  review,
  publish,
}: {
  readonly reviewState: ReviewState;
  readonly review: WritingReview | null;
  readonly publish: PublishState;
}) {
  const t = useT();
  return reviewState === "off" ||
    reviewState === "failed" ||
    reviewState === "done" ||
    publish.kind === "written" ||
    publish.kind === "failed" ? (
    <p
      className={
        reviewState === "off" || reviewState === "failed" || publish.kind === "failed"
          ? "desk-note desk-note--problem"
          : "desk-note"
      }
      role="status"
    >
      {publish.kind === "written" ? (
        <>
          <Check className="desk-note__icon desk-note__icon--done" aria-hidden="true" />
          {t.writing.written(publish.file)}
        </>
      ) : publish.kind === "failed" ? (
        <>
          <TriangleAlert className="desk-note__icon" aria-hidden="true" />
          {t.writing.publishFailed}
        </>
      ) : reviewState === "done" && review !== null ? (
        t.writing.reviewed(review.claims.length, review.suggestions.length, review.questions.length)
      ) : reviewState === "off" ? (
        <>
          <TriangleAlert className="desk-note__icon" aria-hidden="true" />
          {t.writing.reviewOff}{" "}
          <OpenSettingsButton section="chatgpt" className="link-button">
            {t.settings.title}
          </OpenSettingsButton>
        </>
      ) : (
        <>
          <TriangleAlert className="desk-note__icon" aria-hidden="true" />
          {t.writing.reviewFailed}
        </>
      )}
    </p>
  ) : null;
}

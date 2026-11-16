import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  type PublicationRecord,
  postFileName,
  referenceToken,
  type ResolvedReference,
  resolveReferences,
  type WritingProject,
  type WritingReview,
} from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { TriangleAlert } from "lucide-react";
import { useId, useRef, useState } from "react";

import { proseWords } from "../domain/writing.ts";
import { useT } from "../i18n/I18n.tsx";
import { graphAtom, settingsAtom, sourcesAtom } from "../state/graph.ts";
import { publishWritingAtom, reviewWritingAtom, WRITING_KEYS } from "../state/writing.ts";
import { flaggedKeys, ProseEditor, type ProseHandle, referenceKey } from "./ProseEditor.tsx";
import {
  DeskBar,
  DeskNote,
  isMac,
  type PublishState,
  type ReviewState,
} from "./WritingDeskBar.tsx";
import {
  Checks,
  Questions,
  ReferenceFlags,
  ReferenceGlosses,
  useMarginPlacement,
} from "./WritingMargins.tsx";
import { Proof } from "./WritingProof.tsx";
import { useWritingSave } from "./WritingSave.ts";
import { CiteSheet, ReplaceSheet, SiteFolderSheet } from "./WritingSheets.tsx";

const fileNameOf = (file: string) => file.split(/[\\/]/).pop() ?? file;

const dayDate = (day: string) => new Date(`${day}T12:00:00`);

const twoDigits = (value: number) => String(value).padStart(2, "0");

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
};

export function WritingDesk({
  project,
  fresh,
  onRenamed,
}: {
  readonly project: WritingProject;
  readonly fresh: boolean;
  readonly onRenamed: (id: string) => void;
}) {
  const t = useT();
  const deskId = useId();
  const { fields, update, saveState, setSaveState, savedId, save, pending } = useWritingSave(
    project,
    onRenamed,
  );
  const [titleInput, setTitleInput] = useState(project.title);
  const [mode, setMode] = useState<"write" | "proof">("write");
  const [published, setPublished] = useState<PublicationRecord | null>(project.published);
  const [review, setReview] = useState<WritingReview | null>(null);
  const [reviewedBody, setReviewedBody] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [cite, setCite] = useState<{ readonly from: number; readonly to: number } | null>(null);
  const [sheet, setSheet] = useState<"site" | { readonly replace: string } | null>(null);
  const [publish, setPublish] = useState<PublishState>({ kind: "idle" });

  const editor = useRef<ProseHandle | null>(null);
  const { leftMargin, rightMargin, editorBox, latestPlace } = useMarginPlacement(editor, mode);

  const graph = AsyncResult.getOrElse(useAtomValue(graphAtom), () => null);
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => null);
  const settings = AsyncResult.getOrElse(useAtomValue(settingsAtom), () => null);
  const reviewWriting = useAtomSet(reviewWritingAtom, { mode: "promiseExit" });
  const publishWriting = useAtomSet(publishWritingAtom, { mode: "promiseExit" });

  const nodes = graph?.nodes ?? [];
  const references = resolveReferences(fields.body, nodes, sources ?? []);
  const flagged = flaggedKeys(
    references
      .filter((reference) => reference.problems.length > 0)
      .map((reference) => referenceKey(reference.target, reference.location)),
  );
  const reviewFits = review !== null && reviewedBody !== null;
  const claims = reviewFits
    ? review.claims.filter((claim) => fields.body.includes(claim.excerpt))
    : [];
  const suggestions = reviewFits
    ? review.suggestions.filter(
        (suggestion) =>
          fields.body.includes(suggestion.excerpt) &&
          !references.some((reference) => reference.noteId === suggestion.noteId),
      )
    : [];

  const runReview = async () => {
    setReviewState("running");
    if (!(await save(fields))) {
      setReviewState("failed");
      return;
    }
    const exit = await reviewWriting({ payload: { id: savedId.current } });
    if (Exit.isSuccess(exit)) {
      setReview(exit.value);
      setReviewedBody(fields.body);
      setReviewState("done");
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    setReviewState(
      Option.isSome(error) &&
        error.value._tag === "WritingReviewUnavailable" &&
        error.value.reason === "off"
        ? "off"
        : "failed",
    );
  };

  const runPublish = async (replace: boolean) => {
    setSheet(null);
    setPublish({ kind: "writing" });
    if (!(await save(fields))) {
      setPublish({ kind: "failed" });
      return;
    }
    const exit = await publishWriting({
      payload: { id: savedId.current, replace },
      reactivityKeys: WRITING_KEYS.list,
    });
    if (Exit.isSuccess(exit)) {
      setPublished(exit.value);
      setPublish({ kind: "written", file: fileNameOf(exit.value.file) });
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    const tag = Option.isSome(error) ? error.value._tag : null;
    if (tag === "SiteFolderNotSet" || tag === "SiteFolderUnavailable") {
      setPublish({ kind: "idle" });
      setSheet("site");
    } else if (Option.isSome(error) && error.value._tag === "PublicationExists") {
      setPublish({ kind: "idle" });
      setSheet({ replace: fileNameOf(error.value.file) });
    } else {
      setPublish({ kind: "failed" });
    }
  };

  const insertReference = (target: string, page: string | null) => {
    if (cite === null) return;
    const { from, to } = cite;
    setCite(null);
    window.requestAnimationFrame(() =>
      editor.current?.replace(from, to, referenceToken(target, page)),
    );
  };

  const addPage = (reference: ResolvedReference) => {
    const token = `[[${reference.target}]]{p. }`;
    editor.current?.replace(reference.start, reference.end, token);
    editor.current?.select(reference.start + token.length - 1, reference.start + token.length - 1);
  };

  const words = proseWords(fields.body);
  const shortcut = isMac() ? "⌘K" : "Ctrl+K";
  const titleError = saveState === "taken" ? t.writing.titleTaken : null;
  const siteFolder = settings?.settings.siteFolder ?? null;
  const postFile = postFileName(published?.date ?? today(), fields.title);

  return (
    <div className="desk-frame">
      <DeskBar
        deskId={deskId}
        fields={fields}
        onChange={update}
        saveState={saveState}
        pending={pending}
        mode={mode}
        onMode={setMode}
        onCite={() => {
          const at = editor.current?.cursor() ?? fields.body.length;
          setCite({ from: at, to: at });
        }}
        reviewing={reviewState === "running"}
        onReview={() => void runReview()}
        siteFolder={siteFolder}
        postFile={postFile}
        publishing={publish.kind === "writing"}
        onPublish={() => void runPublish(false)}
      />
      <DeskNote reviewState={reviewState} review={review} publish={publish} />
      <div className="writing-desk" data-mode={mode}>
        <aside className="writing-desk__margin writing-desk__margin--left" ref={leftMargin}>
          {mode === "write" ? (
            <ReferenceFlags
              references={references}
              claims={claims}
              suggestions={suggestions}
              body={fields.body}
              onAddPage={addPage}
              onChoose={setCite}
              onReplace={(from, to, text) => editor.current?.replace(from, to, text)}
            />
          ) : (
            <Checks
              references={references}
              claims={claims.length}
              reviewed={reviewFits && reviewedBody === fields.body}
              onFix={(reference) => {
                setMode("write");
                if (reference.problems.includes("no-location")) {
                  window.setTimeout(() => addPage(reference), 0);
                }
              }}
              onAsk={() => void runReview()}
            />
          )}
        </aside>

        <article className="leaf" aria-label={t.writing.deskLabel}>
          {mode === "write" ? (
            <>
              <label className="sr-only" htmlFor={`${deskId}-title`}>
                {t.writing.titleLabel}
              </label>
              <input
                id={`${deskId}-title`}
                className="leaf__title-input"
                value={titleInput}
                autoFocus={fresh}
                onFocus={(event) => {
                  if (fresh) event.currentTarget.select();
                }}
                aria-invalid={titleError === null ? undefined : true}
                onChange={(event) => {
                  setTitleInput(event.target.value);
                  if (event.target.value.trim() === "") setSaveState("empty");
                  else update({ title: event.target.value.trim() });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    editor.current?.focus();
                  }
                }}
              />
              {titleError !== null || saveState === "empty" ? (
                <p className="field__error leaf__error">
                  <TriangleAlert className="call__icon" aria-hidden="true" />
                  {titleError ?? t.writing.titleEmpty}
                </p>
              ) : null}
              <p className="leaf__meta">
                {t.writing.types[fields.type]} · {t.writing.meta(words, references.length)}
              </p>
              <div ref={editorBox}>
                <ProseEditor
                  ref={editor}
                  initial={fields.body}
                  flagged={flagged}
                  label={t.writing.bodyLabel}
                  placeholder={t.writing.placeholder(shortcut)}
                  referenceLabel={t.writing.referenceLabel}
                  onChange={(body) => update({ body })}
                  onLayout={() => window.requestAnimationFrame(() => latestPlace.current())}
                  onCite={(at) => setCite({ from: at, to: at })}
                />
              </div>
            </>
          ) : (
            <Proof
              fields={fields}
              references={references}
              date={dayDate(published?.date ?? today())}
            />
          )}
        </article>

        <aside className="writing-desk__margin writing-desk__margin--right" ref={rightMargin}>
          {mode === "write" ? (
            <ReferenceGlosses references={references} fields={fields} />
          ) : (
            <Questions
              review={reviewFits ? review : null}
              running={reviewState === "running"}
              onAsk={() => void runReview()}
            />
          )}
        </aside>
      </div>

      {cite === null || graph === null ? null : (
        <CiteSheet
          nodes={graph.nodes}
          sources={sources ?? []}
          onCite={insertReference}
          onClose={() => {
            setCite(null);
            window.requestAnimationFrame(() => editor.current?.focus());
          }}
        />
      )}
      {sheet === "site" ? (
        <SiteFolderSheet
          initial={siteFolder ?? ""}
          onDone={() => void runPublish(false)}
          onClose={() => setSheet(null)}
        />
      ) : sheet === null ? null : (
        <ReplaceSheet
          file={sheet.replace}
          onReplace={() => void runPublish(true)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

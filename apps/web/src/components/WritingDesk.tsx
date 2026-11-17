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
import { useId, useLayoutEffect, useRef, useState } from "react";

import { hugWord, proseWords, referenceLead } from "../domain/writing.ts";
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
import { keepPlace, type PlaceInText, placeInText } from "./deskPlace.ts";
import { CiteSlip, type CiteTarget, type CloseReason } from "./WritingCite.tsx";
import {
  Checks,
  Questions,
  ReviewFlags,
  ReferenceGlosses,
  useMarginPlacement,
} from "./WritingMargins.tsx";
import {
  followTrail,
  graphWasOpen,
  rememberGraph,
  useGraphFits,
  useGraphKey,
  WritingGraph,
} from "./WritingGraph.tsx";
import { Proof } from "./WritingProof.tsx";
import { useWritingSave } from "./WritingSave.ts";
import { ReplaceSheet, SiteFolderSheet } from "./WritingSheets.tsx";

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
  const [cite, setCite] = useState<CiteTarget | null>(null);
  const [sheet, setSheet] = useState<"site" | { readonly replace: string } | null>(null);
  const [publish, setPublish] = useState<PublishState>({ kind: "idle" });
  const [graphOpen, setGraphOpen] = useState(() => graphWasOpen(project.id));
  const [trail, setTrail] = useState<ReadonlyArray<string>>([]);
  const [reading, setReading] = useState<string | null>(null);
  const graphFits = useGraphFits();

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

  const openCite = (
    from: number,
    to: number,
    editing: CiteTarget["editing"] = null,
    focusPage = false,
    typed = false,
  ) => {
    const line = editor.current?.bottomOf(from) ?? 0;
    const box = editorBox.current?.offsetTop ?? 0;
    setCite({ from, to, top: box + line + 8, editing, focusPage, typed, opened: Date.now() });
  };

  const editReference = (
    reference: Pick<ResolvedReference, "start" | "end" | "target" | "location">,
    focusPage = false,
  ) =>
    openCite(
      reference.start,
      reference.end,
      { target: reference.target, location: reference.location },
      focusPage,
    );

  const closeCite = (reason: CloseReason) => {
    const closing = cite;
    setCite(null);
    if (closing?.typed === true && reason === "escape") {
      editor.current?.replace(closing.from, closing.from, "[[");
    } else if (reason === "escape") {
      window.requestAnimationFrame(() => editor.current?.focus());
    }
  };

  const insertReference = (target: string, page: string | null) => {
    if (cite === null) return;
    const { from, to, editing } = cite;
    setCite(null);
    const token = referenceToken(target, page);
    const at = editing !== null || from === to ? hugWord(fields.body, from) : from;
    editor.current?.replace(at, to, at < from && editing === null ? `${token} ` : token);
  };

  const removeReference = () => {
    if (cite === null) return;
    const { from, to } = cite;
    setCite(null);
    editor.current?.replace(referenceLead(fields.body, from), to, "");
  };

  const addPage = (reference: ResolvedReference) => editReference(reference, true);

  const place = useRef<PlaceInText | null>(null);
  const toggleGraph = () => {
    const next = !graphOpen;
    const kept = placeInText(editor.current, editorBox.current);
    const refocus = !next && document.activeElement?.closest(".graph-beside") != null;
    place.current = { pos: kept?.pos ?? null, offset: kept?.offset ?? 0, refocus };
    setGraphOpen(next);
    rememberGraph(savedId.current, next);
  };
  const besideOpen = graphFits && graphOpen && graph !== null;
  useGraphKey(graphFits && graph !== null, toggleGraph, isMac());
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- scroll and focus, not state: the line the writer was at stays where it was when the desk changes width, and focus comes back to the text from a closing panel.
  useLayoutEffect(() => {
    const kept = place.current;
    place.current = null;
    if (kept === null) return;
    keepPlace(kept, editor.current, editorBox.current);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => keepPlace(kept, editor.current, editorBox.current)),
    );
    if (kept.refocus && !besideOpen) {
      if (mode === "write") editor.current?.focus();
      else document.querySelector<HTMLElement>(".desk-bar__graph")?.focus();
    }
  }, [besideOpen, mode, editorBox]);

  const words = proseWords(fields.body);
  const shortcut = isMac() ? "⌘K" : "Ctrl+K";
  const titleError = saveState === "taken" ? t.writing.titleTaken : null;
  const siteFolder = settings?.settings.siteFolder ?? null;
  const postFile = postFileName(published?.date ?? today(), fields.title);

  return (
    <div
      className="desk-frame"
      data-graph={besideOpen ? "open" : undefined}
      onKeyDown={(event) => {
        if (
          mode !== "write" ||
          event.key.toLowerCase() !== "k" ||
          !(isMac() ? event.metaKey : event.ctrlKey) ||
          (event.target instanceof Element &&
            event.target.closest(".cm-editor, .cite-slip, .graph-beside"))
        ) {
          return;
        }
        event.preventDefault();
        const at = editor.current?.citePoint() ?? fields.body.length;
        openCite(at, at);
      }}
    >
      <DeskBar
        deskId={deskId}
        fields={fields}
        onChange={update}
        saveState={saveState}
        pending={pending}
        mode={mode}
        onMode={setMode}
        onCite={() => {
          const at = editor.current?.citePoint() ?? fields.body.length;
          openCite(at, at);
        }}
        reviewing={reviewState === "running"}
        onReview={() => void runReview()}
        siteFolder={siteFolder}
        postFile={postFile}
        publishing={publish.kind === "writing"}
        onPublish={() => void runPublish(false)}
        graph={
          graphFits
            ? {
                open: besideOpen,
                ready: graph !== null,
                panelId: `${deskId}-graph`,
                onToggle: toggleGraph,
              }
            : null
        }
      />
      <DeskNote reviewState={reviewState} review={review} publish={publish} />
      <div className="desk-body">
        <div className="desk-body__desk">
          <div className="writing-desk" data-mode={mode}>
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
                    <span>
                      {t.writing.types[fields.type]} · {t.writing.meta(words, references.length)}
                    </span>
                    <span className="leaf__hint">
                      {isMac()
                        ? t.writing.formatHint("⌘B", "⌘I", "⌥⌘2")
                        : t.writing.formatHint("Ctrl+B", "Ctrl+I", "Ctrl+Shift+2")}
                    </span>
                  </p>
                  <div ref={editorBox}>
                    <ProseEditor
                      ref={editor}
                      initial={fields.body}
                      flagged={flagged}
                      label={t.writing.bodyLabel}
                      language={fields.language}
                      placeholder={t.writing.placeholder(shortcut)}
                      referenceLabel={t.writing.referenceMarkLabel}
                      onChange={(body) => update({ body })}
                      onLayout={() => window.requestAnimationFrame(() => latestPlace.current())}
                      onCite={(from, to, typed) => openCite(from, to, null, false, typed)}
                      onEditReference={(start) => {
                        const reference = references.find((item) => item.start === start);
                        if (reference !== undefined) editReference(reference);
                      }}
                    />
                  </div>
                  {cite === null || graph === null ? null : (
                    <CiteSlip
                      key={cite.opened}
                      target={cite}
                      nodes={graph.nodes}
                      sources={sources ?? []}
                      cited={references.map((reference) => reference.target)}
                      onCite={insertReference}
                      onRemove={removeReference}
                      onClose={closeCite}
                    />
                  )}
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
                <ReferenceGlosses
                  references={references}
                  current={cite?.editing === null ? null : (cite?.from ?? null)}
                  onEdit={(reference) => editReference(reference)}
                  onAddPage={addPage}
                  onChoose={(reference) => editReference(reference)}
                />
              ) : (
                <Questions
                  review={reviewFits ? review : null}
                  running={reviewState === "running"}
                  onAsk={() => void runReview()}
                />
              )}
            </aside>
            <aside className="writing-desk__margin writing-desk__margin--left" ref={leftMargin}>
              {mode === "write" ? (
                <ReviewFlags
                  claims={claims}
                  suggestions={suggestions}
                  body={fields.body}
                  onChoose={(at) => openCite(at, at)}
                  onReplace={(from, to, text) => editor.current?.replace(from, to, text)}
                />
              ) : (
                <Checks
                  references={references}
                  claims={claims.length}
                  reviewed={reviewFits && reviewedBody === fields.body}
                  onFix={(reference) => {
                    setMode("write");
                    window.setTimeout(() => {
                      editor.current?.select(reference.start, reference.start);
                      window.requestAnimationFrame(() =>
                        editReference(reference, reference.problems.includes("no-location")),
                      );
                    }, 0);
                  }}
                  onAsk={() => void runReview()}
                />
              )}
            </aside>
          </div>
        </div>
        {besideOpen ? (
          <WritingGraph
            id={`${deskId}-graph`}
            view={graph}
            sources={sources ?? []}
            references={references}
            trail={trail}
            open={reading}
            onOpen={(id) => {
              setTrail((now) => followTrail(now, id));
              setReading(id);
            }}
            onClear={() => {
              setTrail([]);
              setReading(null);
            }}
          />
        ) : null}
      </div>

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

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  bibliographyEntry,
  citedSources,
  type CitationStyle,
  noteCitation,
  type PublicationRecord,
  POSTS_FOLDER,
  postFileName,
  type ReferenceForm,
  referenceToken,
  type ResolvedReference,
  resolveReferences,
  shortCitation,
  sourcesHeading,
  type WritingProject,
  type WritingProjectFields,
  type WritingProjectType,
  type WritingReview,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import {
  citationParts,
  insertionAfter,
  type ProofBlock,
  type ProofInline,
  proofBlocks,
  proseWords,
} from "../domain/writing.ts";
import { LANGUAGES, useT } from "../i18n/I18n.tsx";
import { graphAtom, settingsAtom, sourcesAtom } from "../state/graph.ts";
import {
  publishWritingAtom,
  reviewWritingAtom,
  saveWritingAtom,
  WRITING_KEYS,
} from "../state/writing.ts";
import { flaggedKeys, ProseEditor, type ProseHandle, referenceKey } from "./ProseEditor.tsx";
import { CallNumber } from "./ui.tsx";
import { CiteSheet, ReplaceSheet, SiteFolderSheet } from "./WritingSheets.tsx";

/** The writer pauses this long before the text is saved. */
const SAVE_AFTER_MS = 700;

/** Margin notes keep at least this much space between them. */
const MARGIN_GAP = 12;

/** Below this width the margins fold under the leaf (see `.writing-desk` in app.css). */
const WIDE = "(min-width: 1200px)";

const TYPES: ReadonlyArray<WritingProjectType> = ["blog-post", "assignment"];
const FORMS: ReadonlyArray<ReferenceForm> = ["footnotes", "links", "side-notes"];
const STYLES: ReadonlyArray<CitationStyle> = ["chicago", "apa", "harvard"];

type SaveState = "saved" | "saving" | "failed" | "taken" | "empty";
type ReviewState = "idle" | "running" | "done" | "off" | "failed";
type PublishState =
  | { readonly kind: "idle" }
  | { readonly kind: "writing" }
  | { readonly kind: "written"; readonly file: string }
  | { readonly kind: "failed" };

const fieldsOf = (project: WritingProject): WritingProjectFields => ({
  title: project.title,
  type: project.type,
  language: project.language,
  referenceForm: project.referenceForm,
  citationStyle: project.citationStyle,
  body: project.body,
});

const isMac = () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/** The file's name and the folder it is in, from an absolute path. */
const fileNameOf = (file: string) => file.split(/[\\/]/).pop() ?? file;

const dayDate = (day: string) => new Date(`${day}T12:00:00`);

const twoDigits = (value: number) => String(value).padStart(2, "0");

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
};

/** A Citation with its title in italic. */
function Citation({ text }: { readonly text: string }) {
  return (
    <>
      {citationParts(text).map((part) =>
        part.italic ? (
          <i key={`i:${part.text}`}>{part.text}</i>
        ) : (
          <span key={`t:${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The writing desk of one Writing project, "The Glossed Manuscript": one leaf in the middle, the
 * Citations in the right margin beside their lines, the checks and the AI's flags in the left.
 */
export function WritingDesk({
  project,
  fresh,
  onRenamed,
}: {
  readonly project: WritingProject;
  /** Just started: the placeholder title is selected, ready to type over. */
  readonly fresh: boolean;
  readonly onRenamed: (id: string) => void;
}) {
  const t = useT();
  const deskId = useId();
  const [fields, setFields] = useState(() => fieldsOf(project));
  const [titleInput, setTitleInput] = useState(project.title);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [mode, setMode] = useState<"write" | "proof">("write");
  const [published, setPublished] = useState<PublicationRecord | null>(project.published);
  const [review, setReview] = useState<WritingReview | null>(null);
  const [reviewedBody, setReviewedBody] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [cite, setCite] = useState<{ readonly from: number; readonly to: number } | null>(null);
  const [sheet, setSheet] = useState<"site" | { readonly replace: string } | null>(null);
  const [publish, setPublish] = useState<PublishState>({ kind: "idle" });

  const editor = useRef<ProseHandle | null>(null);
  const leftMargin = useRef<HTMLDivElement | null>(null);
  const rightMargin = useRef<HTMLDivElement | null>(null);
  const editorBox = useRef<HTMLDivElement | null>(null);
  /** The file name the server knows the project by; it changes with the title. */
  const savedId = useRef(project.id);
  const lastSaved = useRef(JSON.stringify(fieldsOf(project)));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fieldsOf(project)));
  const saving = useRef<Promise<void>>(Promise.resolve());

  const graph = AsyncResult.getOrElse(useAtomValue(graphAtom), () => null);
  const sources = AsyncResult.getOrElse(useAtomValue(sourcesAtom), () => null);
  const settings = AsyncResult.getOrElse(useAtomValue(settingsAtom), () => null);
  const saveWriting = useAtomSet(saveWritingAtom, { mode: "promiseExit" });
  const reviewWriting = useAtomSet(reviewWritingAtom, { mode: "promiseExit" });
  const publishWriting = useAtomSet(publishWritingAtom, { mode: "promiseExit" });

  const nodes = graph?.nodes ?? [];
  const references = resolveReferences(fields.body, nodes, sources ?? []);
  const flagged = flaggedKeys(
    references
      .filter((reference) => reference.problems.length > 0)
      .map((reference) => referenceKey(reference.target, reference.location)),
  );
  const sourceIdOf = (reference: ResolvedReference) => reference.source?.id ?? null;
  // The AI's notes belong to the text it read; edits since then may move or remove a passage.
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

  const update = (change: Partial<WritingProjectFields>) =>
    setFields((current) => ({ ...current, ...change }));

  /** Saves what is on the desk, one save after another, so a rename never races a save. */
  const save = (next: WritingProjectFields) => {
    const snapshot = JSON.stringify(next);
    saving.current = saving.current.then(async () => {
      if (snapshot === lastSaved.current) return;
      setSaveState("saving");
      const exit = await saveWriting({
        payload: { id: savedId.current, ...next },
        reactivityKeys: WRITING_KEYS.list,
      });
      if (Exit.isSuccess(exit)) {
        lastSaved.current = snapshot;
        setSavedSnapshot(snapshot);
        setSaveState("saved");
        if (exit.value.id !== savedId.current) {
          savedId.current = exit.value.id;
          onRenamed(exit.value.id);
        }
        return;
      }
      const error = Cause.findErrorOption(exit.cause);
      setSaveState(
        Option.isSome(error) && error.value._tag === "WritingProjectNameTaken" ? "taken" : "failed",
      );
    });
  };

  const pending = JSON.stringify(fields) !== savedSnapshot;
  const latest = useRef({ fields, save });
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a ref, not state: the save timer and the closing desk use the newest text and save.
  useLayoutEffect(() => {
    latest.current = { fields, save };
  });
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a timer, not state: the text is written to its file when the writer pauses.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => latest.current.save(fields), SAVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [fields, pending]);
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a save, not state: what the writer typed in the last moment is kept when the desk closes.
  useEffect(() => () => latest.current.save(latest.current.fields), []);

  /** Lines each margin note up with its place in the prose, and keeps notes from overlapping. */
  const placeMargins = () => {
    const box = editorBox.current;
    const handle = editor.current;
    if (box === null || handle === null) return;
    const wide = window.matchMedia(WIDE).matches && mode === "write";
    for (const margin of [leftMargin.current, rightMargin.current]) {
      if (margin === null) continue;
      const items = Array.from(margin.querySelectorAll<HTMLElement>("[data-pos]"));
      if (!wide) {
        for (const item of items) item.style.top = "";
        margin.style.minHeight = "";
        continue;
      }
      const offset = box.getBoundingClientRect().top - margin.getBoundingClientRect().top;
      let floor = 0;
      const placed = items
        .map((item) => ({ item, top: (handle.topOf(Number(item.dataset.pos)) ?? 0) + offset }))
        .sort((a, b) => a.top - b.top);
      for (const { item, top } of placed) {
        const at = Math.max(top, floor);
        item.style.top = `${at}px`;
        floor = at + item.offsetHeight + MARGIN_GAP;
      }
      margin.style.minHeight = `${floor}px`;
    }
  };
  const latestPlace = useRef(placeMargins);
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- layout, not state: the margins are placed beside the lines they gloss after every render.
  useLayoutEffect(() => {
    latestPlace.current = placeMargins;
    placeMargins();
  });
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a resize listener, not state: the lines move when the window changes width.
  useEffect(() => {
    const place = () => latestPlace.current();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  const runReview = async () => {
    setReviewState("running");
    save(fields);
    await saving.current;
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
    save(fields);
    await saving.current;
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

  /** Puts the Reference into the prose, replacing a range (a broken token) or at a place. */
  const insertReference = (target: string, page: string | null) => {
    if (cite === null) return;
    const { from, to } = cite;
    setCite(null);
    // The modal sheet makes the page inert; the text takes the focus once it has closed.
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
      <header className="desk-bar">
        <Link to="/writing" className="desk-bar__back">
          {t.writing.title}
        </Link>
        <span className="desk-bar__title">{fields.title}</span>
        <PieceSettings fields={fields} onChange={update} />
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
                onChange={() => setMode(option)}
              />
              <span>{option === "write" ? t.writing.write : t.writing.proof}</span>
            </label>
          ))}
        </fieldset>
        {mode === "write" ? (
          <>
            <button
              type="button"
              className="button"
              aria-keyshortcuts={isMac() ? "Meta+K" : "Control+K"}
              onClick={() => {
                const at = editor.current?.cursor() ?? fields.body.length;
                setCite({ from: at, to: at });
              }}
            >
              {t.writing.cite}
              <kbd className="key" aria-hidden="true">
                {shortcut}
              </kbd>
            </button>
            <button
              type="button"
              className="button button--quiet"
              disabled={reviewState === "running"}
              onClick={() => void runReview()}
            >
              {reviewState === "running" ? t.writing.reviewing : t.writing.askAi}
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
              disabled={publish.kind === "writing"}
              onClick={() => void runPublish(false)}
            >
              {publish.kind === "writing"
                ? t.writing.writingToSite
                : siteFolder === null
                  ? t.writing.chooseSite
                  : t.writing.writeToSite}
            </button>
          </>
        )}
      </header>
      {reviewState === "off" ||
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
            t.writing.reviewed(
              review.claims.length,
              review.suggestions.length,
              review.questions.length,
            )
          ) : reviewState === "off" ? (
            <>
              <TriangleAlert className="desk-note__icon" aria-hidden="true" />
              {t.writing.reviewOff} <Link to="/settings">{t.settings.title}</Link>
            </>
          ) : (
            <>
              <TriangleAlert className="desk-note__icon" aria-hidden="true" />
              {t.writing.reviewFailed}
            </>
          )}
        </p>
      ) : null}
      <div className="writing-desk" data-mode={mode}>
        <aside className="writing-desk__margin writing-desk__margin--left" ref={leftMargin}>
          {mode === "write" ? (
            <>
              {references.map((reference) =>
                reference.problems.length === 0 ? null : (
                  <div key={`ref-${reference.start}`} className="flag" data-pos={reference.start}>
                    {reference.problems.map((problem) => (
                      <p key={problem} className="flag__title">
                        <TriangleAlert className="flag__icon" aria-hidden="true" />
                        {t.writing.problems[problem]}
                      </p>
                    ))}
                    <p className="flag__text">{t.writing.referenceLabel(reference.number)}</p>
                    <FlagAction
                      reference={reference}
                      sourceId={sourceIdOf(reference)}
                      onAddPage={() => addPage(reference)}
                      onChoose={() => setCite({ from: reference.start, to: reference.end })}
                    />
                  </div>
                ),
              )}
              {claims.map((claim) => {
                const at = fields.body.indexOf(claim.excerpt);
                return (
                  <div key={`claim-${claim.excerpt}`} className="flag" data-pos={at}>
                    <p className="flag__title">
                      <TriangleAlert className="flag__icon" aria-hidden="true" />
                      {t.writing.noReference}
                    </p>
                    <p className="flag__text">{claim.reason}</p>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        const place = insertionAfter(fields.body, claim.excerpt) ?? at;
                        setCite({ from: place, to: place });
                      }}
                    >
                      {t.writing.findNote}
                    </button>
                  </div>
                );
              })}
              {suggestions.map((suggestion) => (
                <div
                  key={`suggest-${suggestion.noteId}-${suggestion.excerpt}`}
                  className="flag flag--ai"
                  data-pos={fields.body.indexOf(suggestion.excerpt)}
                >
                  <p className="flag__gloss">{t.writing.suggested}</p>
                  <p className="flag__note">{suggestion.noteId}</p>
                  <p className="flag__text">{suggestion.reason}</p>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      const place =
                        insertionAfter(fields.body, suggestion.excerpt) ?? fields.body.length;
                      editor.current?.replace(
                        place,
                        place,
                        referenceToken(suggestion.noteId, null),
                      );
                    }}
                  >
                    {t.writing.citeThis}
                  </button>
                </div>
              ))}
            </>
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
                  initial={project.body}
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
            references.map((reference) => (
              <div
                key={`gloss-${reference.start}`}
                className={reference.problems.length > 0 ? "gloss gloss--flagged" : "gloss"}
                data-pos={reference.start}
              >
                <p className="gloss__cite">
                  <span className="gloss__number">{reference.number}</span>
                  {reference.source === null ? (
                    reference.target
                  ) : fields.type === "assignment" ? (
                    `(${shortCitation(reference.source, reference.page, fields.citationStyle)})`
                  ) : (
                    <Citation text={noteCitation(reference.source, reference.page)} />
                  )}
                </p>
                {reference.noteId === null ? null : (
                  <p className="gloss__note">{reference.noteId}</p>
                )}
                {reference.source === null ? null : (
                  <CallNumber source={reference.source} page={reference.page} />
                )}
              </div>
            ))
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

/** The way to fix what a check found in one Reference. */
function FlagAction({
  reference,
  sourceId,
  onAddPage,
  onChoose,
}: {
  readonly reference: ResolvedReference;
  readonly sourceId: string | null;
  readonly onAddPage: () => void;
  readonly onChoose: () => void;
}) {
  const t = useT();
  const problem = reference.problems[0];
  if (problem === "no-location") {
    return (
      <button type="button" className="link-button" onClick={onAddPage}>
        {t.writing.addPage}
      </button>
    );
  }
  if (problem === "not-found") {
    return (
      <button type="button" className="link-button" onClick={onChoose}>
        {t.writing.chooseNote}
      </button>
    );
  }
  if ((problem === "no-year" || problem === "no-publisher") && sourceId !== null) {
    return (
      <Link className="link-button" to="/sources/$sourceId" params={{ sourceId }}>
        {t.writing.openSource}
      </Link>
    );
  }
  if (reference.noteId !== null) {
    return (
      <Link className="link-button" to="/graph" search={{ node: reference.noteId }}>
        {t.writing.showNote}
      </Link>
    );
  }
  return null;
}

/** The type of the piece, how its References appear, and its language. */
function PieceSettings({
  fields,
  onChange,
}: {
  readonly fields: WritingProjectFields;
  readonly onChange: (change: Partial<WritingProjectFields>) => void;
}) {
  const t = useT();
  const id = useId();
  const languageId = useId();
  const sample: ResolvedReference = {
    start: 0,
    end: 0,
    target: "",
    location: "64",
    number: 1,
    noteId: null,
    page: "64",
    quote: null,
    problems: [],
    source: {
      id: "",
      familyName: "Newport",
      givenName: "Cal",
      title: "Deep Work",
      firstPublished: 2016,
      edition: null,
      editionYear: null,
      publisher: "Grand Central Publishing",
      translator: null,
    },
  };
  const source = sample.source;
  const slip = useRef<HTMLDetailsElement | null>(null);
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- listeners, not state: the open slip closes on a click outside it or on Esc, as a menu does.
  useEffect(() => {
    const close = (event: Event) => {
      const node = slip.current;
      if (node === null || !node.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !node.contains(event.target as Node)
      ) {
        node.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details className="piece-settings" ref={slip}>
      <summary className="piece-settings__chip">
        <span className="sr-only">{t.writing.settingsOfPiece}: </span>
        {fields.type === "blog-post"
          ? `${t.writing.types[fields.type]} · ${t.writing.referenceForms[fields.referenceForm]}`
          : `${t.writing.types[fields.type]} · ${t.writing.citationStyles[fields.citationStyle]}`}
        <ChevronDown className="piece-settings__icon" aria-hidden="true" />
      </summary>
      <div className="piece-settings__panel">
        <fieldset className="piece-settings__group">
          <legend className="piece-settings__legend">{t.writing.typeLabel}</legend>
          {TYPES.map((type) => (
            <label key={type} className="piece-settings__choice">
              <input
                type="radio"
                name={`${id}-type`}
                checked={fields.type === type}
                onChange={() => onChange({ type })}
              />
              <span>
                <span className="piece-settings__choice-title">{t.writing.types[type]}</span>
                <span className="piece-settings__choice-text">{t.writing.endsAs[type]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {fields.type === "blog-post" ? (
          <fieldset className="piece-settings__group">
            <legend className="piece-settings__legend">{t.writing.referenceFormLabel}</legend>
            <div className="segmented">
              {FORMS.map((form) => (
                <label key={form}>
                  <input
                    type="radio"
                    name={`${id}-form`}
                    checked={fields.referenceForm === form}
                    onChange={() => onChange({ referenceForm: form })}
                  />
                  <span>{t.writing.referenceForms[form]}</span>
                </label>
              ))}
            </div>
            {source === null ? null : (
              <p className="piece-settings__sample">
                {t.writing.sample}
                {fields.referenceForm === "links" ? (
                  <span className="piece-settings__link">
                    {` (${shortCitation(source, "64", "chicago")})`}
                  </span>
                ) : (
                  <sup>1</sup>
                )}
                <span className="piece-settings__sample-note">
                  {fields.referenceForm === "links" ? (
                    <Citation text={bibliographyEntry(source, "chicago")} />
                  ) : (
                    <>
                      1. <Citation text={noteCitation(source, "64")} />
                    </>
                  )}
                </span>
              </p>
            )}
            <p className="field__hint">{t.writing.referenceFormHint}</p>
          </fieldset>
        ) : (
          <fieldset className="piece-settings__group">
            <legend className="piece-settings__legend">{t.writing.citationStyleLabel}</legend>
            <div className="segmented">
              {STYLES.map((style) => (
                <label key={style}>
                  <input
                    type="radio"
                    name={`${id}-style`}
                    checked={fields.citationStyle === style}
                    onChange={() => onChange({ citationStyle: style })}
                  />
                  <span>{t.writing.citationStyles[style]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="field">
          <label className="field__label" htmlFor={languageId}>
            {t.writing.languageLabel}
          </label>
          <span className="select">
            <select
              id={languageId}
              className="input"
              value={fields.language}
              onChange={(event) => onChange({ language: event.target.value })}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t.languages[language]}
                </option>
              ))}
              {LANGUAGES.some((language) => language === fields.language) ? null : (
                <option value={fields.language}>{fields.language}</option>
              )}
            </select>
            <ChevronDown className="select__icon" aria-hidden="true" />
          </span>
        </div>
      </div>
    </details>
  );
}

/** The post as readers will see it, in the Reference form the piece uses. */
function Proof({
  fields,
  references,
  date,
}: {
  readonly fields: WritingProjectFields;
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly date: Date;
}) {
  const t = useT();
  const blocks = proofBlocks(fields.body, references);
  const inline = fields.type === "assignment" || fields.referenceForm === "links";
  const style: CitationStyle = fields.type === "assignment" ? fields.citationStyle : "chicago";
  const heading =
    fields.type === "assignment" ? t.writing.bibliography : sourcesHeading(fields.language);
  const citation = (reference: ResolvedReference) =>
    reference.source === null ? reference.target : noteCitation(reference.source, reference.page);

  const renderInline = (part: ProofInline): ReactNode => {
    switch (part.kind) {
      case "text":
        return <span key={part.at}>{part.text}</span>;
      case "em":
        return <em key={part.at}>{part.text}</em>;
      case "strong":
        return <strong key={part.at}>{part.text}</strong>;
      case "reference": {
        const { reference } = part;
        const flagged = reference.problems.length > 0;
        if (inline) {
          return (
            <span
              key={part.at}
              className={flagged ? "proof__cite proof__cite--flagged" : "proof__cite"}
            >
              {" ("}
              {reference.source === null
                ? reference.target
                : shortCitation(reference.source, reference.page, style)}
              {")"}
            </span>
          );
        }
        return (
          <sup key={part.at} className={flagged ? "proof__ref proof__ref--flagged" : "proof__ref"}>
            {reference.number}
          </sup>
        );
      }
    }
  };

  const renderBlock = (block: ProofBlock): ReactNode => {
    const sideNotes =
      !inline && fields.referenceForm === "side-notes" && block.references.length > 0 ? (
        <aside className="proof__side-notes">
          {block.references.map((reference) => (
            <p key={reference.start}>
              <sup>{reference.number}</sup> <Citation text={citation(reference)} />
            </p>
          ))}
        </aside>
      ) : null;
    switch (block.kind) {
      case "heading": {
        const Tag = block.level <= 2 ? "h2" : "h3";
        return <Tag key={block.at}>{block.inlines.map(renderInline)}</Tag>;
      }
      case "quote":
        return (
          <div key={block.at}>
            <blockquote>{block.inlines.map(renderInline)}</blockquote>
            {sideNotes}
          </div>
        );
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <div key={block.at}>
            <Tag>
              {block.items.map((item) => (
                <li key={item[0]?.at ?? block.at}>{item.map(renderInline)}</li>
              ))}
            </Tag>
            {sideNotes}
          </div>
        );
      }
      case "paragraph":
        return (
          <div key={block.at}>
            <p>{block.inlines.map(renderInline)}</p>
            {sideNotes}
          </div>
        );
    }
  };

  return (
    <div className="proof" lang={fields.language}>
      <h1 className="proof__title">{fields.title}</h1>
      <p className="leaf__meta">{t.writing.proofMeta(date)}</p>
      <div className="proof__body">{blocks.map(renderBlock)}</div>
      {references.length === 0 ? null : inline ? (
        <section className="proof__sources">
          <h2>{heading}</h2>
          <ul>
            {citedSources(references).map((source) => (
              <li key={source.id}>
                <Citation text={bibliographyEntry(source, style)} />
              </li>
            ))}
          </ul>
        </section>
      ) : fields.referenceForm === "footnotes" ? (
        <ol className="proof__notes">
          {references.map((reference) => (
            <li
              key={reference.start}
              className={reference.problems.length > 0 ? "proof__note--flagged" : undefined}
            >
              <Citation text={citation(reference)} />
              {reference.problems.length > 0 ? (
                <span className="proof__problem">
                  <TriangleAlert className="call__icon" aria-hidden="true" />
                  {t.writing.problems[reference.problems[0] ?? "no-location"]}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** What to fix before publishing; each line says how. */
function Checks({
  references,
  claims,
  reviewed,
  onFix,
  onAsk,
}: {
  readonly references: ReadonlyArray<ResolvedReference>;
  readonly claims: number;
  readonly reviewed: boolean;
  readonly onFix: (reference: ResolvedReference) => void;
  readonly onAsk: () => void;
}) {
  const t = useT();
  const ready = references.filter((reference) => reference.problems.length === 0);
  const flagged = references.filter((reference) => reference.problems.length > 0);
  const quotes = references.filter((reference) => reference.quote !== null);
  return (
    <section className="checks" aria-labelledby="checks-title">
      <h2 className="margin-heading" id="checks-title">
        {t.writing.checksTitle}
      </h2>
      {references.length === 0 ? (
        <p className="checks__line">{t.writing.checkNone}</p>
      ) : (
        <p className="checks__line checks__line--ok">
          <Check className="checks__icon" aria-hidden="true" />
          <span>
            {t.writing.checkReady(ready.length)}
            <span className="checks__hint">{t.writing.checkReadyHint}</span>
          </span>
        </p>
      )}
      {flagged.map((reference) => (
        <p key={reference.start} className="checks__line checks__line--problem">
          <TriangleAlert className="checks__icon" aria-hidden="true" />
          <span>
            <strong>
              {t.writing.checkProblem(
                reference.number,
                reference.problems.map((problem) => t.writing.problems[problem]).join(" · "),
              )}
            </strong>{" "}
            <button type="button" className="link-button" onClick={() => onFix(reference)}>
              {reference.problems[0] === "no-location" ? t.writing.addPage : t.writing.write}
            </button>
          </span>
        </p>
      ))}
      {claims === 0 ? null : (
        <p className="checks__line checks__line--problem">
          <TriangleAlert className="checks__icon" aria-hidden="true" />
          <strong>{t.writing.checkClaims(claims)}</strong>
        </p>
      )}
      {quotes.length > 0 &&
      quotes.every((reference) => !reference.problems.includes("quote-mismatch")) ? (
        <p className="checks__line checks__line--ok">
          <Check className="checks__icon" aria-hidden="true" />
          {t.writing.checkQuotes}
        </p>
      ) : null}
      {reviewed ? null : (
        <p className="checks__line">
          <span>
            {t.writing.notReviewed}{" "}
            <button type="button" className="link-button" onClick={onAsk}>
              {t.writing.askAi}
            </button>
          </span>
        </p>
      )}
    </section>
  );
}

/** The AI's questions about the argument, asked before publishing. */
function Questions({
  review,
  running,
  onAsk,
}: {
  readonly review: WritingReview | null;
  readonly running: boolean;
  readonly onAsk: () => void;
}) {
  const t = useT();
  return (
    <section className="questions" aria-labelledby="questions-title">
      <h2 className="margin-heading" id="questions-title">
        {t.writing.questionsTitle}
      </h2>
      {review === null || review.questions.length === 0 ? (
        <p className="questions__empty">{t.writing.questionsEmpty}</p>
      ) : (
        review.questions.map((question) => (
          <div key={question.question} className="question">
            <p className="question__about">
              {question.excerpt === null
                ? t.writing.ai
                : `${t.writing.ai} · ${t.writing.aboutPassage} “${question.excerpt}”`}
            </p>
            <p>{question.question}</p>
          </div>
        ))
      )}
      <button type="button" className="link-button" disabled={running} onClick={onAsk}>
        {running ? t.writing.reviewing : t.writing.askQuestions}
      </button>
    </section>
  );
}

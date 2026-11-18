import { useAtomSet } from "@effect/atom-react";
import { type FoundPage, pageAuthorship, type ResearchLink, type Session } from "@glose/contracts";
import { useBlocker } from "@tanstack/react-router";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { Check, ChevronDown, CircleAlert, TriangleAlert } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  citedNumbers,
  footnotesFor,
  insertMarker,
  type KeptQuote,
  keptQuotes,
  pagesOf,
  proposedLinksOf,
} from "../graph/newNote.ts";
import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS } from "../state/cards.ts";
import { KEYS } from "../state/graph.ts";
import { createNoteAtom } from "../state/research.ts";
import { CallNumber, Panel } from "./ui.tsx";

type Problem =
  | { readonly kind: "noTitle" }
  | { readonly kind: "taken"; readonly name: string }
  | { readonly kind: "missing"; readonly numbers: ReadonlyArray<number> }
  | { readonly kind: "page"; readonly reason: "not-kept" | "unreadable" | "quote-gone" }
  | { readonly kind: "failed" };

export function NewNote({
  title,
  onTitle,
  text,
  onText,
  checked,
  onCheck,
  session,
  leaving,
  onStay,
  onClose,
  onSaved,
  onSaving,
}: {
  readonly title: string;
  readonly onTitle: (title: string) => void;
  readonly text: string;
  readonly onText: (text: string) => void;
  readonly checked: ReadonlySet<string>;
  readonly onCheck: (note: string, on: boolean) => void;
  readonly session: Session | null;
  readonly leaving: boolean;
  readonly onStay: () => void;
  readonly onClose: () => void;
  readonly onSaved: (id: string) => void | Promise<void>;
  readonly onSaving: (saving: boolean) => void;
}) {
  const t = useT();
  const create = useAtomSet(createNoteAtom, { mode: "promiseExit" });
  const titleId = useId();
  const textId = useId();
  const restsId = useId();
  const errorId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const refocusCancel = useRef(false);

  const [restsOn, setRestsOn] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [discarding, setDiscarding] = useState(false);

  const pages = session === null ? [] : pagesOf(session.entries);
  const kept = pages.filter((page) => page.state === "kept");
  const quotes = keptQuotes(pages);
  const links = session === null ? [] : proposedLinksOf(session.entries);
  const source =
    restsOn === null ? null : (kept.find((page) => page.id === restsOn) ?? kept[0] ?? null);
  const cited = new Set(citedNumbers(text));
  const used = new Set([
    ...(source === null ? [] : [source.id]),
    ...quotes.map((quote) => quote.page),
  ]);
  const becoming = kept.filter((page) => used.has(page.id) && page.source === null).length;

  const changed = title.trim() !== "" || text.trim() !== "" || kept.length > 0;
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => changed && next.pathname !== "/graph",
    enableBeforeUnload: false,
    withResolver: true,
  });
  const asking = discarding || leaving || blocker.status === "blocked";
  const discard = () => (blocker.status === "blocked" ? blocker.proceed() : onClose());
  const keepWriting = () => {
    refocusCancel.current = true;
    if (blocker.status === "blocked") blocker.reset();
    if (leaving) onStay();
    setDiscarding(false);
  };
  const cancel = () => (changed ? setDiscarding(true) : onClose());

  const cite = (quote: KeptQuote) => {
    const field = textRef.current;
    const at = caret.current ?? text.length;
    const next = insertMarker(text, at, quote.number);
    onText(next.text);
    caret.current = next.caret;
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next.caret, next.caret);
    });
  };

  const submit = async () => {
    const finalTitle = title.trim();
    if (finalTitle === "") {
      setProblem({ kind: "noTitle" });
      return;
    }
    const notes = footnotesFor(text, quotes);
    if (notes.missing.length > 0) {
      setProblem({ kind: "missing", numbers: notes.missing });
      return;
    }
    setProblem(null);
    setBusy(true);
    onSaving(true);
    const exit = await create({
      payload: {
        title: finalTitle,
        text: notes.text,
        session: session?.id ?? null,
        restsOn: source?.id ?? null,
        quotes: notes.quotes,
        links: links.map((link) => link.note).filter((note) => checked.has(note)),
      },
      reactivityKeys: [...KEYS.sources, ...CARD_KEYS.cards],
    });
    setBusy(false);
    onSaving(false);
    if (Exit.isSuccess(exit)) {
      void onSaved(exit.value);
      return;
    }
    const error = Option.getOrNull(Cause.findErrorOption(exit.cause));
    setProblem(
      error?._tag === "NoteNameTaken"
        ? { kind: "taken", name: error.fileName }
        : error?._tag === "PageRefused"
          ? { kind: "page", reason: error.reason }
          : { kind: "failed" },
    );
  };

  return (
    <Panel title={t.newNote.title} initial="accent" meta={t.newNote.meta}>
      <form
        className="note-leaf"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || busy) return;
          event.preventDefault();
          if (asking) keepWriting();
          else cancel();
        }}
      >
        <div className="note-leaf__top">
          <label className="sr-only" htmlFor={titleId}>
            {t.newNote.titleLabel}
          </label>
          <textarea
            id={titleId}
            className="write__title note-leaf__title"
            rows={1}
            value={title}
            placeholder={t.newNote.titlePlaceholder}
            aria-invalid={problem?.kind === "noTitle" || problem?.kind === "taken" || undefined}
            aria-describedby={problem === null ? undefined : errorId}
            readOnly={busy}
            onChange={(event) => {
              onTitle(event.target.value.replace(/\n/g, " "));
              if (problem?.kind === "noTitle" || problem?.kind === "taken") setProblem(null);
            }}
            spellCheck
            autoFocus
          />
          <RestsOn
            id={restsId}
            busy={busy}
            kept={kept}
            source={source}
            onChoose={(id) => setRestsOn(id)}
          />
        </div>

        <div className="note-leaf__text">
          <label className="field__label" htmlFor={textId}>
            {t.newNote.textLabel}
          </label>
          <textarea
            ref={textRef}
            id={textId}
            className="textarea note-leaf__words"
            value={text}
            placeholder={t.newNote.textPlaceholder}
            readOnly={busy}
            onChange={(event) => onText(event.target.value)}
            onSelect={(event) => {
              caret.current = event.currentTarget.selectionStart;
            }}
            spellCheck
          />
        </div>

        <Apparatus quotes={quotes} cited={cited} busy={busy} onCite={cite} />

        {links.length === 0 ? null : (
          <LinkChoices links={links} checked={checked} busy={busy} onCheck={onCheck} />
        )}

        <div className="note-leaf__foot">
          {asking ? (
            <div
              className="rewrite__discard"
              role="alertdialog"
              aria-label={t.rewrite.discardQuestion}
            >
              <p>{t.rewrite.discardQuestion}</p>
              <button type="button" className="button" onClick={discard}>
                {t.rewrite.discard}
              </button>
              <button
                type="button"
                className="button button--quiet"
                autoFocus
                onClick={keepWriting}
              >
                {t.rewrite.keepWriting}
              </button>
            </div>
          ) : (
            <>
              <button type="submit" className="button button--primary" disabled={busy}>
                {busy ? t.newNote.saving : t.newNote.save}
              </button>
              <button
                ref={(button) => {
                  if (button === null || !refocusCancel.current) return;
                  refocusCancel.current = false;
                  button.focus();
                }}
                type="button"
                className="button button--quiet"
                disabled={busy}
                onClick={cancel}
              >
                {t.rewrite.cancel}
              </button>
              <span className="note-leaf__count" aria-live="polite">
                {t.newNote.becomesSources(becoming)}
              </span>
            </>
          )}
          {problem === null ? null : (
            <p className="field__error note-leaf__error" id={errorId} role="alert">
              <CircleAlert className="call__icon" aria-hidden="true" />
              {problemText(problem, t)}
            </p>
          )}
        </div>
      </form>
    </Panel>
  );
}

const problemText = (problem: Problem, t: ReturnType<typeof useT>): string => {
  switch (problem.kind) {
    case "noTitle":
      return t.rewrite.noTitle;
    case "taken":
      return t.rewrite.nameTaken(problem.name);
    case "missing":
      return t.newNote.citesMissing(problem.numbers);
    case "page":
      return t.newNote.pageProblems[problem.reason];
    case "failed":
      return t.rewrite.saveFailed;
  }
};

function RestsOn({
  id,
  busy,
  kept,
  source,
  onChoose,
}: {
  readonly id: string;
  readonly busy: boolean;
  readonly kept: ReadonlyArray<FoundPage>;
  readonly source: FoundPage | null;
  readonly onChoose: (id: string | null) => void;
}) {
  const t = useT();
  return (
    <div className="note-leaf__rests">
      {kept.length === 0 ? (
        <span className="note-leaf__rests-label">{t.newNote.restsOn}</span>
      ) : (
        <label className="note-leaf__rests-label" htmlFor={id}>
          {t.newNote.restsOn}
        </label>
      )}
      {source === null ? (
        <span className="note-leaf__none">
          <TriangleAlert className="call__icon" aria-hidden="true" />
          {t.newNote.noSource}
        </span>
      ) : (
        <CallNumber source={pageAuthorship(source)} />
      )}
      {kept.length === 0 ? (
        <span className="note-leaf__hint">{t.newNote.noSourceHint}</span>
      ) : (
        <span className="select note-leaf__select">
          <select
            id={id}
            className="input"
            disabled={busy}
            aria-label={t.newNote.restsOnLabel}
            value={source?.id ?? ""}
            onChange={(event) => onChoose(event.target.value === "" ? null : event.target.value)}
          >
            {kept.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
            <option value="">{t.newNote.noSource}</option>
          </select>
          <ChevronDown className="select__icon" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function Apparatus({
  quotes,
  cited,
  busy,
  onCite,
}: {
  readonly quotes: ReadonlyArray<KeptQuote>;
  readonly cited: ReadonlySet<number>;
  readonly busy: boolean;
  readonly onCite: (quote: KeptQuote) => void;
}) {
  const t = useT();
  const headId = useId();
  return (
    <section className="note-leaf__apparatus" aria-labelledby={headId}>
      <h3 className="note-leaf__head" id={headId}>
        {t.newNote.quotes}
        {quotes.length === 0 ? null : (
          <span className="note-leaf__head-count"> · {quotes.length}</span>
        )}
      </h3>
      {quotes.length === 0 ? (
        <p className="note-leaf__hint">{t.newNote.quotesEmpty}</p>
      ) : (
        <ol className="note-leaf__quotes">
          {quotes.map((quote) => (
            <li
              key={quote.number}
              className="note-leaf__quote"
              data-cited={cited.has(quote.number) || undefined}
            >
              <button
                type="button"
                className="note-leaf__cite"
                aria-label={t.newNote.cite(quote.number)}
                title={t.newNote.cite(quote.number)}
                onMouseDown={(event) => event.preventDefault()}
                disabled={busy}
                onClick={() => onCite(quote)}
              >
                {quote.number}
              </button>
              <p className="note-leaf__quote-text">
                “{quote.text}”{" "}
                <span className="note-leaf__quote-from">
                  {quote.pageTitle} · {t.newNote.paragraph(quote.paragraph)}
                </span>
              </p>
              <span className="note-leaf__check" title={t.newNote.wordForWordHint}>
                <Check className="note-leaf__check-icon" aria-hidden="true" />
                {cited.has(quote.number) ? t.newNote.citedIn(quote.number) : t.newNote.wordForWord}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function LinkChoices({
  links,
  checked,
  busy,
  onCheck,
}: {
  readonly links: ReadonlyArray<ResearchLink>;
  readonly checked: ReadonlySet<string>;
  readonly busy: boolean;
  readonly onCheck: (note: string, on: boolean) => void;
}) {
  const t = useT();
  return (
    <fieldset className="note-leaf__links">
      <legend className="note-leaf__head">{t.newNote.links}</legend>
      <p className="note-leaf__hint">{t.newNote.linksHint}</p>
      <ul className="note-leaf__link-list">
        {links.map((link) => (
          <li key={link.note}>
            <label className="note-leaf__link">
              <input
                type="checkbox"
                checked={checked.has(link.note)}
                disabled={busy}
                onChange={(event) => onCheck(link.note, event.target.checked)}
              />
              <span className="note-leaf__link-name">{link.note}</span>
              <span className="note-leaf__link-why">{link.why}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

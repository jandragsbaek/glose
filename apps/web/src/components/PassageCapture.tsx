import { useAtomSet } from "@effect/atom-react";
import type { BookPassage, Source } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { TriangleAlert } from "lucide-react";
import { type ClipboardEvent, type KeyboardEvent, useId, useRef, useState } from "react";

import {
  furthestPage,
  hasBrokenLines,
  joinLines,
  keptBefore,
  pastedLocation,
} from "../domain/passages.ts";
import { useT } from "../i18n/I18n.tsx";
import { createPassageAtom } from "../state/passages.ts";
import { IS_MAC } from "./Session.tsx";

const draftKey = (source: string) => `glose.passage-draft.${source}`;

const readDraft = (source: string): string => {
  try {
    return window.localStorage.getItem(draftKey(source)) ?? "";
  } catch {
    return "";
  }
};

export const forgetPassageDraft = (source: string) => writeDraft(source, "");

const writeDraft = (source: string, words: string) => {
  try {
    if (words === "") window.localStorage.removeItem(draftKey(source));
    else window.localStorage.setItem(draftKey(source), words);
  } catch {
    return;
  }
};

export function PassageCapture({
  source,
  passages,
}: {
  readonly source: Source;
  readonly passages: ReadonlyArray<BookPassage>;
}) {
  const t = useT();
  const pageId = useId();
  const wordsId = useId();
  const mineId = useId();
  const hintId = useId();
  const wordsRef = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState("");
  const [carried, setCarried] = useState(false);
  const [words, setWordsState] = useState(() => readDraft(source.id));
  const [mine, setMine] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pasted, setPasted] = useState<"location" | "lines" | null>(null);
  const create = useAtomSet(createPassageAtom, { mode: "promiseExit" });

  const setWords = (value: string) => {
    setWordsState(value);
    writeDraft(source.id, value);
  };
  const last = furthestPage(passages);
  const before = keptBefore(passages, words);
  const location = pasted === "location" ? pastedLocation(words) : null;

  const keep = async () => {
    if (busy || words.trim() === "") return;
    const kept = { words, mine };
    setBusy(true);
    const exit = await create({
      source: source.id,
      page: page.trim() === "" ? null : page.trim(),
      words: words.trim(),
      yourWords: mine.trim(),
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    if (Exit.isFailure(exit)) return;
    setWordsState((now) => {
      const left = now === kept.words ? "" : now;
      writeDraft(source.id, left);
      return left;
    });
    setMine((now) => (now === kept.mine ? "" : now));
    setPasted(null);
    setCarried(page.trim() !== "");
    wordsRef.current?.focus();
  };

  const onKeys = (event: KeyboardEvent) => {
    if (event.key === "Enter" && (IS_MAC ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      void keep();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text");
    setPasted(pastedLocation(text) !== null ? "location" : hasBrokenLines(text) ? "lines" : null);
  };

  return (
    <section className="capture" aria-labelledby={hintId} onKeyDown={onKeys}>
      <h2 className="capture__title" id={hintId}>
        {t.passages.capture.title}
      </h2>
      <div className="capture__grid">
        <label className="capture__page" htmlFor={pageId}>
          <span className="sr-only">{t.passages.capture.page}</span>
          <input
            id={pageId}
            className="input capture__page-input"
            value={page}
            placeholder={t.passages.capture.page}
            title={t.passages.capture.pageHint}
            onChange={(event) => {
              setPage(event.target.value);
              setCarried(false);
            }}
          />
          <span className="capture__carried">
            {carried && page.trim() !== ""
              ? t.passages.capture.carried
              : page === "" && last !== null
                ? t.passages.capture.lastTime(t.passages.page(last))
                : null}
          </span>
        </label>
        <label className="sr-only" htmlFor={wordsId}>
          {t.passages.capture.words}
        </label>
        <textarea
          ref={wordsRef}
          id={wordsId}
          className="textarea capture__words"
          placeholder={t.passages.capture.words}
          title={t.passages.capture.wordsHint}
          value={words}
          autoFocus
          onPaste={onPaste}
          onChange={(event) => setWords(event.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="button button--primary capture__keep"
          disabled={busy || words.trim() === ""}
          aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
          onClick={() => void keep()}
        >
          {busy ? t.passages.capture.keeping : t.passages.capture.keep}
          <kbd className="key" aria-hidden="true">
            {IS_MAC ? "⌘↵" : "Ctrl ↵"}
          </kbd>
        </button>
        <label className="sr-only" htmlFor={mineId}>
          {t.passages.capture.yourWords}
        </label>
        <input
          id={mineId}
          className="capture__mine"
          placeholder={t.passages.capture.yourWords}
          value={mine}
          onChange={(event) => setMine(event.target.value)}
          spellCheck
        />
        <p className="capture__line" role="status">
          {failed ? (
            <span className="capture__warn">
              <TriangleAlert className="capture__icon" aria-hidden="true" />
              {t.passages.failed}
            </span>
          ) : location !== null ? (
            <span className="capture__offer">
              {t.passages.capture.pasteNamed(location.location)}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setPage(location.location);
                  setCarried(false);
                  setWords(location.words);
                  setPasted(null);
                }}
              >
                {t.passages.capture.asPage(location.location)}
              </button>
            </span>
          ) : pasted === "lines" && hasBrokenLines(words) ? (
            <span className="capture__offer">
              {t.passages.capture.broken}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setWords(joinLines(words));
                  setPasted(null);
                }}
              >
                {t.passages.capture.joinLines}
              </button>
            </span>
          ) : before !== null ? (
            <span className="capture__warn">
              <TriangleAlert className="capture__icon" aria-hidden="true" />
              {t.passages.capture.again(before.created ?? "")}
            </span>
          ) : words !== "" ? (
            t.passages.capture.draft
          ) : null}
        </p>
      </div>
    </section>
  );
}

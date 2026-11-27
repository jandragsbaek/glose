import { useAtomSet } from "@effect/atom-react";
import type { BookPassage } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import { Check, TriangleAlert } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { deletePassageAtom, updatePassageAtom } from "../state/passages.ts";
import { Notice } from "./ui.tsx";

export const passageElement = (id: string) => `passage-${id}`;

export function PassageEntry({
  source,
  passage,
  selected,
  onDesk,
  onToggle,
}: {
  readonly source: string;
  readonly passage: BookPassage;
  readonly selected: boolean;
  readonly onDesk: number | null;
  readonly onToggle: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const remove = useAtomSet(deletePassageAtom, { mode: "promiseExit" });
  const used = passage.usedBy.length > 0;
  const location = passage.page === null ? null : t.passages.page(passage.page);
  const desked = onDesk !== null && onDesk >= 0;

  if (editing) {
    return (
      <li className="book-passage" id={passageElement(passage.id)} data-passage={passage.id}>
        <PassageEdit source={source} passage={passage} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      className="book-passage"
      id={passageElement(passage.id)}
      data-passage={passage.id}
      data-selected={selected || desked ? "" : undefined}
      data-used={used ? "" : undefined}
      tabIndex={0}
    >
      <span className="book-passage__loc">{location}</span>
      <label className="book-passage__choose">
        <input
          type="checkbox"
          checked={selected || desked}
          disabled={onDesk !== null}
          onChange={onToggle}
        />
        <span className="sr-only">
          {location === null ? t.passages.chooseNoPage : t.passages.choose(location)}
        </span>
      </label>
      <p className="book-passage__words">
        <mark className="book-passage__mark">{passage.words}</mark>
      </p>
      {passage.yourWords === "" ? null : <p className="book-passage__mine">{passage.yourWords}</p>}
      {passage.page === null ? (
        <p className="book-passage__warn">
          <TriangleAlert className="book-passage__icon" aria-hidden="true" />
          {t.passages.noPage}
        </p>
      ) : null}
      {desked ? (
        <p className="book-passage__became book-passage__became--desk">
          {t.passages.onDesk(onDesk + 1)}
        </p>
      ) : used ? (
        <p className="book-passage__became">
          <Check className="book-passage__icon" aria-hidden="true" />
          {t.passages.inNotes(passage.usedBy.length)}{" "}
          {passage.usedBy.map((note, index) => (
            <span key={note}>
              {index === 0 ? null : ", "}
              <Link to="/graph" search={{ node: note }} className="book-passage__note">
                {note}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {onDesk === null ? (
        <div className="book-passage__actions">
          {asking ? (
            <>
              <span className="book-passage__ask">{t.passages.removeAsk}</span>
              <button
                type="button"
                className="button button--small"
                onClick={async () => {
                  const exit = await remove({
                    source,
                    payload: { id: passage.id },
                  });
                  setFailed(Exit.isFailure(exit));
                  setAsking(false);
                }}
              >
                {t.passages.remove}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => setAsking(false)}
              >
                {t.passages.keepIt}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => setEditing(true)}
              >
                {t.passages.edit}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={used}
                title={used ? t.passages.removeUsed : undefined}
                onClick={() => setAsking(true)}
              >
                {t.passages.remove}
              </button>
            </>
          )}
        </div>
      ) : null}
      {failed ? (
        <Notice tone="error">
          <p>{t.passages.failed}</p>
        </Notice>
      ) : null}
    </li>
  );
}

function PassageEdit({
  source,
  passage,
  onDone,
}: {
  readonly source: string;
  readonly passage: BookPassage;
  readonly onDone: () => void;
}) {
  const t = useT();
  const pageId = useId();
  const wordsId = useId();
  const mineId = useId();
  const [page, setPage] = useState(passage.page ?? "");
  const [words, setWords] = useState(passage.words);
  const [mine, setMine] = useState(passage.yourWords);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const update = useAtomSet(updatePassageAtom, { mode: "promiseExit" });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (words.trim() === "") return;
    setBusy(true);
    const exit = await update({
      source,
      payload: {
        id: passage.id,
        page: page.trim() === "" ? null : page.trim(),
        words: words.trim(),
        yourWords: mine.trim(),
      },
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) onDone();
    else setFailed(true);
  };

  return (
    <form className="passage-edit" onSubmit={save}>
      <label className="field__label" htmlFor={pageId}>
        {t.passages.capture.page}
      </label>
      <input
        id={pageId}
        className="input passage-edit__page"
        value={page}
        onChange={(event) => setPage(event.target.value)}
      />
      <label className="field__label" htmlFor={wordsId}>
        {t.passages.capture.words}
      </label>
      <textarea
        id={wordsId}
        className="textarea passage-edit__words"
        value={words}
        autoFocus
        onChange={(event) => setWords(event.target.value)}
        spellCheck={false}
      />
      <label className="field__label" htmlFor={mineId}>
        {t.passages.yourWords}
      </label>
      <input
        id={mineId}
        className="input"
        value={mine}
        onChange={(event) => setMine(event.target.value)}
        spellCheck
      />
      {passage.usedBy.length === 0 ? null : (
        <p className="field__hint">{t.passages.usedBy(passage.usedBy.length)}</p>
      )}
      {failed ? (
        <Notice tone="error">
          <p>{t.passages.failed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="submit"
          className="button button--primary"
          disabled={busy || words.trim() === ""}
        >
          {t.passages.save}
        </button>
        <button type="button" className="button button--quiet" onClick={onDone}>
          {t.passages.cancel}
        </button>
      </div>
    </form>
  );
}

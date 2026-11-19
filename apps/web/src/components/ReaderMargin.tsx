import { useAtomSet } from "@effect/atom-react";
import {
  type Article,
  type ArticlePassage,
  openQuestion,
  type Session,
  type Source,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import { Check, TriangleAlert, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { KEYS, removePassageAtom, saveFreeTextAtom, setPassageWordsAtom } from "../state/vault.ts";
import { addPassagePointAtom, SESSION_KEYS } from "../state/sessions.ts";
import { NeedsChatGpt } from "./Session.tsx";
import { Deeper } from "./Deeper.tsx";
import type { PassageState } from "./readerState.ts";
import { CallNumber, Notice, Panel } from "./ui.tsx";

export type SaveState = "idle" | "saving" | "saved" | "failed";

export function useAutosave(
  save: (text: string) => Promise<boolean>,
  initial: { readonly saved: string; readonly text: string },
  onLost: (text: string) => void = () => undefined,
) {
  const [text, setText] = useState(initial.text);
  const [state, setState] = useState<SaveState>("idle");
  const saved = useRef(initial.saved);
  const latest = useRef(initial.text);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveRef = useRef(save);
  const lostRef = useRef(onLost);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- refs, not state: the writer stays one function while the callbacks it calls are the newest.
  useEffect(() => {
    saveRef.current = save;
    lostRef.current = onLost;
  });
  const write = (value: string): Promise<boolean> => {
    queue.current = queue.current.then(async () => {
      if (value === saved.current) return true;
      setState("saving");
      const ok = await saveRef.current(value);
      if (ok) saved.current = value;
      if (latest.current === value) setState(ok ? "saved" : "failed");
      else if (ok && latest.current === saved.current) setState("saved");
      else if (ok) void write(latest.current);
      return ok;
    });
    return queue.current;
  };
  const change = (value: string) => {
    latest.current = value;
    setText(value);
    setState((now) => (now === "saving" ? now : "idle"));
  };
  const flush = () => {
    void write(latest.current);
  };
  const leave = () => {
    const value = latest.current;
    void write(value).then((ok) => {
      if (!ok) lostRef.current(value);
    });
  };
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- a timer, not state: the words are written to the file once typing pauses.
  useEffect(() => {
    if (text === saved.current) return;
    const timer = window.setTimeout(() => write(text), 900);
    return () => window.clearTimeout(timer);
  }, [text, write]);
  // oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- the file, not state: words typed just before the field closes are still written.
  useEffect(() => () => leave(), [leave]);
  return { text, change, flush, state };
}

export function SaveLine({
  state,
  onRetry,
}: {
  readonly state: SaveState;
  readonly onRetry: () => void;
}) {
  const t = useT();
  return (
    <p className="margin__save" role="status" data-state={state}>
      {state === "saving" ? t.reader.margin.saving : null}
      {state === "saved" ? (
        <>
          <Check className="margin__save-icon" aria-hidden="true" />
          {t.reader.margin.saved}
        </>
      ) : null}
      {state === "failed" ? (
        <>
          <TriangleAlert className="margin__save-icon" aria-hidden="true" />
          {t.reader.margin.saveFailed}{" "}
          <button type="button" className="link-button" onClick={onRetry}>
            {t.reader.margin.retry}
          </button>
        </>
      ) : null}
    </p>
  );
}

export function Notebook({
  source,
  passages,
  pendingNotes,
  onLost,
  onSaved,
}: {
  readonly source: Source;
  readonly passages: number;
  readonly pendingNotes: string | null;
  readonly onLost: (text: string) => void;
  readonly onSaved: () => void;
}) {
  const t = useT();
  const fieldId = useId();
  const hintId = useId();
  const saveFreeText = useAtomSet(saveFreeTextAtom, { mode: "promiseExit" });
  const save = async (freeText: string) => {
    const exit = await saveFreeText({
      payload: { id: source.id, freeText, finish: false },
      reactivityKeys: KEYS.sources,
    });
    if (Exit.isSuccess(exit)) onSaved();
    return Exit.isSuccess(exit);
  };
  const { text, change, flush, state } = useAutosave(
    save,
    { saved: source.freeText, text: pendingNotes ?? source.freeText },
    onLost,
  );
  return (
    <Panel title={t.reader.margin.notebook} initial="rubric">
      <div className="panel__body margin__body">
        <label className="sr-only" htmlFor={fieldId}>
          {t.reader.margin.notebook}
        </label>
        <p className="field__hint" id={hintId}>
          {t.reader.margin.notebookHint}
        </p>
        <textarea
          id={fieldId}
          className="textarea margin__textarea margin__textarea--tall"
          aria-describedby={hintId}
          placeholder={t.reader.margin.notebookPlaceholder}
          value={text}
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          spellCheck
        />
        <SaveLine state={state} onRetry={flush} />
      </div>
      <div className="panel__body margin__body">
        <p className="margin__passages">{t.reader.margin.passages(passages)}</p>
      </div>
    </Panel>
  );
}

export function PassageMargin({
  source,
  passage,
  probe,
  passageState,
  ownerOf,
  ready,
  canGoDeeper,
  pendingWords,
  onLost,
  onSaved,
  onClose,
  onDeeper,
  onChanged,
  onRemoved,
  onOpen,
  article,
}: {
  readonly source: Source;
  readonly passage: ArticlePassage;
  readonly probe: Session | null;
  readonly passageState: PassageState | undefined;
  readonly ownerOf: (question: number) => string | null;
  readonly ready: boolean;
  readonly canGoDeeper: boolean;
  readonly pendingWords: string | null;
  readonly onLost: (words: string) => void;
  readonly onSaved: () => void;
  readonly onClose: () => void;
  readonly onDeeper: () => void;
  readonly onChanged: (markdown: string) => void;
  readonly onRemoved: () => void;
  readonly onOpen: (id: string) => void;
  readonly article: Article;
}) {
  const t = useT();
  const wordsId = useId();
  const wordsHintId = useId();
  const setWords = useAtomSet(setPassageWordsAtom, { mode: "promiseExit" });
  const remove = useAtomSet(removePassageAtom, { mode: "promiseExit" });
  const [confirming, setConfirming] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const save = async (words: string) => {
    const exit = await setWords({
      payload: { id: source.id, passage: passage.id, words, text: passage.text, at: passage.at },
    });
    if (Exit.isSuccess(exit)) {
      onChanged(exit.value.markdown);
      onSaved();
    }
    return Exit.isSuccess(exit);
  };
  const { text, change, flush, state } = useAutosave(
    save,
    { saved: passage.words ?? "", text: pendingWords ?? passage.words ?? "" },
    onLost,
  );

  const asked = passageState?.asked ?? [];
  const understood = passageState?.understood === true;
  const point = passageState?.point ?? null;
  const working = probe?.working === true && passageState?.focused === true;
  const open = probe === null ? null : openQuestion(probe.entries);
  const openOwner = open === null ? null : ownerOf(open.number);
  const openElsewhere = openOwner !== null && openOwner !== passage.id;

  const doRemove = async () => {
    const exit = await remove({
      payload: { id: source.id, passage: passage.id, text: passage.text, at: passage.at },
    });
    if (Exit.isSuccess(exit)) {
      onChanged(exit.value.markdown);
      onRemoved();
    }
  };

  return (
    <section
      className="panel margin__passage"
      data-initial="accent"
      aria-labelledby={`${wordsId}-h`}
    >
      <div className="panel__head">
        <h2 className="panel__title" id={`${wordsId}-h`}>
          {t.reader.margin.passage(passage.n)}
        </h2>
        <button
          type="button"
          className="margin__close"
          aria-label={t.reader.margin.closeLabel}
          title={t.reader.margin.close}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="panel__body margin__body">
        <blockquote className="margin__quote">
          <p>{passage.text}</p>
          <footer>
            <CallNumber source={source} page={`¶ ${passage.n}`} />
          </footer>
        </blockquote>
      </div>
      <div className="panel__body margin__body">
        <label className="field__label" htmlFor={wordsId}>
          {t.reader.margin.yourWords}
        </label>
        <p className="field__hint" id={wordsHintId}>
          {t.reader.margin.yourWordsHint}
        </p>
        <textarea
          id={wordsId}
          className="textarea margin__textarea"
          aria-describedby={wordsHintId}
          placeholder={t.reader.margin.yourWordsPlaceholder}
          value={text}
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          spellCheck
        />
        <SaveLine state={state} onRetry={flush} />
      </div>
      <div className="panel__body margin__body">
        {point !== null ? (
          <p className="margin__point">
            <Check className="margin__point-icon" aria-hidden="true" />
            <span>
              <strong>{t.reader.margin.pointMade(point.title)}</strong>{" "}
              <span className="margin__point-where">{t.reader.margin.pointWhere}</span>
            </span>
          </p>
        ) : null}
        {claiming ? (
          <ClaimForm source={source} passage={passage} onDone={() => setClaiming(false)} />
        ) : confirming ? (
          <div className="margin__confirm" role="group" aria-label={t.reader.margin.removeConfirm}>
            <p className="margin__confirm-q">{t.reader.margin.removeConfirm}</p>
            <div className="button-row">
              <button type="button" className="button" onClick={() => void doRemove()}>
                {t.reader.margin.removeYes}
              </button>
              <button
                type="button"
                className="button button--quiet"
                autoFocus
                onClick={() => setConfirming(false)}
              >
                {t.reader.margin.keep}
              </button>
            </div>
          </div>
        ) : (
          <>
            {asked.length === 0 ? (
              <p className="field__hint">{t.reader.margin.goDeeperHint}</p>
            ) : null}
            {!ready && asked.length === 0 ? (
              <NeedsChatGpt title={t.probe.needsChatGpt} body={t.session.needsChatGptBody} />
            ) : null}
            {openElsewhere && open !== null && openOwner !== null ? (
              <p className="margin__elsewhere">
                {t.reader.margin.otherOpen(open.number)}{" "}
                <button type="button" className="link-button" onClick={() => onOpen(openOwner)}>
                  {t.reader.margin.openThat}
                </button>
              </p>
            ) : null}
            <div className="button-row margin__actions">
              {asked.length === 0 || understood ? (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!canGoDeeper}
                  aria-keyshortcuts="D"
                  onClick={onDeeper}
                >
                  {t.reader.margin.goDeeper}
                  <kbd className="key" aria-hidden="true">
                    {t.reader.deeperKey}
                  </kbd>
                </button>
              ) : null}
              {point === null ? (
                <button type="button" className="button" onClick={() => setClaiming(true)}>
                  {t.reader.margin.makePoint}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
      {probe !== null && (asked.length > 0 || working) ? (
        <Deeper
          probe={probe}
          asked={asked}
          working={working}
          understood={understood}
          onOpen={onOpen}
          article={article}
        />
      ) : null}
      {claiming || confirming ? null : (
        <div className="panel__body margin__body margin__foot">
          <button
            type="button"
            className="link-button margin__remove"
            onClick={() => setConfirming(true)}
          >
            {t.reader.margin.remove}
          </button>
        </div>
      )}
    </section>
  );
}

function ClaimForm({
  source,
  passage,
  onDone,
}: {
  readonly source: Source;
  readonly passage: ArticlePassage;
  readonly onDone: () => void;
}) {
  const t = useT();
  const fieldId = useId();
  const hintId = useId();
  const [title, setTitle] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const add = useAtomSet(addPassagePointAtom, { mode: "promiseExit" });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    setBusy(true);
    const exit = await add({
      payload: { source: source.id, passage: passage.id, title },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) onDone();
  };
  return (
    <form className="margin__claim" onSubmit={submit}>
      <label className="field__label" htmlFor={fieldId}>
        {t.reader.margin.claim}
      </label>
      <p className="field__hint" id={hintId}>
        {t.reader.margin.claimHint}
      </p>
      <input
        id={fieldId}
        className="input"
        aria-describedby={hintId}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
        autoComplete="off"
        spellCheck
      />
      {failed ? (
        <Notice tone="error">
          <p>{t.errors.storage}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="submit"
          className="button button--primary"
          disabled={busy || title.trim() === ""}
        >
          {t.reader.margin.savePoint}
        </button>
        <button type="button" className="button button--quiet" onClick={onDone}>
          {t.reader.margin.cancel}
        </button>
      </div>
    </form>
  );
}

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { linkKey, type Point, type PointPassage, type Session } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Check, Link2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import {
  dropPointAtom,
  noSessionAtom,
  sendMessageAtom,
  sessionAtom,
  writePointAtom,
} from "../state/sessions.ts";
import { KEYS } from "../state/vault.ts";
import { AiText } from "./NoteText.tsx";
import { pointsOf, SessionProblem, useChatGptReady } from "./Session.tsx";
import { Notice } from "./ui.tsx";

export interface PointIds {
  readonly session: string;
  readonly point: string;
}

type SaveProblem = { readonly kind: "taken"; readonly name: string } | { readonly kind: "failed" };

const paragraphCount = (text: string) =>
  text.split(/\n[ \t]*\n/).filter((paragraph) => paragraph.trim() !== "").length;

export function useDeskSession(ids: PointIds | null): {
  readonly session: Session | null;
  readonly point: Point | null;
} {
  const result = useAtomValue(ids === null ? noSessionAtom : sessionAtom(ids.session));
  const session = AsyncResult.getOrElse(result, () => null);
  const point =
    ids === null || session === null
      ? null
      : (pointsOf(session.entries).find((other) => other.id === ids.point) ?? null);
  return { session, point };
}

export function PassageNote({
  cites,
  ids,
  session,
  point,
  ensure,
  onSaved,
  onClose,
  closeLabel,
}: {
  readonly cites: ReadonlyArray<PointPassage>;
  readonly ids: PointIds | null;
  readonly session: Session | null;
  readonly point: Point | null;
  readonly ensure: (title: string) => Promise<PointIds | null>;
  readonly onSaved: (note: string) => void;
  readonly onClose?: () => void;
  readonly closeLabel?: string;
}) {
  const t = useT();
  const titleId = useId();
  const textId = useId();
  const pageId = useId();
  const ready = useChatGptReady();
  const [title, setTitle] = useState(point?.title ?? "");
  const [text, setText] = useState("");
  const [aiText, setAiText] = useState(false);
  const [page, setPage] = useState(
    cites.length === 1 ? (cites[0]?.page ?? "") : (point?.page ?? ""),
  );
  const [added, setAdded] = useState<ReadonlyArray<string>>([]);
  const [dropped, setDropped] = useState<ReadonlyArray<string>>([]);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState<"draft" | "links" | null>(null);
  const [needsTitle, setNeedsTitle] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const write = useAtomSet(writePointAtom, { mode: "promiseExit" });
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPointAtom, { mode: "promiseExit" });

  const working = session?.working === true;
  const draft = point?.draft ?? null;
  const links = (point?.links ?? []).filter(
    (link) => !dropped.some((name) => linkKey(name) === linkKey(link.note)),
  );
  const isAdded = (note: string) => added.some((name) => linkKey(name) === linkKey(note));
  const canSave = !busy && title.trim() !== "" && text.trim() !== "";

  const ask = async (what: "draft" | "links") => {
    if (title.trim() === "") {
      setNeedsTitle(true);
      return;
    }
    setNeedsTitle(false);
    setBusy(true);
    const made = await ensure(title.trim());
    setBusy(false);
    if (made === null) {
      setProblem({ kind: "failed" });
      return;
    }
    setAsked(what);
    void send({
      payload: {
        id: made.session,
        text: what === "draft" ? t.extraction.draftRequest : t.passages.desk.linksRequest,
        about: made.point,
      },
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    const made = await ensure(title.trim());
    if (made === null) {
      setBusy(false);
      setProblem({ kind: "failed" });
      return;
    }
    const exit = await write({
      payload: {
        id: made.session,
        point: made.point,
        title: title.trim(),
        text,
        aiText,
        page: page.trim() === "" ? null : page.trim(),
        links: added,
      },
      reactivityKeys: KEYS.sources,
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) {
      onSaved(exit.value);
      return;
    }
    const error = Cause.findErrorOption(exit.cause);
    setProblem(
      Option.isSome(error) && error.value._tag === "NoteNameTaken"
        ? { kind: "taken", name: error.value.fileName }
        : { kind: "failed" },
    );
  };

  const close = () => {
    if (onClose === undefined) return;
    if (!discarding && (text.trim() !== "" || (title.trim() !== "" && ids === null))) {
      setDiscarding(true);
      return;
    }
    if (ids !== null) void drop({ payload: { id: ids.session, point: ids.point } });
    onClose();
  };

  return (
    <form className="passage-note" onSubmit={save}>
      <ol className="passage-note__cites">
        {cites.map((cite, index) => (
          <li key={cite.id} className="passage-note__cite">
            <span className="passage-note__n">
              [{index + 1}] {cite.page === null ? null : t.passages.page(cite.page)}
            </span>
            <q>{cite.words}</q>
          </li>
        ))}
      </ol>
      <div className="passage-note__write">
        <div className="passage-note__own">
          <label className="sr-only" htmlFor={titleId}>
            {t.passages.desk.titleLabel}
          </label>
          {point?.aiTitle === true ? <AiText scope="title">{null}</AiText> : null}
          <input
            id={titleId}
            className="write__title passage-note__title"
            placeholder={t.passages.desk.titlePlaceholder}
            value={title}
            autoFocus={ids === null}
            onChange={(event) => {
              setTitle(event.target.value);
              setNeedsTitle(false);
            }}
            spellCheck
          />
          <label className="field__label" htmlFor={textId}>
            {t.passages.desk.text}
          </label>
          <AiText
            scope="paragraphs"
            count={paragraphCount(text)}
            marked={aiText}
            note={t.extraction.draftMarked}
            action={
              <button
                type="button"
                className="button button--quiet button--small"
                title={t.extraction.rewroteHint}
                onClick={() => setAiText(false)}
              >
                {t.extraction.rewrote}
              </button>
            }
          >
            <textarea
              id={textId}
              className="textarea write__text passage-note__text"
              placeholder={t.passages.desk.textPlaceholder}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (event.target.value.trim() === "") setAiText(false);
              }}
              spellCheck
            />
          </AiText>
          <div className="write__row">
            <label className="write__page" htmlFor={pageId}>
              {t.passages.desk.page}
              <input
                id={pageId}
                className="input"
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
            </label>
            <span className="write__words">{t.steps.words(wordCount(text))}</span>
          </div>
        </div>
        <aside className="passage-note__aside" aria-live="polite">
          {draft === null ? (
            <>
              <button
                type="button"
                className="button"
                disabled={!ready || working || busy}
                onClick={() => void ask("draft")}
              >
                {t.passages.desk.askDraft}
              </button>
              {working && asked === "draft" ? (
                <p className="passage-note__working">{t.passages.desk.drafting}</p>
              ) : null}
            </>
          ) : (
            <AiText scope="paragraphs" count={paragraphCount(draft)} note={t.passages.desk.draft}>
              <div className="passage-note__draft">
                {draft.split(/\n[ \t]*\n/).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <div className="button-row">
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => {
                      setText(draft);
                      setAiText(true);
                    }}
                  >
                    {t.passages.desk.takeIn}
                  </button>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    disabled={!ready || working || busy}
                    onClick={() => void ask("draft")}
                  >
                    {t.passages.desk.askDraft}
                  </button>
                </div>
              </div>
            </AiText>
          )}
          {needsTitle ? <p className="field__hint">{t.passages.desk.needsTitle}</p> : null}
          {ready ? null : <p className="field__hint">{t.passages.desk.needsChatGpt}</p>}
        </aside>
      </div>
      <div className="passage-note__links">
        <div className="button-row">
          <button
            type="button"
            className="button button--small"
            disabled={!ready || working || busy}
            onClick={() => void ask("links")}
          >
            <Link2 className="button__icon" aria-hidden="true" />
            {t.passages.desk.findLinks}
          </button>
          <span className="field__hint">
            {working && asked === "links" ? t.passages.desk.finding : t.passages.desk.linkHand}
          </span>
        </div>
        {links.length === 0 ? null : (
          <ul className="links">
            {links.map((link) => (
              <li key={link.note}>
                <span className="links__note">
                  <span className="wikilink">{link.note}</span>
                  <span className="links__why">{link.why}</span>
                </span>
                <span className="links__act">
                  {isAdded(link.note) ? (
                    <>
                      <span className="links__added">
                        <Check className="point__icon" aria-hidden="true" />
                        {t.extraction.linkAdded}
                      </span>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() =>
                          setAdded(added.filter((name) => linkKey(name) !== linkKey(link.note)))
                        }
                      >
                        {t.extraction.undo}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button button--small"
                        onClick={() => setAdded([...added, link.note])}
                      >
                        {t.extraction.addLink}
                      </button>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => setDropped([...dropped, link.note])}
                      >
                        {t.extraction.dropLink}
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {session === null ? null : <SessionProblem session={session} />}
      {problem === null ? null : (
        <Notice tone="error">
          <p>
            {problem.kind === "taken"
              ? t.extraction.nameTaken(problem.name)
              : t.extraction.saveFailed}
          </p>
        </Notice>
      )}
      <div className="passage-note__foot">
        {discarding ? (
          <>
            <span className="passage-note__ask">{t.passages.desk.discard}</span>
            <button type="button" className="button" onClick={close}>
              {t.passages.desk.discardYes}
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => setDiscarding(false)}
            >
              {t.passages.desk.discardNo}
            </button>
          </>
        ) : (
          <>
            <button type="submit" className="button button--primary" disabled={!canSave}>
              {busy ? t.passages.desk.saving : t.passages.desk.save}
            </button>
            {onClose === undefined ? null : (
              <button type="button" className="button button--quiet" onClick={close}>
                {closeLabel ?? t.passages.cancel}
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}

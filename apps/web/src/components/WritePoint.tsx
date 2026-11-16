import { useAtomSet } from "@effect/atom-react";
import { linkKey, type Point, type Session } from "@glose/contracts";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { Check, Link2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { KEYS } from "../state/graph.ts";
import { dropPointAtom, sendMessageAtom, writePointAtom } from "../state/sessions.ts";
import { AiText } from "./NoteText.tsx";
import { elementOf, NoteLink, PointSource } from "./PointRow.tsx";
import { pointNumber } from "./Session.tsx";
import { Notice } from "./ui.tsx";

type SaveProblem = { readonly kind: "taken"; readonly name: string } | { readonly kind: "failed" };

export function WritePoint({
  session,
  point,
  shown,
  about,
  onAbout,
}: {
  readonly session: Session;
  readonly point: Point;
  readonly shown: boolean;
  readonly about: boolean;
  readonly onAbout: () => void;
}) {
  const t = useT();
  const textId = useId();
  const pageId = useId();
  const [title, setTitle] = useState(point.title);
  const [text, setText] = useState(point.draft ?? "");
  const [aiText, setAiText] = useState(point.draft !== null);
  const [draftShown, setDraftShown] = useState(point.draft);
  if (point.draft !== draftShown) {
    setDraftShown(point.draft);
    if (point.draft !== null) {
      setText(point.draft);
      setAiText(true);
    }
  }
  const [page, setPage] = useState("");
  const [added, setAdded] = useState<ReadonlyArray<string>>([]);
  const [dropped, setDropped] = useState<ReadonlyArray<string>>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const write = useAtomSet(writePointAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPointAtom, { mode: "promiseExit" });
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });

  const canSave = !busy && title.trim() !== "" && text.trim() !== "";
  const isAdded = (note: string) => added.some((name) => linkKey(name) === linkKey(note));
  const links = point.links.filter(
    (link) => !dropped.some((name) => linkKey(name) === linkKey(link.note)),
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    const exit = await write({
      payload: {
        id: session.id,
        point: point.id,
        title,
        text,
        aiText,
        page: page.trim() === "" ? null : page.trim(),
        links: added,
      },
      reactivityKeys: KEYS.sources,
    });
    setBusy(false);
    if (Exit.isSuccess(exit)) return;
    const error = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none();
    setProblem(
      Option.isSome(error) && error.value._tag === "NoteNameTaken"
        ? { kind: "taken", name: error.value.fileName }
        : { kind: "failed" },
    );
  };

  const textarea = (
    <textarea
      className="textarea write__text"
      id={textId}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        if (event.target.value.trim() === "") setAiText(false);
      }}
      onFocus={onAbout}
      spellCheck
    />
  );

  const titleInput = (
    <input
      className="write__title"
      aria-label={t.extraction.titleLabel}
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      spellCheck
    />
  );

  return (
    <form className="write" id={shown ? elementOf(point.id) : undefined} onSubmit={save}>
      <span className="point__num" data-about={about ? true : undefined}>
        {pointNumber(point)}
      </span>
      <div className="write__body">
        {point.origin === "user" ? titleInput : <AiText scope="title">{titleInput}</AiText>}
        <PointSource point={point} />
        <label className="sr-only" htmlFor={textId}>
          {aiText ? t.extraction.draftLabel : t.extraction.textLabel}
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
          {textarea}
        </AiText>
        <div className="write__row">
          <label className="write__page" htmlFor={pageId}>
            {t.extraction.page}
            <input
              id={pageId}
              className="input"
              value={page}
              onChange={(event) => setPage(event.target.value)}
            />
            <span className="field__optional">({t.common.optional})</span>
          </label>
          <span className="write__words">{t.steps.words(wordCount(text))}</span>
        </div>
        {links.length === 0 ? null : (
          <div className="links">
            <p className="links__head">
              <Link2 className="point__icon" aria-hidden="true" />
              {t.extraction.linksHead}
            </p>
            <ul>
              {links.map((link) => (
                <li key={link.note}>
                  <span className="links__note">
                    <NoteLink name={link.note} />
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
          </div>
        )}
        {problem === null ? null : (
          <Notice tone="error">
            <p>
              {problem.kind === "taken"
                ? t.extraction.nameTaken(problem.name)
                : t.extraction.saveFailed}
            </p>
          </Notice>
        )}
        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={!canSave}>
            {t.extraction.save}
          </button>
          <button
            type="button"
            className="button"
            disabled={session.working}
            onClick={() => {
              onAbout();
              void send({
                payload: { id: session.id, text: t.extraction.draftRequest, about: point.id },
              });
            }}
          >
            {t.extraction.askDraft}
          </button>
          <button
            type="button"
            className="button button--quiet write__drop"
            onClick={() => void drop({ payload: { id: session.id, point: point.id } })}
          >
            {t.extraction.drop}
          </button>
        </div>
      </div>
    </form>
  );
}

const paragraphCount = (text: string) =>
  text.split(/\n[ \t]*\n/).filter((paragraph) => paragraph.trim() !== "").length;

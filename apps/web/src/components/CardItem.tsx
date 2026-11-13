import { useAtomSet } from "@effect/atom-react";
import type { ScoredCard } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import * as Exit from "effect/Exit";
import { type ReactNode, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS, clearAiMarkAtom, deleteCardAtom, updateCardAtom } from "../state/cards.ts";
import { CardChecks } from "./CardChecks.tsx";
import { CardFields } from "./CardFields.tsx";
import { AiText } from "./NoteText.tsx";
import { Notice } from "./ui.tsx";

type Mode = "read" | "edit" | "delete";

/** A saved Card: read it, edit it, clear its AI mark once rewritten, or delete it. */
export function CardItem({
  card,
  showFrom = true,
  close,
}: {
  readonly card: ScoredCard;
  /** The Note it comes from; a page about that Note leaves it out. */
  readonly showFrom?: boolean;
  /** The way out of the sheet the Card is open in, at the end of its buttons. */
  readonly close?: ReactNode;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("read");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const update = useAtomSet(updateCardAtom, { mode: "promiseExit" });
  const clearAiMark = useAtomSet(clearAiMarkAtom, { mode: "promiseExit" });
  const remove = useAtomSet(deleteCardAtom, { mode: "promiseExit" });

  const run = async (action: () => Promise<Exit.Exit<unknown, unknown>>) => {
    setBusy(true);
    const exit = await action();
    setBusy(false);
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) setMode("read");
  };

  const words: ReactNode = (
    <>
      <p>
        <strong>{card.question}</strong>
      </p>
      {card.answer === "" ? null : <p>{card.answer}</p>}
    </>
  );

  return (
    <article className="card" data-ai={card.ai}>
      {mode === "edit" ? (
        <CardFields
          initial={card}
          submitLabel={t.cards.save}
          busy={busy}
          onSubmit={(text) =>
            run(() =>
              update({ payload: { file: card.file, ...text }, reactivityKeys: CARD_KEYS.cards }),
            )
          }
          onCancel={() => setMode("read")}
        />
      ) : card.ai ? (
        <AiText scope="card">{words}</AiText>
      ) : (
        words
      )}
      {mode === "edit" ? null : <CardChecks score={card.score} />}
      {showFrom ? (
        <p className="field__hint">
          {card.from === null ? (
            t.cards.fromNone
          ) : (
            <>
              {t.cards.from}{" "}
              <Link to="/notes/$noteId/cards" params={{ noteId: card.from }}>
                {card.from}
              </Link>
            </>
          )}
        </p>
      ) : null}
      {mode === "read" ? (
        <div className="button-row" style={{ marginTop: 8 }}>
          <button type="button" className="button" onClick={() => setMode("edit")}>
            {t.cards.edit}
          </button>
          {card.ai ? (
            <button
              type="button"
              className="button"
              title={t.cards.rewroteHint}
              disabled={busy}
              onClick={() =>
                run(() =>
                  clearAiMark({ payload: { file: card.file }, reactivityKeys: CARD_KEYS.cards }),
                )
              }
            >
              {t.cards.rewrote}
            </button>
          ) : null}
          <button type="button" className="button" onClick={() => setMode("delete")}>
            {t.cards.delete}
          </button>
          {close}
        </div>
      ) : null}
      {mode === "delete" ? (
        <div role="alertdialog" aria-label={t.cards.deleteConfirm}>
          <p>{t.cards.deleteConfirm}</p>
          <div className="button-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() =>
                run(() => remove({ payload: { file: card.file }, reactivityKeys: CARD_KEYS.cards }))
              }
            >
              {t.cards.delete}
            </button>
            <button type="button" className="button" onClick={() => setMode("read")}>
              {t.cards.cancel}
            </button>
          </div>
        </div>
      ) : null}
      {failed ? (
        <Notice tone="error">
          <p>{t.cards.saveFailed}</p>
        </Notice>
      ) : null}
    </article>
  );
}

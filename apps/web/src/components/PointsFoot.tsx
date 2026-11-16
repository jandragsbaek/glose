import { useAtomSet } from "@effect/atom-react";
import type { Point, Session } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { Plus } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { addPointAtom, restorePointAtom, sendMessageAtom } from "../state/sessions.ts";
import { PointRow } from "./PointRow.tsx";
import { Notice } from "./ui.tsx";

export function PointsFoot({
  session,
  dropped,
}: {
  readonly session: Session;
  readonly dropped: ReadonlyArray<Point>;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [showDropped, setShowDropped] = useState(false);
  const [failed, setFailed] = useState(false);
  const add = useAtomSet(addPointAtom, { mode: "promiseExit" });
  const restore = useAtomSet(restorePointAtom, { mode: "promiseExit" });
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    const exit = await add({ payload: { id: session.id, title } });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) {
      setTitle("");
      setAdding(false);
    }
  };

  return (
    <>
      {showDropped && dropped.length > 0 ? (
        <div className="points__group">
          <p className="points__head">{t.extraction.dropped}</p>
          <ol className="point-rows point-rows--dropped">
            {dropped.map((point) => (
              <PointRow key={point.id} point={point} about={false}>
                <button
                  type="button"
                  className="button button--quiet button--small"
                  onClick={() => void restore({ payload: { id: session.id, point: point.id } })}
                >
                  {t.extraction.bringBack}
                </button>
              </PointRow>
            ))}
          </ol>
        </div>
      ) : null}
      {adding ? (
        <form className="points__group points__add" onSubmit={submit}>
          <label className="field__label" htmlFor={inputId}>
            {t.extraction.addOwnLabel}
          </label>
          <p className="field__hint" id={hintId}>
            {t.extraction.addOwnHint}
          </p>
          <input
            id={inputId}
            className="input"
            aria-describedby={hintId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            spellCheck
          />
          {failed ? (
            <Notice tone="error">
              <p>{t.extraction.actionFailed}</p>
            </Notice>
          ) : null}
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={title.trim() === ""}>
              {t.extraction.add}
            </button>
            <button type="button" className="button button--quiet" onClick={() => setAdding(false)}>
              {t.extraction.cancel}
            </button>
          </div>
        </form>
      ) : null}
      <div className="points__foot">
        {adding ? null : (
          <button type="button" className="button" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            {t.extraction.addOwn}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={session.working}
          onClick={() =>
            void send({ payload: { id: session.id, text: t.extraction.proposeMoreRequest } })
          }
        >
          {t.extraction.proposeMore}
        </button>
        {dropped.length === 0 ? null : (
          <button
            type="button"
            className="button button--quiet points__dropped"
            aria-expanded={showDropped}
            onClick={() => setShowDropped(!showDropped)}
          >
            {showDropped ? t.extraction.hideDropped : t.extraction.showDropped(dropped.length)}
          </button>
        )}
      </div>
    </>
  );
}

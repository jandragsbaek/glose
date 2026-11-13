import { useAtomSet } from "@effect/atom-react";
import { type ReadingStart as Start, readingStepsOf, type Source } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { chooseStartAtom, KEYS } from "../state/graph.ts";
import { Notice, Panel } from "./ui.tsx";

const STARTS = ["write", "probe", "catch-up"] as const satisfies ReadonlyArray<Start>;

/** "Where are you with this book?": the first page of a Source, whose answer sets the first step. */
export function ReadingStart({ source }: { readonly source: Source }) {
  const t = useT();
  const hintId = useId();
  const followsId = useId();
  const [start, setStart] = useState<Start | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const chooseStart = useAtomSet(chooseStartAtom, { mode: "promiseExit" });

  const begin = async () => {
    if (start === null) return;
    setState("saving");
    const exit = await chooseStart({
      payload: { id: source.id, start },
      reactivityKeys: KEYS.sources,
    });
    // On success the Source reads afresh and its page moves on to the first step.
    setState(Exit.isSuccess(exit) ? "idle" : "failed");
  };

  return (
    <Panel title={t.start.title} initial="rubric">
      <div className="panel__body">
        <fieldset className="start-choices" aria-describedby={hintId}>
          <legend className="sr-only">{t.start.title}</legend>
          <p className="field__hint start-choices__hint" id={hintId}>
            {t.start.hint}
          </p>
          {STARTS.map((option) => (
            <label key={option} className="choice start-choice">
              <input
                type="radio"
                name={`reading-start-${source.id}`}
                value={option}
                checked={start === option}
                onChange={() => setStart(option)}
              />
              <span className="start-choice__text">
                <span className="start-choice__label">{t.start.choices[option]}</span>
                <span className="start-choice__hint">{t.start.choiceHints[option]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="panel__body">
        <h3 className="start-follows__title" id={followsId}>
          {t.start.follows}
        </h3>
        {start === null ? (
          <p className="field__hint">{t.start.chooseFirst}</p>
        ) : (
          <ol
            className="steps start-route"
            data-count={readingStepsOf(start).length}
            aria-labelledby={followsId}
          >
            {readingStepsOf(start).map((step, index) => (
              <li key={step} className="step" data-state={index === 0 ? "first" : "next"}>
                <span className="step__name">
                  <span className="step__num">{index + 1}</span>
                  {t.steps.names[step]}
                </span>
                <span className="step__note">{t.start.stepNotes[step]}</span>
              </li>
            ))}
          </ol>
        )}
        {state === "failed" ? (
          <div style={{ marginTop: 16 }}>
            <Notice tone="error" title={t.errors.storage}>
              <p>{t.errors.storageRecovery}</p>
            </Notice>
          </div>
        ) : null}
        <div className="button-row start-follows__actions">
          <button
            type="button"
            className="button button--primary"
            disabled={start === null || state === "saving"}
            onClick={begin}
          >
            {state === "saving"
              ? t.start.starting
              : start === null || start === "write"
                ? t.start.startWriting
                : t.start.startProbe}
          </button>
        </div>
      </div>
    </Panel>
  );
}

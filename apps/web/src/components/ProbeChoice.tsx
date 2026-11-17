import { type Confidence, type SessionEntry } from "@glose/contracts";
import { Check, TriangleAlert } from "lucide-react";
import { useId } from "react";

import { useT } from "../i18n/I18n.tsx";

type Entry<T extends SessionEntry["_tag"]> = Extract<SessionEntry, { _tag: T }>;

const LETTERS = "ABCDEFGH";
export const optionLetter = (index: number) => LETTERS[index] ?? String(index + 1);

const CONFIDENCES: ReadonlyArray<Confidence> = ["sure", "unsure", "guess"];

export interface PickedOptions {
  readonly choice: ReadonlyArray<number>;
  readonly setChoice: (question: number, choice: ReadonlyArray<number>) => void;
}

export function ChoiceOptions({
  question,
  answer,
  draft,
  disabled,
}: {
  readonly question: Entry<"ProbeQuestion">;
  readonly answer: Entry<"ProbeAnswer"> | undefined;
  readonly draft: PickedOptions | null;
  readonly disabled: boolean;
}) {
  const t = useT();
  const choice = question.choice;
  if (choice === undefined) return null;
  const many = choice.select === "many";
  const select = many ? t.probe.chooseMany : t.probe.chooseOne;

  if (answer === undefined && draft !== null) {
    const picked = new Set(draft.choice);
    const toggle = (index: number) => {
      if (!many) return draft.setChoice(question.number, [index]);
      const next = new Set(picked);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      draft.setChoice(
        question.number,
        [...next].toSorted((a, b) => a - b),
      );
    };
    return (
      <fieldset className="probe__options" disabled={disabled}>
        <legend className="probe__select">
          <span className="sr-only">{t.probe.optionsLabel(question.number)} · </span>
          {select}
        </legend>
        <ol className="probe__option-list">
          {choice.options.map((text, index) => (
            <li key={text}>
              <label className="probe__option" data-picked={picked.has(index) || undefined}>
                <input
                  type={many ? "checkbox" : "radio"}
                  name={`probe-q${question.number}`}
                  checked={picked.has(index)}
                  onChange={() => toggle(index)}
                />
                <span className="probe__letter" aria-hidden="true">
                  {optionLetter(index)}
                </span>
                <span className="sr-only">{t.probe.option(optionLetter(index))}: </span>
                <span className="probe__option-text">{text}</span>
              </label>
            </li>
          ))}
        </ol>
      </fieldset>
    );
  }

  const chosen = new Set(answer?.choice ?? []);
  const right = new Set(choice.right ?? []);
  return (
    <div className="probe__options">
      <p className="probe__select">{select}</p>
      <ol className="probe__option-list" aria-label={t.probe.optionsLabel(question.number)}>
        {choice.options.map((text, index) => {
          const isRight = right.has(index);
          const isChosen = chosen.has(index);
          const tests = choice.tests?.[index] ?? null;
          const mark = isChosen
            ? isRight
              ? t.probe.choiceMark.chosenRight
              : t.probe.choiceMark.chosenWrong
            : isRight
              ? t.probe.choiceMark.right
              : null;
          return (
            <li
              key={text}
              className="probe__option probe__option--shown"
              data-picked={isChosen || undefined}
              data-tone={mark === null ? undefined : isRight ? "good" : "gap"}
            >
              <span className="probe__letter" aria-hidden="true">
                {optionLetter(index)}
              </span>
              <span className="sr-only">{t.probe.option(optionLetter(index))}: </span>
              <span className="probe__option-text">
                {text}
                {isChosen && !isRight && tests !== null ? (
                  <span className="probe__tests">{t.probe.tests(tests)}</span>
                ) : null}
              </span>
              {mark === null ? null : (
                <span className="probe__mark">
                  {isRight ? (
                    <Check className="probe__mark-icon" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="probe__mark-icon" aria-hidden="true" />
                  )}
                  {mark}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SureChoice({
  value,
  onChange,
  disabled,
}: {
  readonly value: Confidence | null;
  readonly onChange: (value: Confidence | null) => void;
  readonly disabled: boolean;
}) {
  const t = useT();
  const name = useId();
  return (
    <fieldset className="probe__sure" disabled={disabled}>
      <legend className="probe__sure-label">
        {t.probe.sure} <span className="probe__for">({t.common.optional})</span>
      </legend>
      <div className="probe__sure-options">
        {CONFIDENCES.map((confidence) => (
          <label key={confidence} className="probe__sure-option">
            <input
              type="radio"
              name={name}
              checked={value === confidence}
              onChange={() => onChange(confidence)}
              onClick={() => {
                if (value === confidence) onChange(null);
              }}
            />
            {t.probe.confidence[confidence]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

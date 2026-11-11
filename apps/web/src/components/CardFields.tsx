import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";

interface CardWords {
  readonly question: string;
  readonly answer: string;
}

/** A Card's question and answer as a form: to keep a proposed Card, edit one, or write one. */
export function CardFields({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  readonly initial: CardWords;
  readonly submitLabel: string;
  readonly busy: boolean;
  /** Resolves true when the Card was saved; a new Card's form then empties. */
  readonly onSubmit: (words: CardWords) => Promise<boolean | void>;
  readonly onCancel?: () => void;
}) {
  const t = useT();
  const questionId = useId();
  const answerId = useId();
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const canSubmit = !busy && question.trim() !== "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const saved = await onSubmit({ question: question.trim(), answer: answer.trim() });
    if (saved === true) {
      setQuestion(initial.question);
      setAnswer(initial.answer);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label className="field__label" htmlFor={questionId}>
          {t.cards.question}
        </label>
        <textarea
          className="textarea textarea--short"
          id={questionId}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          spellCheck
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={answerId}>
          {t.cards.answer}
        </label>
        <textarea
          className="textarea textarea--short"
          id={answerId}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          spellCheck
        />
      </div>
      <div className="button-row">
        <button type="submit" className="button button--primary" disabled={!canSubmit}>
          {submitLabel}
        </button>
        {onCancel === undefined ? null : (
          <button type="button" className="button" onClick={onCancel}>
            {t.cards.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

import type { Source } from "@glose/contracts";
import { Check } from "lucide-react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";

const STEPS = ["free-text", "extraction", "probe"] as const;

/** The three steps of the Reading Stage, with the current one marked for sight and for screen readers. */
export function StepBar({ source }: { readonly source: Source }) {
  const t = useT();
  const current = STEPS.indexOf(source.readingStep as (typeof STEPS)[number]);
  const position = current === -1 ? STEPS.length : current;
  const words = wordCount(source.freeText);

  const note = (step: (typeof STEPS)[number], index: number) => {
    if (step === "free-text" && index < position) {
      return words === 0 ? t.steps.noFreeText : t.steps.words(words);
    }
    if (step === "free-text") return t.steps.words(words);
    return t.steps.waitsForChatGpt;
  };

  return (
    <ol className="steps" aria-label={t.steps.label}>
      {STEPS.map((step, index) => {
        const done = index < position;
        return (
          <li
            key={step}
            className="step"
            data-state={done ? "done" : index === position ? "current" : "next"}
            aria-current={index === position ? "step" : undefined}
          >
            <span className="step__name">
              {done ? <Check className="step__icon" aria-hidden="true" /> : null}
              <span className="step__num">{index + 1}</span>
              {t.steps.names[step]}
              {done ? <span className="sr-only">{t.steps.done}</span> : null}
            </span>
            <span className="step__note">{note(step, index)}</span>
          </li>
        );
      })}
    </ol>
  );
}

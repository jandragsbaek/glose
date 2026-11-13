import { readingStepsOf, type Source, type WorkStep } from "@glose/contracts";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { wordCount } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";

/**
 * The steps of the Reading Stage in the order the Source's start gives them, with the current
 * one marked for sight and for screen readers.
 */
export function StepBar({
  source,
  extractionNote,
  probeNote,
  freeTextAction,
}: {
  readonly source: Source;
  /** What Extraction has made so far, in place of the general note. */
  readonly extractionNote?: string;
  /** What the Probe has asked so far, in place of the general note. */
  readonly probeNote?: string;
  /** A way back to the Free text, beside its note. */
  readonly freeTextAction?: ReactNode;
}) {
  const t = useT();
  const steps = readingStepsOf(source.readingStart);
  const current = source.readingStep === "done" ? -1 : steps.indexOf(source.readingStep);
  const position = current === -1 ? steps.length : current;
  const words = wordCount(source.freeText);

  const note = (step: WorkStep, index: number) => {
    if (step === "free-text" && index < position) {
      return words === 0 ? t.steps.noFreeText : t.steps.words(words);
    }
    if (step === "free-text") return t.steps.words(words);
    const given = step === "extraction" ? extractionNote : probeNote;
    if (given !== undefined) return given;
    return t.steps.withChatGpt;
  };

  return (
    <ol className="steps" aria-label={t.steps.label} data-steps={steps.length}>
      {steps.map((step, index) => {
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
            <span className="step__note">
              {note(step, index)}
              {step === "free-text" && freeTextAction !== undefined ? (
                <>
                  {" · "}
                  {freeTextAction}
                </>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { readingStepsOf, type Source, type SourceKind, type WorkStep } from "@glose/contracts";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { wordCount } from "../domain/source.ts";
import { cuesOf, notesWordCount, videoIdOf } from "../domain/video.ts";
import type { Messages } from "../i18n/en.ts";
import { useT } from "../i18n/I18n.tsx";

export const stepName = (t: Messages, step: WorkStep, kind: SourceKind): string =>
  kind === "video" && step === "free-text" ? t.watch.step : t.steps.names[step];

export function StepBar({
  source,
  extractionNote,
  probeNote,
  readNote,
  passagesNote,
  freeTextAction,
}: {
  readonly source: Source;
  readonly extractionNote?: string;
  readonly probeNote?: string;
  readonly readNote?: string;
  readonly passagesNote?: string;
  readonly freeTextAction?: ReactNode;
}) {
  const t = useT();
  const steps = readingStepsOf(source.readingStart, source.kind);
  const current = source.readingStep === "done" ? -1 : steps.indexOf(source.readingStep);
  const position = current === -1 ? steps.length : current;
  const video = source.kind === "video";
  const videoId = video ? videoIdOf(source.url) : null;
  const words = video ? notesWordCount(source.freeText, videoId) : wordCount(source.freeText);

  const note = (step: WorkStep, index: number) => {
    if (step === "free-text" && video) {
      return t.watch.stepNote(cuesOf(source.freeText, videoId).length, words);
    }
    if (step === "free-text" && index < position) {
      return words === 0 ? t.steps.noFreeText : t.steps.words(words);
    }
    if (step === "free-text") return t.steps.words(words);
    if (step === "read") return readNote ?? t.start.stepNotes.read;
    if (step === "passages") return passagesNote ?? t.start.stepNotes.passages;
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
              {stepName(t, step, source.kind)}
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

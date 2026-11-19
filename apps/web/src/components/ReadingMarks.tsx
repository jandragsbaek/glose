import {
  type ReadingStart,
  type ReadingStep,
  readingStepsOf,
  type SourceKind,
} from "@glose/contracts";

import { useT } from "../i18n/I18n.tsx";

export function ReadingMarks({
  step,
  start,
  kind,
  labelled,
}: {
  readonly step: ReadingStep;
  readonly start: ReadingStart | null;
  readonly kind: SourceKind;
  readonly labelled: boolean;
}) {
  const t = useT();
  const steps = readingStepsOf(start, kind);
  const at = step === "done" ? steps.length : steps.indexOf(step);
  const label = kind === "video" && step === "free-text" ? t.watch.inStep : t.sources.steps[step];
  return (
    <span
      className="marks"
      {...(labelled ? { role: "img", "aria-label": label, title: label } : { "aria-hidden": true })}
    >
      {steps.map((step, index) => (
        <span
          key={step}
          className="marks__dot"
          data-state={index < at ? "done" : index === at ? "current" : "later"}
        />
      ))}
    </span>
  );
}

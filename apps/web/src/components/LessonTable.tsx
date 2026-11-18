import { Check, CircleAlert } from "lucide-react";
import { useId } from "react";

import { useT } from "../i18n/I18n.tsx";
import { PART } from "./textImport.tsx";

type LessonState = "new" | "taken" | "named" | "added" | "failed";

export interface Lesson {
  readonly key: string;
  readonly name: string;
  readonly path: string;
  readonly markdown: string;
  readonly part: string;
  readonly title: string;
  readonly words: number;
  readonly state: LessonState;
  readonly id: string | null;
  readonly takenAs: string | null;
  readonly order: number;
  readonly partByName: boolean;
}

export function LessonTable({
  lessons,
  taken,
  clashes,
  problemId,
  busy,
  held,
  onChange,
}: {
  readonly lessons: ReadonlyArray<Lesson>;
  readonly taken: (part: string) => boolean;
  readonly clashes: ReadonlySet<string>;
  readonly problemId: string;
  readonly busy: boolean;
  readonly held: (lesson: Lesson) => boolean;
  readonly onChange: (name: string, patch: Partial<Lesson>) => void;
}) {
  const t = useT();
  const baseId = useId();
  const twice = new Set(
    lessons
      .map((lesson) => lesson.name)
      .filter((name, index, names) => names.indexOf(name) !== index),
  );
  return (
    <div className="add-lessons__table-wrap">
      <table className="add-lessons__table">
        <thead>
          <tr>
            <th scope="col">{t.lessons.columns.part}</th>
            <th scope="col">{t.lessons.columns.title}</th>
            <th scope="col" className="num">
              {t.lessons.columns.words}
            </th>
            <th scope="col">{t.lessons.columns.state}</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson, index) => {
            const settled: LessonState =
              lesson.state === "named" && !held(lesson) ? "new" : lesson.state;
            const state: LessonState = settled === "new" && taken(lesson.part) ? "taken" : settled;
            const wrong = !PART.test(lesson.part) || clashes.has(lesson.part);
            return (
              <tr
                key={lesson.key}
                data-state={state}
                data-clash={clashes.has(lesson.part) ? "" : undefined}
              >
                <td>
                  <input
                    className="input add-lessons__part"
                    value={lesson.part}
                    aria-label={t.lessons.partLabel(
                      twice.has(lesson.name) ? lesson.path : lesson.name,
                    )}
                    aria-invalid={wrong ? true : undefined}
                    aria-describedby={wrong ? problemId : undefined}
                    inputMode="decimal"
                    disabled={state === "added" || busy}
                    onChange={(event) =>
                      onChange(lesson.key, { part: event.target.value, partByName: true })
                    }
                  />
                </td>
                <td>
                  <input
                    className="input add-lessons__title"
                    value={lesson.title}
                    aria-label={t.lessons.titleLabel(
                      twice.has(lesson.name) ? lesson.path : lesson.name,
                    )}
                    aria-invalid={state === "named" ? true : undefined}
                    data-held={state === "named" ? "" : undefined}
                    aria-describedby={state === "named" ? `${baseId}-${index}-state` : undefined}
                    disabled={state === "added" || busy}
                    onChange={(event) => onChange(lesson.key, { title: event.target.value })}
                  />
                  <span className="add-lessons__file">
                    {twice.has(lesson.name) ? lesson.path : lesson.name}
                  </span>
                </td>
                <td className="num">{lesson.words}</td>
                <td className="add-lessons__state" id={`${baseId}-${index}-state`}>
                  {state === "new" ? null : <LessonStateMark state={state} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LessonStateMark({ state }: { readonly state: Exclude<LessonState, "new"> }) {
  const t = useT();
  const Icon = state === "added" ? Check : CircleAlert;
  return (
    <span className="lesson-state" data-state={state}>
      <Icon className="lesson-state__icon" aria-hidden="true" />
      {t.lessons.states[state]}
    </span>
  );
}

export const wholeAtLeastOne = (value: string) =>
  value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 1;

export function PerWeek({
  value,
  locked,
  onChange,
}: {
  readonly value: string;
  readonly locked: boolean;
  readonly onChange: (value: string) => void;
}) {
  const t = useT();
  const id = useId();
  const valid = wholeAtLeastOne(value);
  return (
    <div className="panel__body add-lessons__per-week">
      <label className="field__label" htmlFor={id}>
        {t.lessons.perWeek}
      </label>
      <input
        id={id}
        className="input add-lessons__per-week-input"
        value={value}
        inputMode="numeric"
        disabled={locked}
        aria-invalid={valid ? undefined : true}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className={valid ? "field__hint" : "field__error"} id={`${id}-hint`}>
        {valid ? null : <CircleAlert className="field__error-icon" aria-hidden="true" />}
        {valid ? t.lessons.perWeekHint : t.lessons.perWeekInvalid}
      </p>
    </div>
  );
}

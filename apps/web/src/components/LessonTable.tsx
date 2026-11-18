import { Check, CircleAlert } from "lucide-react";

import { useT } from "../i18n/I18n.tsx";
import { PART } from "./textImport.tsx";

type LessonState = "new" | "taken" | "added" | "failed";

export interface Lesson {
  readonly name: string;
  readonly markdown: string;
  readonly part: string;
  readonly title: string;
  readonly words: number;
  readonly state: LessonState;
  readonly id: string | null;
  readonly order: number;
  readonly partByName: boolean;
}

export function LessonTable({
  lessons,
  taken,
  clashes,
  problemId,
  busy,
  onChange,
}: {
  readonly lessons: ReadonlyArray<Lesson>;
  readonly taken: (part: string) => boolean;
  readonly clashes: ReadonlySet<string>;
  readonly problemId: string;
  readonly busy: boolean;
  readonly onChange: (name: string, patch: Partial<Lesson>) => void;
}) {
  const t = useT();
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
          {lessons.map((lesson) => {
            const state: LessonState =
              lesson.state === "new" && taken(lesson.part) ? "taken" : lesson.state;
            const wrong = !PART.test(lesson.part) || clashes.has(lesson.part);
            return (
              <tr
                key={lesson.name}
                data-state={state}
                data-clash={clashes.has(lesson.part) ? "" : undefined}
              >
                <td>
                  <input
                    className="input add-lessons__part"
                    value={lesson.part}
                    aria-label={t.lessons.partLabel(lesson.name)}
                    aria-invalid={wrong ? true : undefined}
                    aria-describedby={wrong ? problemId : undefined}
                    inputMode="decimal"
                    disabled={state === "added" || busy}
                    onChange={(event) =>
                      onChange(lesson.name, { part: event.target.value, partByName: true })
                    }
                  />
                </td>
                <td>
                  <input
                    className="input add-lessons__title"
                    value={lesson.title}
                    aria-label={t.lessons.titleLabel(lesson.name)}
                    disabled={state === "added" || busy}
                    onChange={(event) => onChange(lesson.name, { title: event.target.value })}
                  />
                  <span className="add-lessons__file">{lesson.name}</span>
                </td>
                <td className="num">{lesson.words}</td>
                <td className="add-lessons__state">
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

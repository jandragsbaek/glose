import type { Messages } from "../i18n/en.ts";
import { useT } from "../i18n/I18n.tsx";
import { TextField } from "./textImport.tsx";

export type CourseField = "name" | "family" | "given" | "year" | "url";
export type Course = Record<CourseField, string>;
export type FromFiles = "name" | "family" | "given" | "year";
export type Say = (t: Messages) => string;
export type Origin = "file" | "folder" | "guess";

export function CourseFields({
  course,
  origins,
  errors,
  locked,
  onChange,
}: {
  readonly course: Course;
  readonly origins: Partial<Record<FromFiles, Origin>>;
  readonly errors: Partial<Record<CourseField, Say>>;
  readonly locked: boolean;
  readonly onChange: (key: CourseField) => (value: string) => void;
}) {
  const t = useT();
  const filledFrom = (key: FromFiles) =>
    origins[key] === "file"
      ? t.importText.fromFile
      : origins[key] === "folder"
        ? t.lessons.fromFolder
        : undefined;
  return (
    <fieldset className="fieldset">
      <legend className="sr-only">{t.lessons.course}</legend>
      <TextField
        disabled={locked}
        label={t.lessons.courseName}
        value={course.name}
        onChange={onChange("name")}
        filledFrom={filledFrom("name")}
        error={errors.name?.(t)}
        hint={t.lessons.courseHint}
        required
        wide
      />
      <fieldset className="fieldset field--wide add-lessons__teacher">
        <legend>{t.lessons.teacher}</legend>
        <TextField
          disabled={locked}
          label={t.addSource.familyName}
          value={course.family}
          onChange={onChange("family")}
          filledFrom={filledFrom("family")}
          error={errors.family?.(t)}
          hint={t.lessons.teacherHint}
          required
        />
        <TextField
          disabled={locked}
          label={t.addSource.givenName}
          value={course.given}
          onChange={onChange("given")}
          filledFrom={filledFrom("given")}
        />
      </fieldset>
      <TextField
        disabled={locked}
        label={t.lessons.year}
        value={course.year}
        onChange={onChange("year")}
        filledFrom={filledFrom("year")}
        hint={origins.year === "guess" ? t.lessons.yearGuess : undefined}
        error={errors.year?.(t)}
        required
        inputMode="numeric"
      />
      <TextField
        disabled={locked}
        label={t.lessons.url}
        value={course.url}
        onChange={onChange("url")}
        inputMode="url"
      />
    </fieldset>
  );
}

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { AddCourseDay, type DayDraft, NO_DRAFT, textOfFile } from "../components/AddCourseDay.tsx";
import { isMarkdownName } from "../domain/importText.ts";
import { CourseDay } from "../components/CourseDay.tsx";
import { CourseShelf } from "../components/CourseShelf.tsx";
import { CallNumber, Page, SkeletonPanel, StorageProblem } from "../components/ui.tsx";
import { type Course, courseNamed, shelfOf, weekDay } from "../domain/course.ts";
import { useT } from "../i18n/I18n.tsx";
import { sourcesAtom } from "../state/vault.ts";

export const Route = createFileRoute("/courses/$courseName")({
  component: CoursePage,
  validateSearch: (search: Record<string, unknown>): { readonly day?: string } => {
    const at = typeof search.day === "string" ? weekDay(search.day) : null;
    return at === null ? {} : { day: `${at.week}.${at.day}` };
  },
});

function CoursePage() {
  const t = useT();
  const { courseName } = Route.useParams();
  const sources = useAtomValue(sourcesAtom);
  const refresh = useAtomRefresh(sourcesAtom);
  if (AsyncResult.isFailure(sources)) {
    return (
      <Page title={courseName}>
        <StorageProblem onRetry={refresh} />
      </Page>
    );
  }
  if (!AsyncResult.isSuccess(sources)) {
    return (
      <Page title={courseName}>
        <div className="course">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </Page>
    );
  }
  const course = courseNamed(sources.value, courseName);
  if (course === undefined) {
    return (
      <Page title={courseName}>
        <p className="empty">{t.course.notFound}</p>
        <p className="course__back">
          <Link to="/sources" className="button">
            {t.course.backToSources}
          </Link>
        </p>
      </Page>
    );
  }
  return <CourseView course={course} />;
}

function CourseView({ course }: { readonly course: Course }) {
  const t = useT();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const shelf = shelfOf(course.lessons);
  const chosen = search.day ?? shelf.next;
  const slot = shelf.weeks.flatMap((week) => week.slots).find((one) => one.part === chosen);
  const lesson = slot?.lesson ?? null;
  const [draft, setDraft] = useState<DayDraft>(NO_DRAFT);
  const [said, setSaid] = useState<{ readonly part: string; readonly said: string } | null>(null);
  const notice = said !== null && said.part === chosen ? said.said : null;
  const read = course.lessons.filter((one) => one.readingStep === "done").length;
  const show = (part: string, words: string | null) => {
    setSaid(words === null ? null : { part, said: words });
    void navigate({ search: { day: part }, replace: true });
  };
  const choose = (part: string) => {
    setDraft(NO_DRAFT);
    show(part, null);
  };
  const teacher = [course.givenName, course.familyName].filter(Boolean).join(" ");

  return (
    <Page
      title={course.name}
      sub={
        <span className="button-row">
          <Link to="/sources" className="page-head__crumb">
            {t.course.crumb}
          </Link>
          {teacher}
          <CallNumber source={course} />
          <span className="page-head__where">{t.course.sub(course.lessons.length, read)}</span>
        </span>
      }
      actions={
        chosen === shelf.next ? undefined : (
          <button
            type="button"
            className="button button--primary"
            onClick={() => choose(shelf.next)}
          >
            {t.course.addNext(shelf.next)}
          </button>
        )
      }
    >
      <div className="course">
        <CourseShelf
          shelf={shelf}
          chosen={chosen}
          onChoose={choose}
          onDrop={(part, file) => {
            choose(part);
            if (!isMarkdownName(file.name)) show(part, t.course.dropOnlyText);
            else void textOfFile(file).then((read) => setDraft({ ...NO_DRAFT, ...read }));
          }}
        />
        {lesson === null ? (
          <AddCourseDay
            key={chosen}
            course={course}
            shelf={shelf}
            part={chosen}
            draft={draft}
            notice={notice}
            onDraft={setDraft}
            onMove={show}
            onAdded={(part, words) => {
              setDraft(NO_DRAFT);
              show(part, words);
            }}
          />
        ) : (
          <CourseDay key={lesson.id} lesson={lesson} notice={notice} />
        )}
      </div>
    </Page>
  );
}

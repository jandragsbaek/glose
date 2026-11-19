import { Link } from "@tanstack/react-router";
import { FileText, Plus, SquarePlay } from "lucide-react";
import { useState } from "react";

import type { Shelf, Slot } from "../domain/course.ts";
import { isMarkdownName } from "../domain/importText.ts";
import { callNumber } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { droppedFiles } from "./textImport.tsx";
import { Panel } from "./ui.tsx";

export function CourseShelf({
  shelf,
  chosen,
  onChoose,
  onDrop,
}: {
  readonly shelf: Shelf;
  readonly chosen: string;
  readonly onChoose: (part: string) => void;
  readonly onDrop: (part: string, file: File) => void;
}) {
  const t = useT();
  const perWeek = shelf.weeks[0]?.slots.length ?? 0;
  return (
    <Panel
      title={t.course.weeks}
      initial="rubric"
      meta={t.course.weeksMeta(shelf.weeks.length, perWeek)}
    >
      <div className="panel__body">
        <p className="course__hint">{t.course.shelfHint}</p>
        <ol className="shelf">
          {shelf.weeks.map((week) => {
            const added = week.slots.filter((slot) => slot.lesson !== null).length;
            return (
              <li key={week.week} className="shelf__week">
                <p className="shelf__label">
                  <span className="shelf__name">{t.course.week(week.week)}</span>
                  <span className="shelf__count">
                    {t.course.weekCount(added, week.slots.length)}
                  </span>
                </p>
                <ol className="shelf__row" aria-label={t.course.week(week.week)}>
                  {week.slots.map((slot) => (
                    <li key={slot.part} className="shelf__day">
                      <DaySpine
                        slot={slot}
                        chosen={slot.part === chosen}
                        next={slot.part === shelf.next}
                        onChoose={onChoose}
                        onDrop={onDrop}
                      />
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
        {shelf.unplaced.length === 0 ? null : (
          <div className="shelf__unplaced">
            <h3 className="shelf__unplaced-title">{t.course.unplaced}</h3>
            <ul>
              {shelf.unplaced.map((lesson) => (
                <li key={lesson.id}>
                  <Link to="/sources/$sourceId" params={{ sourceId: lesson.id }}>
                    {lesson.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

function DaySpine({
  slot,
  chosen,
  next,
  onChoose,
  onDrop,
}: {
  readonly slot: Slot;
  readonly chosen: boolean;
  readonly next: boolean;
  readonly onChoose: (part: string) => void;
  readonly onDrop: (part: string, file: File) => void;
}) {
  const t = useT();
  const [over, setOver] = useState(false);
  const { lesson } = slot;
  const video = lesson !== null && (lesson.videoLink !== null || lesson.videoFile !== null);
  const empty = lesson === null;
  return (
    <>
      <button
        type="button"
        className="day-spine"
        data-state={
          empty ? (next ? "next" : "empty") : lesson.readingStep === "done" ? "read" : "added"
        }
        data-over={over ? "" : undefined}
        aria-current={chosen ? "true" : undefined}
        aria-label={
          empty
            ? t.course.emptyLabel(slot.part, next)
            : t.course.spineLabel(slot.part, lesson.title, video, lesson.readingStep === "done")
        }
        title={empty ? undefined : lesson.title}
        onClick={() => onChoose(slot.part)}
        {...(empty
          ? {
              onDragOver: (event: React.DragEvent) => {
                event.preventDefault();
                setOver(true);
              },
              onDragLeave: () => setOver(false),
              onDrop: (event: React.DragEvent) => {
                event.preventDefault();
                setOver(false);
                void droppedFiles(event).then((files) => {
                  const file = files.find((one) => isMarkdownName(one.name)) ?? files[0];
                  if (file !== undefined) onDrop(slot.part, file);
                });
              },
            }
          : {})}
      >
        {empty ? (
          <Plus className="day-spine__plus" aria-hidden="true" />
        ) : (
          <>
            <span className="day-spine__band" aria-hidden="true" />
            <span className="day-spine__call" aria-hidden="true">
              {callNumber(lesson)}
            </span>
          </>
        )}
      </button>
      <span
        className="day-spine__pieces"
        aria-hidden="true"
        title={
          empty
            ? undefined
            : video
              ? `${t.course.textPiece} · ${t.course.videoPiece}`
              : t.course.textPiece
        }
      >
        {empty ? null : (
          <>
            <FileText className="day-spine__piece" data-has="" />
            <SquarePlay className="day-spine__piece" data-has={video ? "" : undefined} />
          </>
        )}
      </span>
      <span className="day-spine__day" aria-hidden="true">
        {t.course.day(slot.day)}
      </span>
    </>
  );
}

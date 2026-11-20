import type { CSSProperties } from "react";

import {
  careerLine,
  type LinkedPerson,
  type Meeting,
  type Placed,
  type Work,
} from "../domain/person.ts";
import { callNumber } from "../domain/source.ts";
import { useT } from "../i18n/I18n.tsx";
import { ReadingMarks } from "./ReadingMarks.tsx";
import { CallNumber } from "./ui.tsx";

const EDGE = 0.13;

const along = (at: number): CSSProperties => ({ "--at": `${at * 100}%` }) as CSSProperties;

const align = (at: number) => (at < EDGE ? "start" : at > 1 - EDGE ? "end" : "middle");

const meetingsAlong = (
  person: LinkedPerson,
  placedOf: ReadonlyMap<string, Placed>,
): ReadonlyArray<{ readonly at: number | null; readonly meetings: ReadonlyArray<Meeting> }> => {
  const groups = new Map<number | null, Array<Meeting>>();
  for (const meeting of person.meetings) {
    const at = placedOf.get(meeting.work)?.at ?? null;
    groups.set(at, [...(groups.get(at) ?? []), meeting]);
  }
  return Array.from(groups, ([at, meetings]) => ({ at, meetings }));
};

export function CareerLine({
  name,
  works,
  people,
  chosen,
  onChoose,
}: {
  readonly name: string;
  readonly works: ReadonlyArray<Work>;
  readonly people: ReadonlyArray<LinkedPerson>;
  readonly chosen: string | null;
  readonly onChoose: (sourceId: string) => void;
}) {
  const t = useT();
  const line = careerLine(works);
  const placedOf = new Map(line.placed.map((placed) => [placed.work.source.id, placed]));
  const talks = works.some((work) => work.source.kind === "video");
  const meets = people.some((person) => person.meetings.length > 0);

  const label = (work: Work) =>
    t.people.workMeta(t.people.kinds[work.source.kind], work.notes.length);

  const workButton = (work: Work, placed: Placed | null) => (
    <button
      type="button"
      className="career__work"
      aria-pressed={work.source.id === chosen}
      data-kind={work.source.kind}
      onClick={() => onChoose(work.source.id)}
    >
      <span className="career__call">
        <CallNumber source={work.source} />
        <ReadingMarks
          step={work.source.readingStep}
          start={work.source.readingStart}
          kind={work.source.kind}
          labelled
        />
      </span>
      <span className="career__title">{work.source.title}</span>
      <span className="career__meta">
        {placed === null ? `${t.people.undated} · ` : null}
        {label(work)}
      </span>
    </button>
  );

  return (
    <div className="career">
      <ol
        className="career__line"
        aria-label={t.people.worksLabel(name)}
        style={{ "--rows": line.rows } as CSSProperties}
      >
        {line.placed.map((placed) => (
          <li
            key={placed.work.source.id}
            className="career__stop"
            data-align={align(placed.at)}
            style={{ ...along(placed.at), "--row": placed.row } as CSSProperties}
          >
            {workButton(placed.work, placed)}
          </li>
        ))}
      </ol>
      <div className="career__rule" aria-hidden="true">
        {line.placed.map((placed) => (
          <span
            key={placed.work.source.id}
            className="career__dot"
            data-kind={placed.work.source.kind === "video" ? "talk" : "text"}
            data-chosen={placed.work.source.id === chosen || undefined}
            style={along(placed.at)}
          />
        ))}
        {line.ticks.map((tick) => (
          <span
            key={tick.year}
            className="career__tick"
            data-align={align(tick.at)}
            style={along(tick.at)}
          >
            {tick.year}
          </span>
        ))}
      </div>
      {line.undated.length === 0 ? null : (
        <ul className="career__undated">
          {line.undated.map((work) => (
            <li key={work.source.id}>{workButton(work, null)}</li>
          ))}
        </ul>
      )}
      {people.length === 0 ? null : (
        <ul className="career__lanes" aria-label={t.people.lanesLabel}>
          {people.map((person) => (
            <li key={person.node.id} className="career__lane">
              <span className="career__who">
                {person.node.title}
                <span className="career__their">
                  {person.works.length === 0
                    ? t.people.noSources
                    : person.works
                        .slice(0, 2)
                        .map((source) => callNumber(source))
                        .join(", ")}
                </span>
              </span>
              <span className="career__track">
                {person.meetings.length === 0 ? (
                  <span className="career__none">{t.people.noMeeting}</span>
                ) : (
                  meetingsAlong(person, placedOf).map(({ at, meetings }) => {
                    const said = meetings.map((meeting) => {
                      const title =
                        works.find((one) => one.source.id === meeting.work)?.source.title ??
                        meeting.work;
                      return {
                        title,
                        words: t.people.meeting(meeting.theirs, meeting.links, meeting.named),
                      };
                    });
                    const words =
                      said.length === 1
                        ? (said[0]?.words ?? "")
                        : said.map((one) => t.people.meetingAt(one.title, one.words)).join("; ");
                    if (at === null) {
                      return (
                        <span key="undated" className="career__none">
                          {said.map((one) => t.people.meetingAt(one.title, one.words)).join("; ")}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={at}
                        className="career__meet"
                        data-align={at > 0.6 ? "end" : "start"}
                        style={along(at)}
                      >
                        {said.length === 1 ? (
                          <span className="sr-only">{`${said[0]?.title ?? ""}: `}</span>
                        ) : null}
                        {words}
                      </span>
                    );
                  })
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {works.length === 0 ? null : (
        <p className="career__legend">
          <span>
            <span className="career__key" data-kind="text" aria-hidden="true" />
            {t.people.legendBook}
          </span>
          {talks ? (
            <span>
              <span className="career__key" data-kind="talk" aria-hidden="true" />
              {t.people.legendTalk}
            </span>
          ) : null}
          {meets ? (
            <span>
              <span className="career__key" data-kind="meet" aria-hidden="true" />
              {t.people.legendMeet}
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

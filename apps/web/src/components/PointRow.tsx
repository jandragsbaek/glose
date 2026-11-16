import type { Point } from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { BookOpen, Copy, GitCompareArrows, Quote } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "../i18n/I18n.tsx";
import { pointNumber } from "./Session.tsx";

export const elementOf = (point: string) => `point-${point}`;

export function PointSource({ point }: { readonly point: Point }) {
  const t = useT();
  return (
    <>
      {point.origin === "free-text" && point.quote !== null ? (
        <p className="point__from">
          <Quote className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.fromFreeText} <q>{point.quote}</q>
          </span>
        </p>
      ) : null}
      {point.origin === "probe" && point.quote !== null ? (
        <p className="point__from">
          <Quote className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.fromProbe} <q>{point.quote}</q>
          </span>
        </p>
      ) : null}
      {point.origin === "ai" ? (
        <p className="point__from">
          <BookOpen className="point__icon" aria-hidden="true" />
          <span>{t.extraction.notInFreeText}</span>
        </p>
      ) : null}
      {point.repeats === null ? null : (
        <p className="point__from point__from--graph">
          <Copy className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.repeats} <NoteLink name={point.repeats} />
          </span>
        </p>
      )}
      {point.pullsAgainst === null ? null : (
        <p className="point__from point__from--graph">
          <GitCompareArrows className="point__icon" aria-hidden="true" />
          <span>
            {t.extraction.pullsAgainst} <NoteLink name={point.pullsAgainst.note} />
            {point.pullsAgainst.why === "" ? null : (
              <span className="point__why"> {point.pullsAgainst.why}</span>
            )}
          </span>
        </p>
      )}
    </>
  );
}

export function NoteLink({ name }: { readonly name: string }) {
  return (
    <Link to="/graph" search={{ node: name }} className="wikilink">
      {name}
    </Link>
  );
}

export function PointRow({
  point,
  about,
  children,
}: {
  readonly point: Point;
  readonly about: boolean;
  readonly children: ReactNode;
}) {
  return (
    <li className="point-row" id={elementOf(point.id)}>
      <span className="point__num" data-about={about ? true : undefined}>
        {pointNumber(point)}
      </span>
      <span className="point-row__title">{point.title}</span>
      <span className="point-row__actions">{children}</span>
      <div className="point-row__source">
        <PointSource point={point} />
      </div>
    </li>
  );
}

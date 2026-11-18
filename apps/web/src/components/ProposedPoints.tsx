import { useAtomSet } from "@effect/atom-react";
import type { Point, Session } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { dropPointAtom, keepPointAtom } from "../state/sessions.ts";
import { PointRow } from "./PointRow.tsx";
import { Notice } from "./ui.tsx";

export function ProposedPoints({
  session,
  points,
  video,
  aboutId,
  onKept,
  onDiscuss,
}: {
  readonly session: Session;
  readonly points: ReadonlyArray<Point>;
  readonly video: boolean;
  readonly aboutId: string | undefined;
  readonly onKept: (point: string) => void;
  readonly onDiscuss: (point: string) => void;
}) {
  const t = useT();
  const glossId = useId();
  const [failed, setFailed] = useState(false);
  const keep = useAtomSet(keepPointAtom, { mode: "promiseExit" });
  const drop = useAtomSet(dropPointAtom, { mode: "promiseExit" });
  const decide = async (run: () => Promise<Exit.Exit<unknown, unknown>>, then?: () => void) => {
    const exit = await run();
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) then?.();
  };
  return (
    <div className="points__group">
      <div className="ai-text" data-scope="paragraphs" role="group" aria-labelledby={glossId}>
        <p className="ai-text__gloss" id={glossId}>
          {t.extraction.proposed(points.length)}
        </p>
        <ol className="point-rows">
          {points.map((point) => (
            <PointRow key={point.id} point={point} video={video} about={aboutId === point.id}>
              <button
                type="button"
                className="button button--small"
                onClick={() =>
                  decide(
                    () =>
                      keep({ payload: { id: session.id, point: point.id, title: point.title } }),
                    () => onKept(point.id),
                  )
                }
              >
                {t.extraction.keep}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => onDiscuss(point.id)}
              >
                {t.extraction.discuss}
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => decide(() => drop({ payload: { id: session.id, point: point.id } }))}
              >
                {t.extraction.drop}
              </button>
            </PointRow>
          ))}
        </ol>
      </div>
      {failed ? (
        <Notice tone="error">
          <p>{t.extraction.actionFailed}</p>
        </Notice>
      ) : null}
    </div>
  );
}

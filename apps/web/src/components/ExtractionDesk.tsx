import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Point, Source } from "@glose/contracts";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { type ReactNode, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { probeSessionAtom, SESSION_KEYS, startSessionAtom } from "../state/sessions.ts";
import { NeedsChatGpt, useChatGptReady } from "./Session.tsx";
import { StepBar } from "./StepBar.tsx";
import { Flourish, Notice } from "./ui.tsx";

export function Desk({
  source,
  sourcePanels,
  points,
  margin,
  children,
}: {
  readonly source: Source;
  readonly sourcePanels: ReactNode;
  readonly points: ReadonlyArray<Point>;
  readonly margin?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useT();
  const [showSource, setShowSource] = useState(false);
  const counted = points.filter((point) => point.state !== "dropped");
  const probe = AsyncResult.getOrElse(useAtomValue(probeSessionAtom(source.id)), () => null);
  const asked = probe?.entries.filter((entry) => entry._tag === "ProbeQuestion").length ?? 0;
  return (
    <div className="extraction" data-margin={margin === undefined ? undefined : true}>
      <div className="extraction__work">
        <StepBar
          source={source}
          extractionNote={t.extraction.stepNote(
            counted.filter((point) => point.state === "written").length,
            counted.length,
          )}
          {...(asked === 0 ? {} : { probeNote: t.probe.stepNote(asked) })}
          freeTextAction={
            <button
              type="button"
              className="step__action"
              aria-expanded={showSource}
              onClick={() => setShowSource(!showSource)}
            >
              {showSource ? t.extraction.hideFreeText : t.extraction.showFreeText}
            </button>
          }
        />
        {showSource ? sourcePanels : null}
        {children}
      </div>
      {margin}
    </div>
  );
}

export function StartExtraction({ source }: { readonly source: Source }) {
  return (
    <PointsPanel count={null}>
      <StartGroup source={source} />
    </PointsPanel>
  );
}

export function StartGroup({ source }: { readonly source: Source }) {
  const t = useT();
  const ready = useChatGptReady();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useAtomSet(startSessionAtom, { mode: "promiseExit" });

  const begin = async () => {
    setBusy(true);
    const exit = await start({
      payload: { kind: "extraction", subject: source.id },
      reactivityKeys: SESSION_KEYS.sessions,
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <div className="points__group">
      {ready ? (
        <div className="stack points__start">
          <div>
            <p className="empty empty--lead">{t.extraction.startLead}</p>
            <p className="empty">{t.extraction.startBody}</p>
          </div>
          {failed ? (
            <Notice tone="error" title={t.errors.storage}>
              <p>{t.errors.storageRecovery}</p>
            </Notice>
          ) : null}
          <div className="button-row">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={begin}
            >
              {t.extraction.start}
            </button>
          </div>
        </div>
      ) : (
        <NeedsChatGpt title={t.session.needsChatGpt} body={t.session.needsChatGptBody} />
      )}
    </div>
  );
}

export function PointsPanel({
  count,
  children,
}: {
  readonly count: number | null;
  readonly children: ReactNode;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section className="panel points" data-initial="rubric" aria-labelledby={headingId}>
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {t.extraction.title}
        </h2>
        {count === null ? null : <span className="panel__meta">{t.extraction.count(count)}</span>}
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      {children}
    </section>
  );
}

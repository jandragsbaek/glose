import { useAtomSet } from "@effect/atom-react";
import {
  nextReadingStep,
  probeFindings,
  type Session,
  type Source,
  type TopicState,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { advanceReadingAtom, sourceKeys } from "../state/vault.ts";
import { VerdictIcon } from "./ProbeRows.tsx";
import { followRow } from "./ProbeWhole.tsx";
import { Flourish, Notice } from "./ui.tsx";

const STATE_ORDER: ReadonlyArray<TopicState> = [
  "known",
  "known-after-teaching",
  "taught",
  "gap",
  "unconfirmed",
  "asking",
  "not-asked",
];

const toneOf = (state: TopicState) =>
  state === "known" || state === "known-after-teaching"
    ? "good"
    : state === "asking" || state === "not-asked" || state === "unconfirmed"
      ? "none"
      : "gap";

export function Findings({
  session,
  source,
}: {
  readonly session: Session;
  readonly source: Source;
}) {
  const t = useT();
  const headingId = useId();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const advance = useAtomSet(advanceReadingAtom, { mode: "promiseExit" });
  const findings = probeFindings(session.entries);
  const next =
    nextReadingStep(source.readingStart, "probe", source.kind) === "extraction"
      ? "extraction"
      : "done";

  const go = async () => {
    setBusy(true);
    const exit = await advance({
      payload: { id: source.id, from: "probe" },
      reactivityKeys: sourceKeys(source.id),
    });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };

  return (
    <section className="probe__found" aria-labelledby={headingId} ref={followRow}>
      <div className="panel__head">
        <h2 className="panel__title" id={headingId}>
          {t.probe.found}
        </h2>
      </div>
      <div className="panel__rule" aria-hidden="true">
        <Flourish />
      </div>
      {findings.length === 0 ? (
        <p className="empty">{t.probe.foundEmpty}</p>
      ) : (
        <dl className="probe__found-list">
          {STATE_ORDER.map((state) => {
            const topics = findings.filter((finding) => finding.state === state);
            if (topics.length === 0) return null;
            const tone = toneOf(state);
            return (
              <div key={state} className="verdict" data-tone={tone}>
                <VerdictIcon tone={tone} />
                <div>
                  <dt className="verdict__name">{t.probe.states[state]}</dt>
                  <dd className="verdict__why">
                    {topics.map((finding) => finding.topic).join(" · ")}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      )}
      <p className="field__hint">{t.probe.keptIn(`Probes/${source.id}.md`)}</p>
      {source.readingStep === "probe" ? (
        <>
          {failed ? (
            <Notice tone="error">
              <p>{t.extraction.nextFailed}</p>
            </Notice>
          ) : null}
          <div className="button-row">
            <button type="button" className="button button--primary" disabled={busy} onClick={go}>
              {next === "extraction" ? t.probe.continueExtraction : t.probe.doneRead(source.title)}
            </button>
            <span className="status">
              {next === "extraction" ? t.probe.continueHint : t.probe.doneHint}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

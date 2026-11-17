import { useAtomSet } from "@effect/atom-react";
import { openQuestion, type Session } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { continueProbeAtom } from "../state/sessions.ts";
import { Notice } from "./ui.tsx";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const followRow = (node: HTMLElement | null) => {
  node?.scrollIntoView({ block: "end", behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

export const waitsForWhole = (session: Session) =>
  !session.working &&
  openQuestion(session.entries) === null &&
  !session.entries.some(
    (entry) =>
      (entry._tag === "ProbeFocusDone" && entry.paragraph === 0) ||
      (entry._tag === "ProbeQuestion" && entry.paragraph === undefined),
  );

export function WholeProbe({ session }: { readonly session: Session }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const go = useAtomSet(continueProbeAtom, { mode: "promiseExit" });
  const start = async () => {
    setBusy(true);
    const exit = await go({ payload: { id: session.id } });
    setBusy(false);
    setFailed(Exit.isFailure(exit));
  };
  return (
    <div className="probe__start probe__whole">
      <p className="empty empty--lead">{t.reader.probe.wholeLead}</p>
      <p className="empty">{t.reader.probe.wholeBody}</p>
      {failed ? (
        <Notice tone="error">
          <p>{t.probe.sendFailed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button type="button" className="button button--primary" disabled={busy} onClick={start}>
          {t.reader.probe.wholeStart}
        </button>
      </div>
    </div>
  );
}

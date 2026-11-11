import { useAtomSet } from "@effect/atom-react";
import {
  AI_CHECKS,
  type CardScore,
  type Check,
  ruleChecks,
  type ScoredCard,
} from "@glose/contracts";
import { useEffect, useRef } from "react";

import { useT } from "../i18n/I18n.tsx";
import { CARD_KEYS, judgeCardsAtom } from "../state/cards.ts";
import { Notice } from "./ui.tsx";

const isAi = (check: Check) => (AI_CHECKS as ReadonlyArray<string>).includes(check.id);

/** A Check that passes, as one line in the folded list. */
function PassedCheck({ check }: { readonly check: Check }) {
  const t = useT();
  return (
    <>
      {t.score.checks[check.id].name}
      {isAi(check) ? <AiTag /> : null}
    </>
  );
}

function AiTag() {
  const t = useT();
  return (
    <>
      {" "}
      <small title={t.score.aiHint}>({t.score.ai})</small>
    </>
  );
}

/** Every Check that warns or fails, each as its own callout with how to fix it. */
function CheckCallouts({ checks }: { readonly checks: ReadonlyArray<Check> }) {
  const t = useT();
  const faults = checks
    .filter((check) => check.verdict !== "pass")
    // Failures first: they make the Grade poor.
    .toSorted((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "fail" ? -1 : 1));
  if (faults.length === 0) return null;
  return (
    <ul className="notice-list">
      {faults.map((check) => (
        <li key={check.id} data-check={check.id} data-verdict={check.verdict}>
          <Notice
            callout
            tone={check.verdict === "fail" ? "error" : "warning"}
            title={
              <>
                {t.score.verdicts[check.verdict]}: {t.score.checks[check.id].name}
                {isAi(check) ? <AiTag /> : null}
              </>
            }
          >
            <p>{check.note ?? t.score.checks[check.id].tip}</p>
          </Notice>
        </li>
      ))}
    </ul>
  );
}

/**
 * A Card's Checks: the Grade, a callout for every Check that warns or fails, and the Checks
 * that pass, folded away.
 */
export function CardChecks({ score }: { readonly score: CardScore }) {
  const t = useT();
  const passed = score.checks.filter((check) => check.verdict === "pass");
  return (
    <section
      className="card-checks"
      aria-label={t.score.label}
      data-grade={score.grade}
      data-judge={score.judge}
    >
      <p>
        <strong>{t.score.grades[score.grade]}</strong>
        {/* Without ChatGPT, the list says so once, above the Cards (AiChecksOff). */}
        {score.judge === "done" || score.judge === "off" ? null : (
          <>
            {" "}
            <span role="status">{t.score.judge[score.judge]}</span>
          </>
        )}
      </p>
      <CheckCallouts checks={score.checks} />
      {passed.length === 0 ? null : (
        <details>
          <summary>{t.score.passed(passed.length)}</summary>
          <ul>
            {passed.map((check) => (
              <li key={check.id} data-verdict="pass">
                <PassedCheck check={check} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** The rule Checks of words being written, as they change; the AI Checks follow the save. */
export function TypingChecks({
  question,
  answer,
}: {
  readonly question: string;
  readonly answer: string;
}) {
  const t = useT();
  if (question.trim() === "") return null;
  const checks = ruleChecks({ question, answer });
  if (checks.every((check) => check.verdict === "pass")) return null;
  return (
    <section aria-label={t.score.rulesWhileTyping} aria-live="polite">
      <CheckCallouts checks={checks} />
    </section>
  );
}

/** Says once, above a list, that its Cards have no AI Checks without ChatGPT. */
export function AiChecksOff({ scores }: { readonly scores: ReadonlyArray<CardScore | undefined> }) {
  const t = useT();
  if (!scores.some((score) => score?.judge === "off")) return null;
  return (
    <Notice tone="info">
      <p>{t.score.judge.off}</p>
    </Notice>
  );
}

/** At most this many Cards per request, as `cards.judge` takes them. */
const JUDGE_AT_ONCE = 50;

/**
 * Asks the server for the AI Checks of the shown Cards that wait for them, unless a request
 * for the same words is still running; the list reads again when they are done.
 */
export function useJudgeShown(cards: ReadonlyArray<ScoredCard>) {
  const judge = useAtomSet(judgeCardsAtom, { mode: "promiseExit" });
  const running = useRef(new Set<string>());
  // The Cards and their words, as one string, so the effect runs only when they change.
  const waiting = JSON.stringify(
    cards
      .filter((card) => card.score.judge === "pending")
      .map((card) => [card.file, card.question, card.answer])
      .slice(0, JUDGE_AT_ONCE),
  );
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- starts work on the server (the AI Checks) for what is on screen; no React state depends on it.
  useEffect(() => {
    const fresh = (JSON.parse(waiting) as Array<[string, string, string]>)
      .map((wording) => ({ file: wording[0], key: JSON.stringify(wording) }))
      .filter(({ key }) => !running.current.has(key));
    if (fresh.length === 0) return;
    for (const { key } of fresh) running.current.add(key);
    void judge({
      payload: { files: fresh.map(({ file }) => file) },
      reactivityKeys: CARD_KEYS.cards,
    }).finally(() => {
      for (const { key } of fresh) running.current.delete(key);
    });
  }, [waiting, judge]);
}

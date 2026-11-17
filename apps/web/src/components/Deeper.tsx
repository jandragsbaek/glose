import { useAtomSet } from "@effect/atom-react";
import { type Article, openQuestion, type Session } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { BookOpen, Check } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { answerProbeAtom } from "../state/sessions.ts";
import { AnswerView, Judgment } from "./Probe.tsx";
import { IS_MAC, MessageText } from "./Session.tsx";
import { followRow } from "./ProbeWhole.tsx";
import { type Entry } from "./readerState.ts";

import { Notice } from "./ui.tsx";

export function Deeper({
  probe,
  asked,
  working,
  understood,
  onOpen,
  article,
}: {
  readonly probe: Session;
  readonly asked: ReadonlyArray<Entry<"ProbeQuestion">>;
  readonly working: boolean;
  readonly understood: boolean;
  readonly onOpen: (id: string) => void;
  readonly article: Article;
}) {
  const t = useT();
  const [lastAtOpen] = useState(() => asked.at(-1)?.number);
  const numbers = new Set(asked.map((question) => question.number));
  const rows = probe.entries.filter(
    (entry) =>
      (entry._tag === "ProbeQuestion" && numbers.has(entry.number)) ||
      (entry._tag === "ProbeAnswer" && numbers.has(entry.question)) ||
      (entry._tag === "ProbeTaught" && entry.question !== null && numbers.has(entry.question)),
  );
  const open = openQuestion(probe.entries);
  const openHere = open !== null && numbers.has(open.number);
  return (
    <div className="panel__body margin__body deeper">
      <h3 className="deeper__title">{t.reader.margin.deeperTitle}</h3>
      <ol className="deeper__rows" aria-live="polite" aria-relevant="additions">
        {rows.map((entry) => {
          switch (entry._tag) {
            case "ProbeQuestion":
              return (
                <li
                  key={`q${entry.number}`}
                  className="deeper__q"
                  ref={
                    entry.number === asked.at(-1)?.number && entry.number !== lastAtOpen
                      ? followRow
                      : undefined
                  }
                >
                  <p className="probe__who">
                    {t.session.ai}{" "}
                    <span className="probe__qn">{t.probe.question(entry.number)}</span>
                    {entry.again === null ? null : (
                      <span className="probe__topic"> · {t.probe.again(entry.again)}</span>
                    )}
                  </p>
                  <p className="probe__ask">{entry.text}</p>
                </li>
              );
            case "ProbeAnswer": {
              const judgment = probe.entries.find(
                (other): other is Entry<"ProbeJudgment"> =>
                  other._tag === "ProbeJudgment" && other.question === entry.question,
              );
              return (
                <li key={`a${entry.question}`} className="deeper__a">
                  <AnswerView answer={entry} quote={judgment?.quote ?? null} />
                  {judgment === undefined ? null : <Judgment judgment={judgment} />}
                </li>
              );
            }
            case "ProbeTaught": {
              const at = entry.paragraph;
              const target =
                at === undefined
                  ? undefined
                  : (article.passages.find((other) => other.n === at)?.id ?? `${at}.0`);
              return (
                <li key={`t${entry.question ?? "intro"}-${entry.topic}`} className="deeper__t">
                  <div
                    className="ai-text probe__taught"
                    data-scope="part"
                    role="group"
                    aria-label={t.probe.taught(entry.question)}
                  >
                    <p className="ai-text__gloss">{t.probe.taught(entry.question)}</p>
                    <MessageText text={entry.text} points={[]} onPoint={undefined} />
                    {at === undefined ? null : (
                      <p className="probe__check">
                        <BookOpen className="probe__icon" aria-hidden="true" />
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            target === undefined || target.endsWith(".0")
                              ? document
                                  .getElementById(`p-${at}`)
                                  ?.scrollIntoView({ block: "center", behavior: "smooth" })
                              : onOpen(target)
                          }
                        >
                          {t.reader.margin.fromText(at)}
                        </button>
                      </p>
                    )}
                  </div>
                </li>
              );
            }
            default:
              return null;
          }
        })}
      </ol>
      {working ? (
        <p className="deeper__working" role="status">
          <span className="live__tick" aria-hidden="true" />
          {t.reader.margin.deeperWorking}
        </p>
      ) : null}
      {understood && !openHere ? (
        <p className="deeper__done">
          <Check className="deeper__done-icon" aria-hidden="true" />
          {t.reader.margin.understood}
        </p>
      ) : null}
      {openHere && open !== null ? <DeeperAnswer session={probe} question={open.number} /> : null}
    </div>
  );
}

function DeeperAnswer({
  session,
  question,
}: {
  readonly session: Session;
  readonly question: number;
}) {
  const t = useT();
  const reasoningId = useId();
  const answerId = useId();
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [failed, setFailed] = useState(false);
  const send = useAtomSet(answerProbeAtom, { mode: "promiseExit" });
  const ready = !session.working;
  const submit = async (teachMe: boolean, event?: FormEvent) => {
    event?.preventDefault();
    if (!ready || (!teachMe && answer.trim() === "")) return;
    const exit = await send({
      payload: { id: session.id, question, reasoning, answer: teachMe ? "" : answer, teachMe },
    });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) {
      setReasoning("");
      setAnswer("");
    }
  };
  return (
    <form className="deeper__form" onSubmit={(event) => submit(false, event)}>
      <label className="probe__label" htmlFor={reasoningId}>
        {t.probe.reasoning}
        <span className="probe__for"> · {t.probe.question(question)}</span>
      </label>
      <textarea
        id={reasoningId}
        className="textarea margin__textarea"
        placeholder={t.probe.reasoningPlaceholder}
        value={reasoning}
        onChange={(event) => setReasoning(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(false);
        }}
        spellCheck
      />
      <label className="probe__label" htmlFor={answerId}>
        {t.probe.answer}
      </label>
      <input
        id={answerId}
        className="input"
        placeholder={t.probe.answerPlaceholder}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(false);
        }}
        autoComplete="off"
        spellCheck
      />
      {failed ? (
        <Notice tone="error">
          <p>{t.probe.sendFailed}</p>
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          type="submit"
          className="button button--primary"
          disabled={!ready || answer.trim() === ""}
          aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
        >
          {t.probe.send}
          <kbd className="key" aria-hidden="true">
            {IS_MAC ? t.session.sendKey.mac : t.session.sendKey.other}
          </kbd>
        </button>
        <button
          type="button"
          className="button button--quiet"
          disabled={!ready}
          onClick={() => void submit(true)}
        >
          {t.probe.teachMe}
        </button>
      </div>
    </form>
  );
}

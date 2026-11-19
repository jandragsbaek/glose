import { useAtomSet } from "@effect/atom-react";
import {
  type Article,
  type Confidence,
  judgmentsOf,
  openQuestion,
  type Session,
} from "@glose/contracts";
import * as Exit from "effect/Exit";
import { BookOpen, Check } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { answerProbeAtom, askHintAtom } from "../state/sessions.ts";
import { AnswerView, Judgment } from "./ProbeRows.tsx";
import { type AnswerDraft, answerParts, useAnswerDraft } from "./ProbeAnswer.tsx";
import { ChoiceOptions, SureChoice } from "./ProbeChoice.tsx";
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
      (entry._tag === "ProbeTaught" && entry.question !== null && numbers.has(entry.question)) ||
      (entry._tag === "ProbeHint" && numbers.has(entry.question)),
  );
  const open = openQuestion(probe.entries);
  const openHere = open !== null && numbers.has(open.number);
  const { draft } = useAnswerDraft(open?.number ?? null);
  return (
    <div className="panel__body margin__body deeper">
      <h3 className="deeper__title">{t.reader.margin.deeperTitle}</h3>
      <ol className="deeper__rows" aria-live="polite" aria-relevant="additions">
        {rows.map((entry, index) => {
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
                  <ChoiceOptions
                    question={entry}
                    answer={probe.entries.find(
                      (other): other is Entry<"ProbeAnswer"> =>
                        other._tag === "ProbeAnswer" && other.question === entry.number,
                    )}
                    draft={open?.number === entry.number ? draft : null}
                    disabled={working}
                  />
                </li>
              );
            case "ProbeAnswer": {
              const judgments = judgmentsOf(probe.entries, entry.question);
              const judgment = judgments.at(-1);
              return (
                <li key={`a${entry.question}`} className="deeper__a">
                  <AnswerView
                    answer={entry}
                    question={asked.find((question) => question.number === entry.question)}
                    quote={judgment?.quote ?? null}
                  />
                  {judgment === undefined ? null : (
                    <Judgment judgment={judgment} answer={entry} again={judgments.length > 1} />
                  )}
                </li>
              );
            }
            case "ProbeHint":
              return (
                // oxlint-disable-next-line react/no-array-index-key -- entries are only ever appended, so a hint's place is its identity.
                <li key={`h${index}`} className="deeper__t">
                  <div
                    className="ai-text probe__hint"
                    data-scope="paragraphs"
                    role="group"
                    aria-label={t.probe.hintGloss(entry.question)}
                  >
                    <p className="ai-text__gloss">{t.probe.hintGloss(entry.question)}</p>
                    <MessageText text={entry.text} points={[]} onPoint={undefined} />
                  </div>
                </li>
              );
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
      {openHere && open !== null ? (
        <DeeperAnswer session={probe} question={open} draft={draft} />
      ) : null}
    </div>
  );
}

function DeeperAnswer({
  session,
  question,
  draft,
}: {
  readonly session: Session;
  readonly question: Entry<"ProbeQuestion">;
  readonly draft: AnswerDraft;
}) {
  const t = useT();
  const textId = useId();
  const [text, setText] = useState("");
  const [sure, setSure] = useState<Confidence | null>(null);
  const [failed, setFailed] = useState<"answer" | "hint" | null>(null);
  const send = useAtomSet(answerProbeAtom, { mode: "promiseExit" });
  const hint = useAtomSet(askHintAtom, { mode: "promiseExit" });
  const choice = question.choice;
  const ready = !session.working;
  const canSend = ready && (choice === undefined ? text.trim() !== "" : draft.choice.length > 0);
  const submit = async (teachMe: boolean, event?: FormEvent) => {
    event?.preventDefault();
    if (!ready || (!teachMe && !canSend)) return;
    const exit = await send({
      payload: {
        id: session.id,
        question: question.number,
        ...answerParts(text, teachMe || choice !== undefined),
        teachMe,
        ...(teachMe || choice === undefined ? {} : { choice: draft.choice }),
        ...(teachMe || sure === null ? {} : { confidence: sure }),
      },
    });
    setFailed(Exit.isFailure(exit) ? "answer" : null);
    if (Exit.isSuccess(exit)) {
      setText("");
      setSure(null);
    }
  };
  const askHint = async () => {
    const exit = await hint({ payload: { id: session.id, question: question.number } });
    setFailed(Exit.isFailure(exit) ? "hint" : null);
  };
  const onKeyDown = (event: { key: string; metaKey: boolean; ctrlKey: boolean }) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(false);
  };
  return (
    <form className="deeper__form" onSubmit={(event) => submit(false, event)}>
      <label className="probe__label" htmlFor={textId}>
        {choice === undefined ? t.probe.answer : t.probe.reasoning}
        <span className="probe__for"> · {t.probe.question(question.number)}</span>
      </label>
      <textarea
        id={textId}
        className="textarea margin__textarea"
        placeholder={
          choice === undefined ? t.probe.openPlaceholder : t.probe.choiceReasoningPlaceholder
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck
      />
      <SureChoice value={sure} onChange={setSure} disabled={!ready} />
      {failed === null ? null : (
        <Notice tone="error">
          <p>{failed === "hint" ? t.probe.hintFailed : t.probe.sendFailed}</p>
        </Notice>
      )}
      <div className="button-row">
        <button
          type="submit"
          className="button button--primary"
          disabled={!canSend}
          aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
        >
          {t.probe.send}
          <kbd className="key" aria-hidden="true">
            {IS_MAC ? t.session.sendKey.mac : t.session.sendKey.other}
          </kbd>
        </button>
        <button type="button" className="button button--quiet" disabled={!ready} onClick={askHint}>
          {t.probe.hint}
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

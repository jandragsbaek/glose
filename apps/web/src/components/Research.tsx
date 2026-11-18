import { useAtomSet } from "@effect/atom-react";
import { type ResearchAsk, type Session } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { useId, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { startResearchAtom } from "../state/research.ts";
import { Composer, NeedsChatGpt, SessionProblem, Transcript, useChatGptReady } from "./Session.tsx";
import { Notice, Panel } from "./ui.tsx";

const ASKS: ReadonlyArray<ResearchAsk> = ["learn", "back", "check", "bridge"];

export function Research({
  draft,
  session,
  title,
  text,
  notes,
  onStarted,
}: {
  readonly draft: string;
  readonly session: Session | null;
  readonly title: string;
  readonly text: string;
  readonly notes: ReadonlyArray<string>;
  readonly onStarted: (id: string) => void;
}) {
  const t = useT();
  const ready = useChatGptReady();
  return (
    <Panel title={t.research.title} initial="rubric" meta={t.research.meta}>
      <div className="panel__body stack research">
        {session === null ? (
          <>
            <p className="field__hint">{t.research.intro}</p>
            {ready ? (
              <AskForm
                draft={draft}
                title={title}
                text={text}
                notes={notes}
                onStarted={onStarted}
              />
            ) : (
              <NeedsChatGpt title={t.research.needsChatGpt} body={t.research.needsChatGptBody} />
            )}
          </>
        ) : (
          <>
            <Transcript session={session} />
            <SessionProblem session={session} />
            <details className="aside research__again">
              <summary>{t.research.again}</summary>
              <div className="aside__body">
                <AskForm
                  draft={draft}
                  title={title}
                  text={text}
                  notes={notes}
                  again
                  busy={session.working}
                  onStarted={onStarted}
                />
              </div>
            </details>
            <Composer session={session} placeholder={t.research.placeholder} />
          </>
        )}
      </div>
    </Panel>
  );
}

function AskForm({
  draft,
  title,
  text,
  notes,
  again = false,
  busy = false,
  onStarted,
}: {
  readonly draft: string;
  readonly title: string;
  readonly text: string;
  readonly notes: ReadonlyArray<string>;
  readonly again?: boolean;
  readonly busy?: boolean;
  readonly onStarted: (id: string) => void;
}) {
  const t = useT();
  const start = useAtomSet(startResearchAtom, { mode: "promiseExit" });
  const name = useId();
  const questionId = useId();
  const questionHintId = useId();
  const fromId = useId();
  const toId = useId();
  const listId = useId();
  const problemId = useId();
  const [ask, setAsk] = useState<ResearchAsk>("learn");
  const [question, setQuestion] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<"needsTitle" | "bridgeMissing" | "failed" | null>(null);

  const known = new Map(notes.map((note) => [note.toLocaleLowerCase("und"), note]));
  const pick = (value: string) => known.get(value.trim().toLocaleLowerCase("und")) ?? null;

  const submit = async () => {
    const bridge = ask === "bridge" ? [pick(from), pick(to)] : [];
    if (ask === "bridge" && (bridge.some((note) => note === null) || bridge[0] === bridge[1])) {
      setProblem("bridgeMissing");
      return;
    }
    if (ask !== "bridge" && title.trim() === "" && text.trim() === "" && question.trim() === "") {
      setProblem("needsTitle");
      return;
    }
    setProblem(null);
    setStarting(true);
    const exit = await start({
      payload: {
        draft,
        ask,
        title,
        text,
        question,
        notes: bridge.filter((note) => note !== null),
      },
    });
    setStarting(false);
    if (Exit.isSuccess(exit)) {
      setQuestion("");
      onStarted(exit.value.id);
    } else setProblem("failed");
  };

  return (
    <form
      className="stack research__ask"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset className="fieldset research__asks">
        <legend className="field__label">{t.research.askLegend}</legend>
        {ASKS.map((option) => (
          <label key={option} className="choice start-choice research__choice">
            <input
              type="radio"
              name={name}
              value={option}
              checked={ask === option}
              onChange={() => {
                setAsk(option);
                setProblem(null);
              }}
            />
            <span className="start-choice__text">
              <span>{t.research.asks[option]}</span>
              <span className="field__hint">{t.research.askHints[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {ask === "bridge" ? (
        <div className="research__bridge">
          <datalist id={listId}>
            {notes.map((note) => (
              <option key={note} value={note} />
            ))}
          </datalist>
          <label className="field" htmlFor={fromId}>
            <span className="field__label">{t.research.bridgeFrom}</span>
            <input
              id={fromId}
              className="input"
              list={listId}
              value={from}
              placeholder={t.research.bridgePlaceholder}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="field" htmlFor={toId}>
            <span className="field__label">{t.research.bridgeTo}</span>
            <input
              id={toId}
              className="input"
              list={listId}
              value={to}
              placeholder={t.research.bridgePlaceholder}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      <div className="field">
        <label className="field__label" htmlFor={questionId}>
          {t.research.questionLabel}
        </label>
        <textarea
          id={questionId}
          className="textarea research__question"
          rows={2}
          value={question}
          aria-describedby={questionHintId}
          onChange={(event) => setQuestion(event.target.value)}
          spellCheck
        />
        <p className="field__hint" id={questionHintId}>
          {t.research.questionHint}
        </p>
      </div>
      {problem === null ? null : (
        <Notice tone={problem === "failed" ? "error" : "warning"}>
          <p id={problemId}>
            {problem === "failed" ? t.research.startFailed : t.research[problem]}
          </p>
        </Notice>
      )}
      <p className="button-row">
        <button
          type="submit"
          className={again ? "button" : "button button--primary"}
          disabled={starting || busy}
        >
          {again ? t.research.again : t.research.start}
        </button>
      </p>
    </form>
  );
}

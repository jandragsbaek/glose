import { useAtomSet } from "@effect/atom-react";
import { type Confidence, type Session, type SessionEntry } from "@glose/contracts";
import * as Exit from "effect/Exit";
import { type FormEvent, type KeyboardEvent, type RefObject, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useT } from "../i18n/I18n.tsx";
import {
  answerProbeAtom,
  askHintAtom,
  retrySessionAtom,
  sendMessageAtom,
  stopSessionAtom,
} from "../state/sessions.ts";
import { ManageUsageLink } from "./ChatGptConnection.tsx";
import { optionLetter, type PickedOptions, SureChoice } from "./ProbeChoice.tsx";
import { IS_MAC } from "./Session.tsx";
import { Notice } from "./ui.tsx";

type Question = Extract<SessionEntry, { _tag: "ProbeQuestion" }>;

export interface Talk {
  readonly judgment: number | null;
}

export interface AnswerDraft extends PickedOptions {
  readonly talk: Talk | null;
  readonly openTalk: (judgment: number | null) => void;
  readonly closeTalk: () => void;
}

export interface DraftFields {
  readonly talk: RefObject<HTMLTextAreaElement | null>;
  readonly reasoning: RefObject<HTMLTextAreaElement | null>;
}

export function useAnswerDraft(open: number | null): {
  readonly draft: AnswerDraft;
  readonly fields: DraftFields;
} {
  const [picked, setPicked] = useState<{
    readonly question: number;
    readonly choice: ReadonlyArray<number>;
  } | null>(null);
  const [talk, setTalk] = useState<(Talk & { readonly open: number | null }) | null>(null);
  const talkRef = useRef<HTMLTextAreaElement>(null);
  const reasoningRef = useRef<HTMLTextAreaElement>(null);
  return {
    draft: {
      choice: picked !== null && picked.question === open ? picked.choice : [],
      setChoice: (question, choice) => setPicked({ question, choice }),
      talk: talk !== null && talk.open === open ? { judgment: talk.judgment } : null,
      openTalk: (judgment) => {
        flushSync(() => setTalk({ judgment, open }));
        talkRef.current?.focus();
      },
      closeTalk: () => {
        flushSync(() => setTalk(null));
        reasoningRef.current?.focus();
      },
    },
    fields: { talk: talkRef, reasoning: reasoningRef },
  };
}

const DICTATION = IS_MAC
  ? "mac"
  : typeof navigator !== "undefined" && /Windows/.test(navigator.userAgent)
    ? "windows"
    : "other";

function SendButton({ disabled }: { readonly disabled: boolean }) {
  const t = useT();
  return (
    <button
      type="submit"
      className="button button--primary"
      disabled={disabled}
      aria-keyshortcuts={IS_MAC ? "Meta+Enter" : "Control+Enter"}
    >
      {t.probe.send}
      <kbd className="key" aria-hidden="true">
        {IS_MAC ? t.session.sendKey.mac : t.session.sendKey.other}
      </kbd>
    </button>
  );
}

const sendsOnKey = (send: () => void) => (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    send();
  }
};

export function AnswerBox({
  session,
  open,
  draft,
  fields,
  waitsForWhole,
}: {
  readonly session: Session;
  readonly open: Question | null;
  readonly draft: AnswerDraft;
  readonly fields: DraftFields;
  readonly waitsForWhole: boolean;
}) {
  const talking = draft.talk !== null || open === null;
  return (
    <div className="probe__box">
      {open === null ? null : (
        <AnswerForm
          session={session}
          open={open}
          draft={draft}
          reasoningRef={fields.reasoning}
          hidden={talking}
        />
      )}
      <TalkForm
        session={session}
        open={open}
        judgment={draft.talk?.judgment ?? null}
        back={open !== null ? "answer" : waitsForWhole ? "close" : null}
        onBack={draft.closeTalk}
        onSent={draft.closeTalk}
        textRef={fields.talk}
        hidden={!talking}
      />
    </div>
  );
}

function AnswerForm({
  session,
  open,
  draft,
  reasoningRef,
  hidden,
}: {
  readonly session: Session;
  readonly open: Question;
  readonly draft: AnswerDraft;
  readonly reasoningRef: RefObject<HTMLTextAreaElement | null>;
  readonly hidden: boolean;
}) {
  const t = useT();
  const reasoningId = useId();
  const reasoningHintId = useId();
  const answerId = useId();
  const chosenId = useId();
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [sure, setSure] = useState<Confidence | null>(null);
  const [failed, setFailed] = useState<"answer" | "hint" | null>(null);
  const send = useAtomSet(answerProbeAtom, { mode: "promiseExit" });
  const hint = useAtomSet(askHintAtom, { mode: "promiseExit" });
  const stop = useAtomSet(stopSessionAtom);
  const choice = open.choice;
  const ready = !session.working;
  const canSend = ready && (choice === undefined ? answer.trim() !== "" : draft.choice.length > 0);

  const submit = async (teachMe: boolean, event?: FormEvent) => {
    event?.preventDefault();
    if (!ready || (!teachMe && !canSend)) return;
    const exit = await send({
      payload: {
        id: session.id,
        question: open.number,
        reasoning,
        answer: teachMe || choice !== undefined ? "" : answer,
        teachMe,
        ...(teachMe || choice === undefined ? {} : { choice: draft.choice }),
        ...(teachMe || sure === null ? {} : { confidence: sure }),
      },
    });
    setFailed(Exit.isFailure(exit) ? "answer" : null);
    if (Exit.isSuccess(exit)) {
      setReasoning("");
      setAnswer("");
      setSure(null);
    }
  };

  const askHint = async () => {
    const exit = await hint({ payload: { id: session.id, question: open.number } });
    setFailed(Exit.isFailure(exit) ? "hint" : null);
  };

  const onKeyDown = sendsOnKey(() => void submit(false));

  return (
    <form className="probe__box-in" hidden={hidden} onSubmit={(event) => submit(false, event)}>
      <div className="probe__field">
        <div className="probe__label-row">
          <label className="probe__label" htmlFor={reasoningId}>
            {t.probe.reasoning}
            <span className="probe__for"> · {t.probe.question(open.number)}</span>
          </label>
          <button
            type="button"
            className="link-button probe__switch"
            onClick={() => draft.openTalk(null)}
          >
            {t.probe.talk}
          </button>
        </div>
        <p className="field__hint" id={reasoningHintId}>
          {t.probe.dictate[DICTATION]}
        </p>
        <textarea
          ref={reasoningRef}
          className="composer__text probe__reasoning"
          id={reasoningId}
          aria-describedby={reasoningHintId}
          placeholder={
            choice === undefined ? t.probe.reasoningPlaceholder : t.probe.choiceReasoningPlaceholder
          }
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
        />
        <SureChoice value={sure} onChange={setSure} disabled={!ready} />
      </div>
      <div className="probe__field">
        {choice === undefined ? (
          <>
            <label className="probe__label" htmlFor={answerId}>
              {t.probe.answer}
            </label>
            <input
              className="input"
              id={answerId}
              placeholder={t.probe.answerPlaceholder}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck
            />
          </>
        ) : (
          <>
            <p className="probe__label" id={chosenId}>
              {t.probe.yourChoice}
            </p>
            <p className="probe__chosen" aria-labelledby={chosenId}>
              {draft.choice.length === 0 ? (
                <span className="probe__for">{t.probe.noChoice}</span>
              ) : (
                draft.choice.map((index) => optionLetter(index)).join(", ")
              )}
            </p>
          </>
        )}
        {failed === null ? null : (
          <Notice tone="error">
            <p>{failed === "hint" ? t.probe.hintFailed : t.probe.sendFailed}</p>
          </Notice>
        )}
        <div className="probe__actions">
          <SendButton disabled={!canSend} />
          {session.working ? (
            <button
              type="button"
              className="button"
              onClick={() => stop({ payload: { id: session.id } })}
            >
              {t.session.stop}
            </button>
          ) : null}
        </div>
        {session.working ? null : (
          <div className="probe__help">
            <button type="button" className="button button--quiet" onClick={askHint}>
              {t.probe.hint}
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => void submit(true)}
            >
              {t.probe.teachMe}
            </button>
          </div>
        )}
        <p className="probe__plan">
          {t.chatgpt.usingPlan}. <ManageUsageLink />
        </p>
      </div>
    </form>
  );
}

function TalkForm({
  session,
  open,
  judgment,
  back,
  onBack,
  onSent,
  textRef,
  hidden,
}: {
  readonly session: Session;
  readonly open: Question | null;
  readonly judgment: number | null;
  readonly back: "answer" | "close" | null;
  readonly onBack: () => void;
  readonly onSent: () => void;
  readonly textRef: RefObject<HTMLTextAreaElement | null>;
  readonly hidden: boolean;
}) {
  const t = useT();
  const textId = useId();
  const hintId = useId();
  const subject = judgment !== null ? `j${judgment}` : `q${open?.number ?? 0}`;
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const text = drafts[subject] ?? "";
  const setText = (value: string) => setDrafts((all) => ({ ...all, [subject]: value }));
  const [failed, setFailed] = useState(false);
  const send = useAtomSet(sendMessageAtom, { mode: "promiseExit" });
  const stop = useAtomSet(stopSessionAtom);
  const retry = useAtomSet(retrySessionAtom);
  const canSend = !session.working && text.trim() !== "";

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const exit = await send({
      payload: {
        id: session.id,
        text,
        ...(judgment === null ? {} : { judgment }),
      },
    });
    setFailed(Exit.isFailure(exit));
    if (Exit.isSuccess(exit)) {
      setText("");
      onSent();
    }
  };

  const about =
    judgment !== null
      ? t.probe.talkAboutJudgment(judgment)
      : open !== null
        ? t.probe.talkAbout(open.number)
        : null;

  return (
    <form className="probe__box-in" hidden={hidden} onSubmit={submit}>
      <div className="probe__field">
        <div className="probe__label-row">
          <label className="probe__label" htmlFor={textId}>
            {t.probe.talkLabel}
            {about === null ? null : <span className="probe__for"> · {about}</span>}
          </label>
          {back === null ? null : (
            <button type="button" className="link-button probe__switch" onClick={onBack}>
              {back === "answer" ? t.probe.backToAnswer : t.probe.closeTalk}
            </button>
          )}
        </div>
        <p className="field__hint" id={hintId}>
          {open === null ? t.probe.talkHintNoQuestion : t.probe.talkHint}
        </p>
        <textarea
          ref={textRef}
          className="composer__text probe__reasoning"
          id={textId}
          aria-describedby={hintId}
          placeholder={t.probe.talkPlaceholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={sendsOnKey(() => void submit())}
          spellCheck
        />
      </div>
      <div className="probe__field probe__field--talk">
        {failed ? (
          <Notice tone="error">
            <p>{t.probe.messageFailed}</p>
          </Notice>
        ) : null}
        <p className="probe__plan">
          {t.chatgpt.usingPlan}. <ManageUsageLink />
        </p>
        <div className="probe__actions">
          <SendButton disabled={!canSend} />
          {session.working ? (
            <button
              type="button"
              className="button"
              onClick={() => stop({ payload: { id: session.id } })}
            >
              {t.session.stop}
            </button>
          ) : open === null && back === null ? (
            <button
              type="button"
              className="button"
              onClick={() => retry({ payload: { id: session.id } })}
            >
              {t.probe.askNext}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

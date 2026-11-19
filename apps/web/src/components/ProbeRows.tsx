import {
  answerState,
  judgmentsOf,
  type ReasoningVerdict,
  type ResultVerdict,
  type Session,
  type SessionEntry,
} from "@glose/contracts";
import { Link } from "@tanstack/react-router";
import { BookOpen, Check, Minus, TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";

import { useT } from "../i18n/I18n.tsx";
import { type AnswerDraft } from "./ProbeAnswer.tsx";
import { ChoiceOptions, optionLetter } from "./ProbeChoice.tsx";
import { AiStep, MessageText, ToolUses } from "./Session.tsx";

type Entry<T extends SessionEntry["_tag"]> = Extract<SessionEntry, { _tag: T }>;

export type Row =
  | { readonly kind: "tools"; readonly uses: ReadonlyArray<Entry<"ToolUse">> }
  | { readonly kind: "entry"; readonly entry: SessionEntry }
  | {
      readonly kind: "answer";
      readonly answer: Entry<"ProbeAnswer">;
      readonly judgment: Entry<"ProbeJudgment"> | undefined;
    }
  | { readonly kind: "judged-again"; readonly judgment: Entry<"ProbeJudgment"> };

export interface RowContext {
  readonly session: Session;
  readonly draft: AnswerDraft;
  readonly open: Entry<"ProbeQuestion"> | null;
  readonly onDispute: ((question: number) => void) | null;
}

const questionOf = (entries: ReadonlyArray<SessionEntry>, number: number) =>
  entries.find(
    (entry): entry is Entry<"ProbeQuestion"> =>
      entry._tag === "ProbeQuestion" && entry.number === number,
  );

const answerOf = (entries: ReadonlyArray<SessionEntry>, question: number) =>
  entries.find(
    (entry): entry is Entry<"ProbeAnswer"> =>
      entry._tag === "ProbeAnswer" && entry.question === question,
  );

export const rowsOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<Row> => {
  const rows: Array<Row> = [];
  for (const entry of entries) {
    const last = rows.at(-1);
    if (entry._tag === "ToolUse") {
      if (last?.kind === "tools")
        rows[rows.length - 1] = { kind: "tools", uses: [...last.uses, entry] };
      else rows.push({ kind: "tools", uses: [entry] });
    } else if (entry._tag === "ProbeAnswer") {
      rows.push({
        kind: "answer",
        answer: entry,
        judgment: judgmentsOf(entries, entry.question)[0],
      });
    } else if (entry._tag === "ProbeJudgment") {
      if (judgmentsOf(entries, entry.question)[0] !== entry) {
        rows.push({ kind: "judged-again", judgment: entry });
      }
    } else if (entry._tag !== "ProbeFinished") {
      rows.push({ kind: "entry", entry });
    }
  }
  return rows;
};

type Follow = ((node: HTMLElement | null) => void) | undefined;

export function ProbeRow({
  row,
  context,
  follow,
}: {
  readonly row: Row;
  readonly context: RowContext;
  readonly follow: Follow;
}) {
  const t = useT();
  const { session, onDispute } = context;
  const dispute = (question: number) =>
    onDispute === null || session.working ? undefined : () => onDispute(question);
  switch (row.kind) {
    case "tools":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <ToolUses uses={row.uses} />
          </div>
        </li>
      );
    case "answer":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <AnswerView
              answer={row.answer}
              question={questionOf(session.entries, row.answer.question)}
              quote={row.judgment?.quote ?? null}
            />
          </div>
          {row.judgment === undefined ? null : (
            <Judgment
              judgment={row.judgment}
              answer={row.answer}
              onDispute={dispute(row.answer.question)}
            />
          )}
        </li>
      );
    case "judged-again":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__again">{t.probe.judgedAgainOf(row.judgment.question)}</p>
          </div>
          <Judgment
            judgment={row.judgment}
            answer={answerOf(session.entries, row.judgment.question)}
            again
            onDispute={dispute(row.judgment.question)}
          />
        </li>
      );
    case "entry":
      return <EntryRow entry={row.entry} context={context} follow={follow} />;
  }
}

function EntryRow({
  entry,
  context,
  follow,
}: {
  readonly entry: SessionEntry;
  readonly context: RowContext;
  readonly follow: Follow;
}) {
  const t = useT();
  const { session, draft, open } = context;
  switch (entry._tag) {
    case "ProbeQuestion":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main probe__question">
            <p className="probe__who">
              {t.session.ai} <span className="probe__qn">{t.probe.question(entry.number)}</span>
              <span className="probe__topic">
                {entry.topic}
                {entry.again === null ? null : ` · ${t.probe.again(entry.again)}`}
                {entry.paragraph === undefined
                  ? null
                  : ` · ${t.reader.probe.onParagraph(entry.paragraph)}`}
              </span>
            </p>
            <p className="probe__ask">
              <span className="sr-only">{t.probe.questionLabel(entry.number)}: </span>
              {entry.text}
            </p>
            <ChoiceOptions
              question={entry}
              answer={answerOf(session.entries, entry.number)}
              draft={open?.number === entry.number ? draft : null}
              disabled={session.working || draft.talk !== null}
            />
          </div>
        </li>
      );
    case "ProbeHint":
      return (
        <li className="probe__row" ref={follow}>
          <div
            className="probe__main ai-text probe__hint"
            data-scope="paragraphs"
            role="group"
            aria-label={t.probe.hintGloss(entry.question)}
          >
            <p className="ai-text__gloss">{t.probe.hintGloss(entry.question)}</p>
            <MessageText text={entry.text} points={[]} onPoint={undefined} />
          </div>
        </li>
      );
    case "ProbeHintAsked":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__teach-me">{t.probe.hintAsked}</p>
          </div>
        </li>
      );
    case "ProbePlan":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__planned">
              <span className="probe__part">{t.probe.planned}</span>
              <span>{entry.topics.join(" · ")}</span>
            </p>
          </div>
        </li>
      );
    case "ProbeTaught":
      return (
        <li className="probe__row" ref={follow}>
          <div
            className="probe__main ai-text probe__taught"
            data-scope="part"
            role="group"
            aria-label={entry.kind === "gap" ? t.probe.taught(entry.question) : t.probe.intro}
          >
            <p className="ai-text__gloss">
              {entry.kind === "gap" ? t.probe.taught(entry.question) : t.probe.intro}
              <span className="probe__taught-topic"> · {entry.topic}</span>
            </p>
            <MessageText text={entry.text} points={[]} onPoint={undefined} />
            <p className="probe__check">
              <BookOpen className="probe__icon" aria-hidden="true" />
              {entry.paragraph === undefined ? (
                t.probe.checkCopy
              ) : (
                <Link
                  to="/sources/$sourceId"
                  params={{ sourceId: session.subject }}
                  search={{ text: 1, p: entry.paragraph }}
                >
                  {t.reader.margin.fromText(entry.paragraph)}
                </Link>
              )}
            </p>
          </div>
        </li>
      );
    case "ProbeFocus":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main you probe__focus">
            <p className="you__who">{t.reader.probe.focus(entry.paragraph)}</p>
            <blockquote className="probe__focus-quote">
              <Link
                to="/sources/$sourceId"
                params={{ sourceId: session.subject }}
                search={{ text: 1, p: entry.paragraph }}
              >
                {entry.text}
              </Link>
            </blockquote>
          </div>
        </li>
      );
    case "ProbeFocusDone":
      return entry.paragraph === 0 ? null : (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__covered">{t.reader.probe.focusDone(entry.paragraph)}</p>
          </div>
        </li>
      );
    case "ProbeCovered":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main">
            <p className="probe__covered">{t.probe.covered}</p>
          </div>
        </li>
      );
    case "AiMessage":
    case "Thinking":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main probe__say">
            <AiStep entry={entry} session={session} points={[]} onPoint={undefined} />
          </div>
        </li>
      );
    case "UserMessage":
      return (
        <li className="probe__row" ref={follow}>
          <div className="probe__main you">
            <p className="you__who">
              {t.probe.you(entry.question === undefined ? null : t.probe.question(entry.question))}
            </p>
            <p className="you__text">{entry.text}</p>
          </div>
        </li>
      );
    default:
      return null;
  }
}

function withQuote(text: string, quote: string | null): ReactNode {
  if (quote === null) return text;
  const at = text.indexOf(quote);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="probe__quote">{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

export function AnswerView({
  answer,
  question,
  quote,
}: {
  readonly answer: Entry<"ProbeAnswer">;
  readonly question: Entry<"ProbeQuestion"> | undefined;
  readonly quote: string | null;
}) {
  const t = useT();
  const options = question?.choice?.options ?? [];
  return (
    <div className="you probe__answer">
      {answer.teachMe ? <p className="probe__teach-me">{t.probe.teachMeAsked}</p> : null}
      {answer.reasoning === "" ? null : (
        <div>
          <p className="probe__part">{t.probe.reasoning}</p>
          <p className="you__text">{withQuote(answer.reasoning, quote)}</p>
        </div>
      )}
      {answer.answer === "" ? null : (
        <div className="probe__result">
          <p className="probe__part">{t.probe.answer}</p>
          <p className="you__text probe__result-text">
            {quote !== null && answer.reasoning.includes(quote)
              ? answer.answer
              : withQuote(answer.answer, quote)}
          </p>
        </div>
      )}
      {answer.choice === undefined ? null : (
        <div className="probe__result">
          <p className="probe__part">{t.probe.yourChoice}</p>
          <p className="you__text probe__result-text">
            {answer.choice
              .map((index) => `${optionLetter(index)} · ${options[index] ?? ""}`)
              .join("; ")}
          </p>
        </div>
      )}
      {answer.confidence === undefined ? null : (
        <p className="probe__sure-shown">
          <span className="probe__part">{t.probe.sureShort}</span>{" "}
          {t.probe.confidence[answer.confidence]}
        </p>
      )}
    </div>
  );
}

const reasoningTone = (verdict: ReasoningVerdict) =>
  verdict === "sound" ? "good" : verdict === "none" ? "none" : "gap";
const resultTone = (verdict: ResultVerdict) => (verdict === "right" ? "good" : "gap");

export function VerdictIcon({ tone }: { readonly tone: "good" | "gap" | "none" }) {
  switch (tone) {
    case "good":
      return <Check className="verdict__icon" aria-hidden="true" />;
    case "gap":
      return <TriangleAlert className="verdict__icon" aria-hidden="true" />;
    case "none":
      return <Minus className="verdict__icon" aria-hidden="true" />;
  }
}

export function Judgment({
  judgment,
  answer,
  again = false,
  onDispute,
}: {
  readonly judgment: Entry<"ProbeJudgment">;
  readonly answer: Entry<"ProbeAnswer"> | undefined;
  readonly again?: boolean;
  readonly onDispute?: (() => void) | undefined;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <aside className="probe__gloss" aria-labelledby={headingId}>
      <p className="probe__gloss-head" id={headingId}>
        {again ? t.probe.judgedAgain : t.probe.judged}
      </p>
      <div className="verdict" data-tone={reasoningTone(judgment.reasoning)}>
        <VerdictIcon tone={reasoningTone(judgment.reasoning)} />
        <div>
          <p className="verdict__name">{t.probe.reasoningVerdicts[judgment.reasoning]}</p>
          {judgment.reasoningWhy === "" ? null : (
            <p className="verdict__why">{judgment.reasoningWhy}</p>
          )}
        </div>
      </div>
      <div className="verdict" data-tone={resultTone(judgment.result)}>
        <VerdictIcon tone={resultTone(judgment.result)} />
        <div>
          <p className="verdict__name">{t.probe.resultVerdicts[judgment.result]}</p>
          {judgment.resultWhy === "" ? null : <p className="verdict__why">{judgment.resultWhy}</p>}
        </div>
      </div>
      {answerState(judgment, answer) === "unconfirmed" ? (
        <div className="verdict" data-tone="none">
          <VerdictIcon tone="none" />
          <div>
            <p className="verdict__name">{t.probe.states.unconfirmed}</p>
            <p className="verdict__why">
              {t.probe.unconfirmedWhy[answer?.confidence === "guess" ? "guess" : "bare"]}
            </p>
          </div>
        </div>
      ) : null}
      {onDispute === undefined ? null : (
        <button type="button" className="link-button probe__dispute" onClick={onDispute}>
          {t.probe.dispute}
        </button>
      )}
    </aside>
  );
}

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Rating, ReviewCard, ReviewQueue } from "@glose/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Exit from "effect/Exit";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";

import { useT } from "../i18n/I18n.tsx";
import { RECALL_KEYS, recordReviewAtom, reviewQueueAtom } from "../state/recall.ts";
import { AiText } from "./NoteText.tsx";
import { Flourish, Notice, SkeletonPanel, StorageProblem } from "./ui.tsx";

/** Cards still to review today, the one on the desk included. */
const leftToday = (counts: ReviewQueue["counts"]) => counts.new + counts.learning + counts.review;

/** At most this many leaf edges under the leaf: they say "many" or "few"; the bar says how many. */
const MAX_EDGES = 5;

/** At most this many edges under Recall's Review leaf: the leaf leads the page, not the stack. */
const MAX_START_EDGES = 3;

/**
 * Recall's way in: today's Review as a leaf on top of the desk, the Cards still due as paper
 * edges under it, and the button that opens the Review screen.
 */
export function ReviewStart() {
  const t = useT();
  const headingId = useId();
  const queue = useAtomValue(reviewQueueAtom);
  const refresh = useAtomRefresh(reviewQueueAtom);
  return AsyncResult.matchWithError(queue, {
    onInitial: () => <SkeletonPanel />,
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) => {
      const left = leftToday(value.counts);
      return (
        <section className="review-start" aria-labelledby={headingId}>
          <div className="panel review-start__leaf" data-initial="lapis">
            <h2 className="panel__title" id={headingId}>
              {t.review.title}
            </h2>
            {value.next === null ? (
              <NothingDue queue={value} onDue={refresh} />
            ) : (
              <>
                <div>
                  <p className="review-start__count">{t.review.dueToday(left)}</p>
                  <p className="review-start__counts">{t.review.counts(value.counts)}</p>
                </div>
                <Link to="/review" className="button button--primary">
                  {t.review.start}
                </Link>
              </>
            )}
          </div>
          {value.next === null ? null : <Edges count={Math.min(MAX_START_EDGES, left - 1)} />}
        </section>
      );
    },
  });
}

/** Nothing to review now: a learning step comes back later today, or the day is done. */
function NothingDue({ queue, onDue }: { readonly queue: ReviewQueue; readonly onDue: () => void }) {
  const t = useT();
  const due = queue.nextLearningDue;
  const askAgainAt = due ?? queue.nextDayStarts;
  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a timer, not state: the queue reads again when a learning step comes due or a new day starts, as nothing else would ask for it.
  useEffect(() => {
    const timer = setTimeout(onDue, Math.max(0, askAgainAt - queue.now));
    return () => clearTimeout(timer);
  }, [askAgainAt, queue.now, onDue]);
  return (
    <div>
      <p className="empty empty--lead">{due === null ? t.review.doneTitle : t.review.waitTitle}</p>
      <p className="empty">{due === null ? t.review.doneToday : t.review.nextAt(due)}</p>
    </div>
  );
}

/**
 * The Review screen: one leaf on the desk and nothing else. The Cards still to review show as
 * paper edges under it; the bar holds the count and the way out (Esc).
 */
export function ReviewScreen() {
  const t = useT();
  const navigate = useNavigate();
  const queue = useAtomValue(reviewQueueAtom);
  const stop = () => void navigate({ to: "/recall" });

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a key listener, not state: Esc leaves the Review from anywhere on the screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop]);

  const value = AsyncResult.isSuccess(queue) ? queue.value : null;
  const left = value === null ? 0 : leftToday(value.counts);

  return (
    <div className="review">
      <header className="review__bar">
        <h1 className="review__title">{t.review.title}</h1>
        <p className="review__progress">
          {value === null || left === 0 ? null : (
            <>
              <strong>{t.review.left(left)}</strong> · {t.review.counts(value.counts)}
            </>
          )}
        </p>
        {value !== null && value.next === null ? null : (
          // Once the day is done the desk offers the way back; Esc still leaves.
          <button type="button" className="button" aria-keyshortcuts="Escape" onClick={stop}>
            {t.review.stop} <Key>{t.review.keys.escape}</Key>
          </button>
        )}
      </header>
      <main className="review__desk">
        <Desk />
      </main>
    </div>
  );
}

/** The desk: the leaf to review, or what to do now that nothing is due. */
function Desk() {
  const t = useT();
  const queue = useAtomValue(reviewQueueAtom);
  const refresh = useAtomRefresh(reviewQueueAtom);
  return AsyncResult.matchWithError(queue, {
    onInitial: () => (
      <div className="review__stage">
        <div className="review__leaf review__leaf--loading" aria-busy="true">
          <span className="sr-only">{t.common.loading}</span>
        </div>
      </div>
    ),
    onError: () => <StorageProblem onRetry={refresh} />,
    onDefect: () => <StorageProblem onRetry={refresh} />,
    onSuccess: ({ value }) =>
      value.next === null ? (
        <div className="review__done">
          <div className="review__rule" aria-hidden="true">
            <Flourish />
          </div>
          <NothingDue queue={value} onDue={refresh} />
          <Link to="/recall" className="button button--primary">
            {t.review.backToRecall}
          </Link>
        </div>
      ) : (
        <div className="review__stage">
          <Leaf
            // A new leaf for each Review, and only then: the next Card starts with its answer
            // hidden, while a queue that reads again for another reason keeps the open step.
            key={`${value.next.card.file}:${value.next.reviews}`}
            item={value.next}
            now={value.now}
            edges={Math.min(MAX_EDGES, leftToday(value.counts) - 1)}
          />
        </div>
      ),
  });
}

function Edges({ count }: { readonly count: number }) {
  if (count <= 0) return null;
  return (
    <div className="review__edges" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={`edge-${index + 1}`}
          className="review__edge"
          style={{ "--depth": index + 1 } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Key({ children }: { readonly children: ReactNode }) {
  return (
    <kbd className="key" aria-hidden="true">
      {children}
    </kbd>
  );
}

/**
 * Where a Review is. The rating comes in two steps, because people press Hard when they forgot,
 * and FSRS reads Hard as a pass: first recalled or forgot, then, after a recall, how hard it was.
 */
type Step = "question" | "answer" | "recalled";

type Action = "show" | "recalled" | "back" | Rating;

/** After a recall, how it went, as FSRS's passing ratings. */
const EFFORTS = ["hard", "good", "easy"] as const satisfies ReadonlyArray<Rating>;

/** The keys each step answers to; the buttons show the same keys. */
const KEYS: Record<Step, Readonly<Record<string, Action>>> = {
  question: { " ": "show", Enter: "show" },
  answer: { "1": "again", "2": "recalled" },
  recalled: { "1": "hard", "2": "good", "3": "easy", Backspace: "back" },
};

function Leaf({
  item,
  now,
  edges,
}: {
  readonly item: ReviewCard;
  readonly now: number;
  /** Leaf edges under this one, for the Cards still to come. */
  readonly edges: number;
}) {
  const t = useT();
  const { card } = item;
  const [step, setStep] = useState<Step>("question");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const record = useAtomSet(recordReviewAtom, { mode: "promiseExit" });
  const promptId = useId();
  const questionRef = useRef<HTMLHeadingElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const shownAt = useRef(0);

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a ref, not state: the time to answer counts from when the question is on screen.
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- focus, not state: each step's question takes the focus, so a screen reader reads it and no stale button keeps it.
  useEffect(() => {
    (step === "question" ? questionRef : promptRef).current?.focus({ preventScroll: true });
  }, [step]);

  const rate = async (rating: Rating) => {
    setBusy(true);
    setFailed(false);
    const exit = await record({
      payload: {
        file: card.file,
        rating,
        answerMs: Math.max(0, Math.round(Date.now() - shownAt.current)),
      },
      reactivityKeys: RECALL_KEYS.queue,
    });
    // On success the queue reads again and the next leaf replaces this one.
    if (Exit.isFailure(exit)) {
      setBusy(false);
      setFailed(true);
    }
  };

  const act = (action: Action) => {
    if (action === "show") setStep("answer");
    else if (action === "recalled") setStep("recalled");
    else if (action === "back") setStep("answer");
    else void rate(action);
  };

  // oxlint-disable-next-line glose/no-unreasoned-state-sync -- a key listener, not state: the keys on the buttons work from anywhere on the screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (busy || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      // Space and Enter on a focused button press that button; the browser does that.
      const onControl = event.target instanceof Element && event.target.closest("button, a");
      if (onControl && (event.key === " " || event.key === "Enter")) return;
      const action = KEYS[step][event.key];
      if (action === undefined) return;
      event.preventDefault();
      act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, step, act]);

  const rateButton = (rating: Rating, key: string, label: string) => (
    <button
      key={rating}
      type="button"
      className="button"
      aria-keyshortcuts={key}
      disabled={busy}
      onClick={() => act(rating)}
    >
      <Key>{key}</Key>
      {label}
      <span className="review__when">{t.review.interval(item.due[rating] - now)}</span>
    </button>
  );

  const words: ReactNode = (
    <>
      <h2 className="review__question" ref={questionRef} tabIndex={-1}>
        {card.question}
      </h2>
      {step === "question" ? null : (
        <>
          <div className="review__rule" aria-hidden="true">
            <Flourish />
          </div>
          {card.answer === "" ? null : <p className="review__answer">{card.answer}</p>}
        </>
      )}
    </>
  );

  return (
    <>
      <div className={busy ? "review__pile review__pile--leaving" : "review__pile"}>
        <article className="review__leaf" data-ai={card.ai}>
          {card.ai ? <AiText scope="card">{words}</AiText> : words}
          <p className="review__from">
            {t.review.states[item.state]} ·{" "}
            {card.from === null ? t.cards.fromNone : `${t.cards.from} ${card.from}`}
          </p>
        </article>
        <Edges count={edges} />
      </div>
      <div className="review__ask">
        {step === "question" ? (
          <button
            type="button"
            className="button button--primary"
            aria-keyshortcuts="Space"
            onClick={() => act("show")}
          >
            <Key>{t.review.keys.space}</Key>
            {t.review.showAnswer}
          </button>
        ) : (
          <div role="group" aria-labelledby={promptId}>
            <p className="review__prompt" id={promptId} ref={promptRef} tabIndex={-1}>
              {step === "answer" ? t.review.didRecall : t.review.howWasIt}
            </p>
            <div className="review__choices">
              {step === "answer" ? (
                <>
                  {rateButton("again", "1", t.review.forgot)}
                  <button
                    key="recalled"
                    type="button"
                    className="button button--primary"
                    aria-keyshortcuts="2"
                    disabled={busy}
                    onClick={() => act("recalled")}
                  >
                    <Key>2</Key>
                    {t.review.recalled}
                  </button>
                </>
              ) : (
                <>
                  {EFFORTS.map((rating, index) =>
                    rateButton(rating, String(index + 1), t.review.efforts[rating]),
                  )}
                </>
              )}
            </div>
            {step === "recalled" ? (
              // Back is a way out of a slip, not a fourth answer: quiet, and under the answers.
              <button
                type="button"
                className="review__back"
                aria-keyshortcuts="Backspace"
                disabled={busy}
                onClick={() => act("back")}
              >
                <Key>{t.review.keys.backspace}</Key>
                {t.review.back}
              </button>
            ) : null}
          </div>
        )}
        {failed ? (
          <Notice tone="error">
            <p>{t.review.failed}</p>
          </Notice>
        ) : null}
      </div>
    </>
  );
}

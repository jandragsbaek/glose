import type {
  Card,
  Rating,
  RatingDue,
  RecallSettings,
  ReviewQueue,
  ReviewState,
} from "@glose/contracts";
import {
  DefaultScheduler,
  type DefaultSchedulerCard,
  Rating as FsrsRating,
  State,
  type StepUnit,
} from "ts-fsrs";

import type { Review } from "./reviewLog.ts";

const MODEL = "FSRS-6";

export type Scheduler = DefaultScheduler<typeof MODEL>;
type FsrsCard = DefaultSchedulerCard<typeof MODEL>;

const LEARN_AHEAD_MS = 20 * 60_000;

const FSRS_RATINGS = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
} as const satisfies Record<Rating, FsrsRating>;

export const makeScheduler = (settings: RecallSettings): Promise<Scheduler> =>
  DefaultScheduler({
    version: MODEL,
    desiredRetention: settings.desiredRetention,
    learningSteps: settings.learningSteps as ReadonlyArray<StepUnit>,
    relearningSteps: settings.relearningSteps as ReadonlyArray<StepUnit>,
    maximumInterval: settings.maximumInterval,
    enableFuzz: true,
    ...(settings.weights === null ? {} : { weights: settings.weights }),
  });

const stateOf = (card: FsrsCard): ReviewState => {
  switch (card.state) {
    case State.New:
      return "new";
    case State.Learning:
    case State.Relearning:
      return "learning";
    case State.Review:
      return "review";
  }
};

export interface Replay {
  readonly cards: Map<string, FsrsCard>;
  readonly reviews: Array<{ readonly at: number; readonly state: ReviewState }>;
}

const newCard = (scheduler: Scheduler, id: string, at: number) =>
  scheduler.newCard({ now: new Date(at), cardId: id });

export const applyReview = (scheduler: Scheduler, replay: Replay, review: Review): boolean => {
  const before = replay.cards.get(review.card) ?? newCard(scheduler, review.card, review.at);
  if (before.lastReviewAt !== null && review.at < before.lastReviewAt.getTime()) return false;
  const { card } = scheduler.review({
    card: before,
    grade: FSRS_RATINGS[review.rating],
    now: new Date(review.at),
  });
  replay.cards.set(review.card, card);
  replay.reviews.push({ at: review.at, state: stateOf(before) });
  return true;
};

export const replayReviews = (scheduler: Scheduler, reviews: ReadonlyArray<Review>): Replay => {
  const replay: Replay = { cards: new Map(), reviews: [] };
  for (const review of [...reviews].sort((a, b) => a.at - b.at)) {
    applyReview(scheduler, replay, review);
  }
  return replay;
};

export const dayStart = (now: number, hour: number): number => {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
};

const nextDayStart = (start: number): number => {
  const date = new Date(start);
  date.setDate(date.getDate() + 1);
  return date.getTime();
};

const ratingDue = (scheduler: Scheduler, card: FsrsCard, now: number): RatingDue => {
  const due: Record<string, number> = {};
  for (const item of scheduler.preview({ card, now: new Date(now) })) {
    due[item.grade] = item.card.dueAt.getTime();
  }
  return {
    again: due[FsrsRating.Again] ?? now,
    hard: due[FsrsRating.Hard] ?? now,
    good: due[FsrsRating.Good] ?? now,
    easy: due[FsrsRating.Easy] ?? now,
  };
};

export const buildQueue = (input: {
  readonly scheduler: Scheduler;
  readonly replay: Replay;
  readonly settings: RecallSettings;
  readonly cards: ReadonlyArray<Card>;
  readonly now: number;
}): ReviewQueue => {
  const { scheduler, replay, settings, cards, now } = input;
  const start = dayStart(now, settings.nextDayStartsAt);
  const end = nextDayStart(start);

  let newToday = 0;
  let reviewsToday = 0;
  for (const review of replay.reviews) {
    if (review.at < start) continue;
    if (review.state === "new") newToday += 1;
    if (review.state === "review") reviewsToday += 1;
  }

  type Due = { readonly card: Card; readonly fsrs: FsrsCard; readonly due: number };
  const learning: Array<Due> = [];
  const review: Array<Due> = [];
  const fresh: Array<Card> = [];
  for (const card of cards) {
    const fsrs = card.id === null ? undefined : replay.cards.get(card.id);
    if (fsrs === undefined) {
      fresh.push(card);
      continue;
    }
    const due = fsrs.dueAt.getTime();
    if (due >= end) continue;
    const state = stateOf(fsrs);
    if (state === "learning") learning.push({ card, fsrs, due });
    if (state === "review") review.push({ card, fsrs, due });
  }
  learning.sort((a, b) => a.due - b.due);
  review.sort((a, b) => a.due - b.due);
  const reviewsLeft = review.slice(0, Math.max(0, settings.maximumReviewsPerDay - reviewsToday));
  const newLeft = fresh.slice(0, Math.max(0, settings.newCardsPerDay - newToday));

  const toReview = (card: Card, fsrs: FsrsCard) => ({
    card,
    state: stateOf(fsrs),
    due: ratingDue(scheduler, fsrs, now),
    reviews: fsrs.reps,
  });
  const firstLearning = learning[0];
  const firstReview = reviewsLeft[0];
  const firstNew = newLeft[0];
  const next =
    firstLearning !== undefined && firstLearning.due <= now
      ? toReview(firstLearning.card, firstLearning.fsrs)
      : firstReview !== undefined
        ? toReview(firstReview.card, firstReview.fsrs)
        : firstNew !== undefined
          ? toReview(firstNew, newCard(scheduler, firstNew.id ?? firstNew.file, now))
          : firstLearning !== undefined && firstLearning.due <= now + LEARN_AHEAD_MS
            ? toReview(firstLearning.card, firstLearning.fsrs)
            : null;

  return {
    now,
    next,
    counts: { new: newLeft.length, learning: learning.length, review: reviewsLeft.length },
    nextLearningDue: next === null && firstLearning !== undefined ? firstLearning.due : null,
    nextDayStarts: end,
  };
};

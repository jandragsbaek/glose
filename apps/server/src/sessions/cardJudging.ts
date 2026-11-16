import {
  type CardProposal,
  type CardText,
  type JudgeState,
  linkKey,
  ruleChecks,
  scoreOf,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as CardChecks from "../cards/CardChecks.ts";
import * as Cards from "../cards/Cards.ts";
import { type Live, patch } from "./liveSession.ts";
import { mapProposal, proposalsOf, withJudged } from "./sessionEntries.ts";
import type { SessionStore } from "./sessionStore.ts";

export const make = Effect.fn("Sessions.makeCardJudging")(function* ({
  turns,
  save,
}: {
  readonly turns: FiberMap.FiberMap<string>;
  readonly save: SessionStore["save"];
}) {
  const cards = yield* Cards.Cards;
  const checks = yield* CardChecks.CardChecks;
  let judgeRuns = 0;

  const judgeProposals = Effect.fn("Sessions.judgeProposals")(function* (
    session: Live,
    ids: ReadonlyArray<string>,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const targets = proposalsOf(view.entries).filter((proposal) => ids.includes(proposal.id));
    if (targets.length === 0) return;
    const mark = (judgedOf: (proposal: CardProposal, index: number) => CardChecks.Judged) =>
      patch(session, (now) => ({
        ...now,
        entries: targets.reduce(
          (entries, target, index) =>
            mapProposal(entries, target.id, (proposal) =>
              proposal.question === target.question && proposal.answer === target.answer
                ? withJudged(proposal, judgedOf(proposal, index))
                : proposal,
            ),
          now.entries,
        ),
      }));
    const judged = yield* checks
      .judge(targets.map(({ question, answer }) => ({ question, answer, from: view.subject })))
      .pipe(
        Effect.onInterrupt(() =>
          mark(() => "off").pipe(Effect.andThen(save(session)), Effect.ignore),
        ),
      );
    yield* mark((_, index) => judged[index] ?? "failed");
    yield* save(session).pipe(Effect.ignore);
  });

  const startJudging = Effect.fn("Sessions.startJudging")(function* (
    session: Live,
    ids: ReadonlyArray<string>,
  ) {
    const { id } = yield* SubscriptionRef.get(session.view);
    judgeRuns += 1;
    yield* FiberMap.run(turns, `${id}:checks:${judgeRuns}`, judgeProposals(session, ids));
  });

  const propose = (session: Live) => (proposed: ReadonlyArray<CardText>) =>
    Effect.gen(function* () {
      const { subject } = yield* SubscriptionRef.get(session.view);
      const fromNote = (yield* cards.list.pipe(Effect.orElseSucceed(() => []))).filter(
        (card) => card.from !== null && linkKey(card.from) === linkKey(subject),
      );
      const ids = yield* SubscriptionRef.modify(session.view, (view) => {
        const before = proposalsOf(view.entries).length;
        const proposals = proposed.map((card, index): CardProposal => ({
          id: `p${before + index + 1}`,
          ...card,
          state: "open",
          card: null,
          score: scoreOf(
            ruleChecks(card, [...fromNote, ...proposed.filter((other) => other !== card)]),
            "pending",
          ),
        }));
        return [
          proposals.map((proposal) => proposal.id),
          { ...view, entries: [...view.entries, { _tag: "CardProposals" as const, proposals }] },
        ];
      });
      yield* startJudging(session, ids);
    });

  const pendingProposals = Effect.fn("Sessions.pendingProposals")(function* (
    session: Live,
    retry: ReadonlyArray<JudgeState>,
  ) {
    const ids = yield* SubscriptionRef.modify(session.view, (view) => {
      const chosen = proposalsOf(view.entries)
        .filter(
          (proposal) =>
            proposal.state === "open" &&
            proposal.score !== undefined &&
            retry.includes(proposal.score.judge),
        )
        .map((proposal) => proposal.id);
      const entries = chosen.reduce(
        (all, chosenId) =>
          mapProposal(all, chosenId, (proposal) =>
            proposal.score === undefined
              ? proposal
              : { ...proposal, score: { ...proposal.score, judge: "pending" } },
          ),
        view.entries,
      );
      return [chosen, { ...view, entries }];
    });
    if (ids.length > 0) yield* startJudging(session, ids);
  });

  return { propose, pendingProposals };
});

export type CardJudging = Effect.Success<ReturnType<typeof make>>;

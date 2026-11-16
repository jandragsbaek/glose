import { ProposalNotOpen } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as Semaphore from "effect/Semaphore";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as Cards from "../cards/Cards.ts";
import { type Live, type Load, patch } from "./liveSession.ts";
import { proposalsOf, quoted, setProposal } from "./sessionEntries.ts";
import type { SessionStore } from "./sessionStore.ts";

export const make = Effect.fn("Sessions.makeCardDecisions")(function* ({
  load,
  save,
  deciding,
}: {
  readonly load: Load;
  readonly save: SessionStore["save"];
  readonly deciding: Semaphore.Semaphore;
}) {
  const cards = yield* Cards.Cards;

  const openProposal = Effect.fn("Sessions.openProposal")(function* (
    session: Live,
    proposalId: string,
  ) {
    const view = yield* SubscriptionRef.get(session.view);
    const proposal = proposalsOf(view.entries).find((other) => other.id === proposalId);
    if (proposal === undefined || proposal.state !== "open") {
      return yield* new ProposalNotOpen({ id: view.id, proposal: proposalId });
    }
    return { proposal, subject: view.subject };
  });

  const keepProposal = Effect.fn("Sessions.keepProposal")(
    function* ({
      id,
      proposal: proposalId,
      question,
      answer,
    }: {
      readonly id: string;
      readonly proposal: string;
      readonly question: string;
      readonly answer: string;
    }) {
      const session = yield* load(id);
      const { proposal, subject } = yield* openProposal(session, proposalId);
      const card = yield* cards.create({ from: subject, question, answer, ai: true });
      const kept = { question, answer };
      session.decisions.push(
        question === proposal.question && answer === proposal.answer
          ? `Kept ${quoted(proposal)}.`
          : `Kept ${quoted(proposal)}, changed by the user to ${quoted(kept)}.`,
      );
      yield* patch(session, (view) => ({
        ...view,
        entries: setProposal(view.entries, proposalId, {
          ...kept,
          state: "kept",
          card: card.file,
        }),
      }));
      yield* save(session);
      return card;
    },
    (effect) => deciding.withPermit(effect),
  );

  const dropProposal = Effect.fn("Sessions.dropProposal")(
    function* ({ id, proposal: proposalId }: { readonly id: string; readonly proposal: string }) {
      const session = yield* load(id);
      const { proposal } = yield* openProposal(session, proposalId);
      session.decisions.push(`Dropped ${quoted(proposal)}.`);
      yield* patch(session, (view) => ({
        ...view,
        entries: setProposal(view.entries, proposalId, { state: "dropped" }),
      }));
      yield* save(session);
    },
    (effect) => deciding.withPermit(effect),
  );

  return { keepProposal, dropProposal };
});

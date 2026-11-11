import { RPC_METHODS } from "@glose/contracts";

import { GloseClient } from "../rpc/client.ts";
import { CARD_KEYS } from "./cards.ts";

/** A Review names this key, so the queue reads again after each one. */
export const RECALL_KEYS = { queue: ["recall"] } as const;

/** What is due now; it reads again after a Review, and when a Card changes or goes. */
export const reviewQueueAtom = GloseClient.query(RPC_METHODS.recallQueue, undefined, {
  reactivityKeys: [...RECALL_KEYS.queue, ...CARD_KEYS.cards],
});

export const recordReviewAtom = GloseClient.mutation(RPC_METHODS.recallReview);

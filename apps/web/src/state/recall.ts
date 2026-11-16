import { RPC_METHODS } from "@glose/contracts";

import { GloseClient } from "../rpc/client.ts";
import { CARD_KEYS } from "./cards.ts";

export const RECALL_KEYS = { queue: ["recall"] } as const;

export const reviewQueueAtom = GloseClient.query(RPC_METHODS.recallQueue, undefined, {
  reactivityKeys: [...RECALL_KEYS.queue, ...CARD_KEYS.cards],
});

export const recordReviewAtom = GloseClient.mutation(RPC_METHODS.recallReview);

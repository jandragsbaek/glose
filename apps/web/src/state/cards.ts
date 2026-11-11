import { RPC_METHODS } from "@glose/contracts";

import { GloseClient } from "../rpc/client.ts";

/** Mutations of Cards name this key, so every list of Cards reads again after a change. */
export const CARD_KEYS = { cards: ["cards"] } as const;

export const cardsAtom = GloseClient.query(RPC_METHODS.cardsList, undefined, {
  reactivityKeys: CARD_KEYS.cards,
});

export const createCardAtom = GloseClient.mutation(RPC_METHODS.cardsCreate);
export const updateCardAtom = GloseClient.mutation(RPC_METHODS.cardsUpdate);
export const clearAiMarkAtom = GloseClient.mutation(RPC_METHODS.cardsClearAiMark);
export const deleteCardAtom = GloseClient.mutation(RPC_METHODS.cardsDelete);

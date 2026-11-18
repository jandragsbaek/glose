import { RPC_METHODS } from "@glose/contracts";

import { GloseClient } from "../rpc/client.ts";

export const startResearchAtom = GloseClient.mutation(RPC_METHODS.researchStart);
export const keepPageAtom = GloseClient.mutation(RPC_METHODS.researchKeepPage);
export const dropPageAtom = GloseClient.mutation(RPC_METHODS.researchDropPage);
export const createNoteAtom = GloseClient.mutation(RPC_METHODS.notesCreate);

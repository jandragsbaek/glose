import { RPC_METHODS } from "@glose/contracts";
import * as Atom from "effect/reactivity/Atom";

import { GloseClient } from "../rpc/client.ts";
import { KEYS } from "./vault.ts";

export const passagesAtom = Atom.family((source: string) =>
  GloseClient.query(RPC_METHODS.passagesList, { source }, { reactivityKeys: KEYS.sources }),
);

export const createPassageAtom = GloseClient.mutation(RPC_METHODS.passagesCreate);
export const updatePassageAtom = GloseClient.mutation(RPC_METHODS.passagesUpdate);
export const deletePassageAtom = GloseClient.mutation(RPC_METHODS.passagesDelete);
export const addBookPassagesPointAtom = GloseClient.mutation(
  RPC_METHODS.sessionsAddBookPassagesPoint,
);

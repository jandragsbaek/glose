import { RPC_METHODS } from "@glose/contracts";
import * as Atom from "effect/reactivity/Atom";

import { GloseClient } from "../rpc/client.ts";

/**
 * The list reads again after any change. One project is read once per desk: its desk keeps the
 * text, so a save never reloads it under the writer's cursor.
 */
export const WRITING_KEYS = { list: ["writing"] } as const;

export const writingListAtom = GloseClient.query(RPC_METHODS.writingList, undefined, {
  reactivityKeys: WRITING_KEYS.list,
});

export const writingProjectAtom = Atom.family((id: string) =>
  GloseClient.query(RPC_METHODS.writingGet, { id }),
);

export const createWritingAtom = GloseClient.mutation(RPC_METHODS.writingCreate);
export const saveWritingAtom = GloseClient.mutation(RPC_METHODS.writingSave);
export const reviewWritingAtom = GloseClient.mutation(RPC_METHODS.writingReview);
export const publishWritingAtom = GloseClient.mutation(RPC_METHODS.writingPublish);
export const setSiteFolderAtom = GloseClient.mutation(RPC_METHODS.settingsSetSiteFolder);

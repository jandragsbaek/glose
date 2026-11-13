import { RPC_METHODS } from "@glose/contracts";
import * as Atom from "effect/reactivity/Atom";

import { GloseClient } from "../rpc/client.ts";

/** Mutations name these keys, so every query that reads the same data refetches after a change. */
export const KEYS = {
  settings: ["settings"],
  sources: ["sources"],
} as const;

export const settingsAtom = GloseClient.query(RPC_METHODS.settingsGet, undefined, {
  reactivityKeys: KEYS.settings,
});

export const sourcesAtom = GloseClient.query(RPC_METHODS.sourcesList, undefined, {
  reactivityKeys: KEYS.sources,
});

/** Every file in the Graph folder and its Links; it reads afresh when Sources change. */
export const graphAtom = GloseClient.query(RPC_METHODS.graphRead, undefined, {
  reactivityKeys: KEYS.sources,
});

export const sourceAtom = Atom.family((id: string) =>
  GloseClient.query(RPC_METHODS.sourcesGet, { id }, { reactivityKeys: KEYS.sources }),
);

export const setLanguageAtom = GloseClient.mutation(RPC_METHODS.settingsSetLanguage);
export const completeSetupAtom = GloseClient.mutation(RPC_METHODS.setupComplete);
export const checkRemoteAtom = GloseClient.mutation(RPC_METHODS.setupCheckRemote);
export const createSourceAtom = GloseClient.mutation(RPC_METHODS.sourcesCreate);
export const saveFreeTextAtom = GloseClient.mutation(RPC_METHODS.sourcesSaveFreeText);
export const chooseStartAtom = GloseClient.mutation(RPC_METHODS.sourcesChooseStart);
export const saveNoteAtom = GloseClient.mutation(RPC_METHODS.notesSave);

/** Searches the Catalog on demand; nothing is cached, since each search is typed afresh. */
export const searchCatalogAtom = GloseClient.mutation(RPC_METHODS.catalogSearch);

import {
  type AdvanceReading,
  RPC_METHODS,
  type SaveFreeText,
  type SaveNote,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Reactivity from "effect/reactivity/Reactivity";

import { GloseClient } from "../rpc/client.ts";
import { SESSION_KEYS } from "./sessions.ts";

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

export const graphAtom = GloseClient.query(RPC_METHODS.graphRead, undefined, {
  reactivityKeys: KEYS.sources,
});

export const sourceAtom = Atom.family((id: string) =>
  GloseClient.query(RPC_METHODS.sourcesGet, { id }, { reactivityKeys: KEYS.sources }),
);

export const SOURCE_RESET_KEYS = [...KEYS.sources, ...SESSION_KEYS.sessions];

export const sourceFootprintAtom = Atom.family((id: string) =>
  GloseClient.query(RPC_METHODS.sourcesFootprint, { id }, { reactivityKeys: SOURCE_RESET_KEYS }),
);

export const startSourceOverAtom = GloseClient.mutation(RPC_METHODS.sourcesStartOver);
export const deleteSourceAtom = GloseClient.mutation(RPC_METHODS.sourcesDelete);

export const setLanguageAtom = GloseClient.mutation(RPC_METHODS.settingsSetLanguage);
export const completeSetupAtom = GloseClient.mutation(RPC_METHODS.setupComplete);
export const checkRemoteAtom = GloseClient.mutation(RPC_METHODS.setupCheckRemote);
export const createSourceAtom = GloseClient.mutation(RPC_METHODS.sourcesCreate);
export const saveFreeTextAtom = GloseClient.mutation(RPC_METHODS.sourcesSaveFreeText);
export const chooseStartAtom = GloseClient.mutation(RPC_METHODS.sourcesChooseStart);
export const saveNoteAtom = GloseClient.mutation(RPC_METHODS.notesSave);
export const growNoteAtom = GloseClient.mutation(RPC_METHODS.notesGrow);
export const tendNoteAtom = GloseClient.mutation(RPC_METHODS.notesTend);
export const setPropertyAtom = GloseClient.mutation(RPC_METHODS.graphSetProperty);
export const createPersonAtom = GloseClient.mutation(RPC_METHODS.peopleCreate);
export const advanceReadingAtom = GloseClient.mutation(RPC_METHODS.sourcesAdvance);

export const writeWatchNotesAtom = GloseClient.runtime.fn<typeof SaveFreeText.Type>()(
  Effect.fnUntraced(function* (payload) {
    const client = yield* GloseClient;
    return yield* Reactivity.mutation(
      client(RPC_METHODS.sourcesSaveFreeText, payload),
      KEYS.sources,
    );
  }),
);

export const savePersonWordsAtom = GloseClient.runtime.fn<typeof SaveNote.Type>()(
  Effect.fnUntraced(function* (payload) {
    const client = yield* GloseClient;
    return yield* Reactivity.mutation(client(RPC_METHODS.notesSave, payload), KEYS.sources);
  }),
);

export const finishWatchingAtom = GloseClient.runtime.fn<typeof AdvanceReading.Type>()(
  Effect.fnUntraced(function* (payload) {
    const client = yield* GloseClient;
    return yield* Reactivity.mutation(client(RPC_METHODS.sourcesAdvance, payload), KEYS.sources);
  }),
);

export const searchCatalogAtom = GloseClient.mutation(RPC_METHODS.catalogSearch);

export const ARTICLE_KEYS = { articles: ["articles"] } as const;

export const articleAtom = Atom.family((id: string) =>
  GloseClient.query(RPC_METHODS.articlesGet, { id }, { reactivityKeys: ARTICLE_KEYS.articles }),
);

export const importTextAtom = GloseClient.mutation(RPC_METHODS.sourcesImportText);
export const addVideoAtom = GloseClient.mutation(RPC_METHODS.sourcesAddVideo);
export const setLessonVideoAtom = GloseClient.mutation(RPC_METHODS.sourcesSetLessonVideo);
export const lookupVideoAtom = GloseClient.mutation(RPC_METHODS.sourcesLookupVideo);
export const setPlaceAtom = GloseClient.mutation(RPC_METHODS.sourcesSetPlace);
export const markPassageAtom = GloseClient.mutation(RPC_METHODS.articlesMarkPassage);
export const removePassageAtom = GloseClient.mutation(RPC_METHODS.articlesRemovePassage);
export const setPassageWordsAtom = GloseClient.mutation(RPC_METHODS.articlesSetPassageWords);

export const unsavedWordsAtom = Atom.make<ReadonlyMap<string, string>>(new Map()).pipe(
  Atom.keepAlive,
);

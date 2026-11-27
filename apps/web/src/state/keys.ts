import type { GraphNode } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { useEffect } from "react";

export const KEYS = {
  settings: ["settings"],
  graph: ["graph"],
  sources: ["sources"],
  passages: ["passages"],
} as const;

export const sourceKeys = (id: string): ReadonlyArray<string> => [...KEYS.sources, `source:${id}`];

export const passageKeys = (source: string): ReadonlyArray<string> => [`passages:${source}`];

export const nodeKeys = (node: Pick<GraphNode, "id" | "kind">): ReadonlyArray<string> =>
  node.kind === "source" ? [...KEYS.graph, ...sourceKeys(node.id)] : KEYS.graph;

export const TEXT_KEYS: ReadonlyArray<string> = [...KEYS.graph, ...KEYS.passages];

export const noteTextKeys = (renamed: boolean): ReadonlyArray<string> =>
  renamed ? [...TEXT_KEYS, ...KEYS.sources, "source"] : TEXT_KEYS;

const KEYS_A_SOURCE_PAGE_DOES_NOT_SHOW: ReadonlySet<string> = new Set([
  ...KEYS.graph,
  ...KEYS.sources,
]);
let openSourcePages = 0;
let refreshOnLeave: { readonly reactivity: Reactivity.Reactivity; keys: Set<string> } | null = null;

export const writeThenRefresh = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: ReadonlyArray<string>,
) =>
  Effect.tap(
    effect,
    Effect.gen(function* () {
      const reactivity = yield* Reactivity.Reactivity;
      if (openSourcePages === 0) return reactivity.invalidateUnsafe(keys);
      refreshOnLeave ??= { reactivity, keys: new Set() };
      const unshown = keys.filter((key) => KEYS_A_SOURCE_PAGE_DOES_NOT_SHOW.has(key));
      for (const key of unshown) refreshOnLeave.keys.add(key);
      reactivity.invalidateUnsafe(keys.filter((key) => !unshown.includes(key)));
    }),
  );

export const openSourcePage = (): (() => void) => {
  openSourcePages += 1;
  return () => {
    openSourcePages -= 1;
    if (openSourcePages > 0 || refreshOnLeave === null) return;
    const { reactivity, keys } = refreshOnLeave;
    refreshOnLeave = null;
    reactivity.invalidateUnsafe([...keys]);
  };
};

// oxlint-disable-next-line jandragsbaek/no-unreasoned-state-sync -- not state: it counts the open Source pages, and the refresh left behind runs when the last one closes.
export const useSourcePageRefresh = () => useEffect(openSourcePage, []);

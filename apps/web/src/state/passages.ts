import {
  type BookPassageRef,
  type CreateBookPassage,
  RPC_METHODS,
  type UpdateBookPassage,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Reactivity from "effect/reactivity/Reactivity";

import { GloseClient } from "../rpc/client.ts";
import { KEYS, passageKeys, writeThenRefresh } from "./keys.ts";

export const passagesAtom = Atom.family((source: string) =>
  GloseClient.query(
    RPC_METHODS.passagesList,
    { source },
    { reactivityKeys: { passages: [source] } },
  ),
);

export const createPassageAtom = GloseClient.runtime.fn<typeof CreateBookPassage.Type>()(
  Effect.fnUntraced(function* (payload) {
    const client = yield* GloseClient;
    return yield* writeThenRefresh(client(RPC_METHODS.passagesCreate, payload), [
      ...passageKeys(payload.source),
      ...KEYS.graph,
    ]);
  }),
);

export const updatePassageAtom = GloseClient.runtime.fn<{
  readonly source: string;
  readonly payload: typeof UpdateBookPassage.Type;
}>()(
  Effect.fnUntraced(function* ({ source, payload }) {
    const client = yield* GloseClient;
    const passage = yield* client(RPC_METHODS.passagesUpdate, payload);
    yield* Reactivity.invalidate([
      ...passageKeys(source),
      ...(passage.usedBy.length > 0 ? KEYS.graph : []),
    ]);
    return passage;
  }),
);

export const deletePassageAtom = GloseClient.runtime.fn<{
  readonly source: string;
  readonly payload: typeof BookPassageRef.Type;
}>()(
  Effect.fnUntraced(function* ({ source, payload }) {
    const client = yield* GloseClient;
    return yield* writeThenRefresh(client(RPC_METHODS.passagesDelete, payload), [
      ...passageKeys(source),
      ...KEYS.graph,
    ]);
  }),
);

export const addBookPassagesPointAtom = GloseClient.mutation(
  RPC_METHODS.sessionsAddBookPassagesPoint,
);

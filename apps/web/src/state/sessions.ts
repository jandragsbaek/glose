import { RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";

export const SESSION_KEYS = { sessions: ["sessions"] } as const;

/** The latest Extraction Session of a Source, or null; it refetches when one starts. */
export const extractionSessionAtom = Atom.family((sourceId: string) =>
  GloseClient.query(
    RPC_METHODS.sessionsFind,
    { kind: "extraction", sourceId },
    { reactivityKeys: SESSION_KEYS.sessions },
  ),
);

/** A Session as it changes, including the AI's answer as it arrives. */
export const sessionAtom = Atom.family((id: string) =>
  GloseClient.runtime.atom(
    Stream.unwrap(
      GloseClient.use((client) => Effect.succeed(client(RPC_METHODS.sessionsWatch, { id }))),
    ),
  ),
);

export const startSessionAtom = GloseClient.mutation(RPC_METHODS.sessionsStart);
export const sendMessageAtom = GloseClient.mutation(RPC_METHODS.sessionsSend);
export const retrySessionAtom = GloseClient.mutation(RPC_METHODS.sessionsRetry);
export const stopSessionAtom = GloseClient.mutation(RPC_METHODS.sessionsStop);

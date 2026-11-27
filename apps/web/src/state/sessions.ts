import { RPC_METHODS, type WritePoint } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";
import { TEXT_KEYS, writeThenRefresh } from "./keys.ts";

export const SESSION_KEYS = { sessions: ["sessions"] } as const;

export const extractionSessionAtom = Atom.family((sourceId: string) =>
  GloseClient.query(
    RPC_METHODS.sessionsFind,
    { kind: "extraction", subject: sourceId },
    { reactivityKeys: SESSION_KEYS.sessions },
  ),
);

export const cardExtractionSessionAtom = Atom.family((noteId: string) =>
  GloseClient.query(
    RPC_METHODS.sessionsFind,
    { kind: "card-extraction", subject: noteId },
    { reactivityKeys: SESSION_KEYS.sessions },
  ),
);

export const probeSessionAtom = Atom.family((sourceId: string) =>
  GloseClient.query(
    RPC_METHODS.sessionsFind,
    { kind: "probe", subject: sourceId },
    { reactivityKeys: SESSION_KEYS.sessions },
  ),
);

export const sessionAtom = Atom.family((id: string) =>
  GloseClient.runtime.atom(
    Stream.unwrap(
      GloseClient.use((client) => Effect.succeed(client(RPC_METHODS.sessionsWatch, { id }))),
    ),
  ),
);

type SessionResult = ReturnType<typeof sessionAtom> extends Atom.Atom<infer R> ? R : never;

export const noSessionAtom: Atom.Atom<SessionResult> = Atom.make(
  AsyncResult.initial() as SessionResult,
);

export const startSessionAtom = GloseClient.mutation(RPC_METHODS.sessionsStart);
export const sendMessageAtom = GloseClient.mutation(RPC_METHODS.sessionsSend);
export const retrySessionAtom = GloseClient.mutation(RPC_METHODS.sessionsRetry);
export const stopSessionAtom = GloseClient.mutation(RPC_METHODS.sessionsStop);
export const sendPassageAtom = GloseClient.mutation(RPC_METHODS.sessionsSendPassage);
export const keepProposalAtom = GloseClient.mutation(RPC_METHODS.sessionsKeepProposal);
export const dropProposalAtom = GloseClient.mutation(RPC_METHODS.sessionsDropProposal);
export const keepPointAtom = GloseClient.mutation(RPC_METHODS.sessionsKeepPoint);
export const dropPointAtom = GloseClient.mutation(RPC_METHODS.sessionsDropPoint);
export const restorePointAtom = GloseClient.mutation(RPC_METHODS.sessionsRestorePoint);
export const addPointAtom = GloseClient.mutation(RPC_METHODS.sessionsAddPoint);
export const writePointAtom = GloseClient.runtime.fn<typeof WritePoint.Type>()(
  Effect.fnUntraced(function* (payload) {
    const client = yield* GloseClient;
    return yield* writeThenRefresh(client(RPC_METHODS.sessionsWritePoint, payload), TEXT_KEYS);
  }),
);
export const answerProbeAtom = GloseClient.mutation(RPC_METHODS.sessionsAnswerProbe);
export const askHintAtom = GloseClient.mutation(RPC_METHODS.sessionsAskHint);
export const finishProbeAtom = GloseClient.mutation(RPC_METHODS.sessionsFinishProbe);
export const goDeeperAtom = GloseClient.mutation(RPC_METHODS.sessionsGoDeeper);
export const continueProbeAtom = GloseClient.mutation(RPC_METHODS.sessionsContinueProbe);
export const addPassagePointAtom = GloseClient.mutation(RPC_METHODS.sessionsAddPassagePoint);

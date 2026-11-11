import { RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";

/** The ChatGPT connection as the server sees it; the server pushes every change. */
export const chatGptStatusAtom = GloseClient.runtime
  .atom(
    Stream.unwrap(
      GloseClient.use((client) => Effect.succeed(client(RPC_METHODS.chatgptWatch, undefined))),
    ),
  )
  .pipe(Atom.keepAlive);

export const connectChatGptAtom = GloseClient.mutation(RPC_METHODS.chatgptConnect);
export const cancelChatGptAtom = GloseClient.mutation(RPC_METHODS.chatgptCancel);
export const disconnectChatGptAtom = GloseClient.mutation(RPC_METHODS.chatgptDisconnect);
export const dismissPlanNoticeAtom = GloseClient.mutation(RPC_METHODS.chatgptDismissPlanNotice);

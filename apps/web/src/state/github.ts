import { RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";

/** The GitHub connection as the server sees it; the server pushes every change. */
export const gitHubStatusAtom = GloseClient.runtime
  .atom(
    Stream.unwrap(
      GloseClient.use((client) => Effect.succeed(client(RPC_METHODS.githubWatch, undefined))),
    ),
  )
  .pipe(Atom.keepAlive);

export const connectGitHubAtom = GloseClient.mutation(RPC_METHODS.githubConnect);
export const cancelGitHubAtom = GloseClient.mutation(RPC_METHODS.githubCancel);
export const disconnectGitHubAtom = GloseClient.mutation(RPC_METHODS.githubDisconnect);

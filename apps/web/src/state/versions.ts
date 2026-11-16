import { RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";

export const versionsStatusAtom = GloseClient.runtime
  .atom(
    Stream.unwrap(
      GloseClient.use((client) => Effect.succeed(client(RPC_METHODS.versionsWatch, undefined))),
    ),
  )
  .pipe(Atom.keepAlive);

export const endDayAtom = GloseClient.mutation(RPC_METHODS.versionsEndDay);
export const backUpToGitHubAtom = GloseClient.mutation(RPC_METHODS.versionsBackUpToGitHub);
export const setRemoteAtom = GloseClient.mutation(RPC_METHODS.versionsSetRemote);
export const removeRemoteAtom = GloseClient.mutation(RPC_METHODS.versionsRemoveRemote);

export type BackupSheetMode = "github" | "remote";
export const backupSheetAtom = Atom.make<BackupSheetMode | null>(null).pipe(Atom.keepAlive);

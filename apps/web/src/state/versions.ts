import { RPC_METHODS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { GloseClient } from "../rpc/client.ts";

/** The Graph's Versions as the server sees them; the server pushes every change. */
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

/** Which way the Backup sheet sets up a remote, or null while it is closed. */
export type BackupSheetMode = "github" | "remote";
export const backupSheetAtom = Atom.make<BackupSheetMode | null>(null).pipe(Atom.keepAlive);

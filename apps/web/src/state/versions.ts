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

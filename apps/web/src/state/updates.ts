import type { DesktopBridge, UpdatesStatus } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

declare global {
  interface Window {
    /** Set by the desktop app's preload; a browser has none. */
    readonly gloseDesktop?: DesktopBridge;
  }
}

/** The app's own updates, or nothing in a browser, where the page cannot update itself. */
export const desktopUpdates = (): DesktopBridge["updates"] | undefined =>
  window.gloseDesktop?.updates;

/** The desktop app pushes every change. In a browser the atom never gets a value. */
export const updatesStatusAtom = Atom.make(
  Stream.callback<UpdatesStatus>((queue) =>
    Effect.gen(function* () {
      const updates = desktopUpdates();
      if (updates === undefined) return yield* Effect.never;
      let changed = false;
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          updates.watch((status) => {
            changed = true;
            Queue.offerUnsafe(queue, status);
          }),
        ),
        (stop) => Effect.sync(stop),
      );
      const status = yield* Effect.promise(() => updates.status());
      // A change that came in meanwhile is newer than this answer.
      if (!changed) Queue.offerUnsafe(queue, status);
      return yield* Effect.never;
    }),
  ),
).pipe(Atom.keepAlive);

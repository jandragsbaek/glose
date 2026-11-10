import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Electron from "electron";
import { autoUpdater } from "electron-updater";

const CHECK_INTERVAL = Duration.hours(4);

const check = Effect.tryPromise(() => autoUpdater.checkForUpdates()).pipe(
  // Offline, or no release yet: the next check tries again.
  Effect.catch((error) => Effect.logWarning("Update check failed.", error.cause)),
);

/**
 * Checks the GitHub releases now and every few hours. A new version downloads in the
 * background and installs when the app quits. There is no UI for it yet.
 */
export const start = Effect.gen(function* () {
  // Only an installed app has a feed (app-update.yml) and something to replace.
  if (!Electron.app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  yield* check.pipe(Effect.repeat(Schedule.spaced(CHECK_INTERVAL)), Effect.forkScoped);
});

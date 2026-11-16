import {
  DESKTOP_IPC,
  type UpdatesOffReason,
  type UpdatesStatus,
  updatesNextStep,
} from "@glose/contracts";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Electron from "electron";
import { autoUpdater } from "electron-updater";

import * as Status from "./updatesStatus.ts";

const FIRST_CHECK_DELAY = Duration.seconds(10);
const CHECK_INTERVAL = Duration.hours(1);

const offReason = (): UpdatesOffReason | null => {
  if (!Electron.app.isPackaged) return "not-installed";
  if (process.platform === "darwin") return "unsigned-mac";
  if (process.platform === "linux" && !process.env.APPIMAGE) return "not-appimage";
  return null;
};

export const start = Effect.fn("Updates.start")(function* (appOrigin: string) {
  let status = Status.initial(Electron.app.getVersion(), offReason());
  let installing = false;

  const set = (next: UpdatesStatus) => {
    status = next;
    for (const window of Electron.BrowserWindow.getAllWindows()) {
      window.webContents.send(DESKTOP_IPC.updatesChanged, next);
    }
  };
  const update = (step: (on: Status.On) => Status.On) => {
    if (status._tag === "On") set(step(status));
  };
  const nextStep = () => (status._tag === "On" ? updatesNextStep(status) : "wait");

  const check = (requested: boolean) =>
    Effect.suspend(() => {
      if (status._tag !== "On" || status.activity !== "idle") return Effect.void;
      update(Status.checkStarted);
      return Effect.tryPromise(() => autoUpdater.checkForUpdates()).pipe(
        Effect.tap((result) =>
          Effect.sync(() =>
            update((on) =>
              Status.checked(
                on,
                result?.isUpdateAvailable === true ? result.updateInfo.version : null,
                Date.now(),
              ),
            ),
          ),
        ),
        Effect.catch((error) =>
          Effect.sync(() =>
            update(requested ? Status.checkFailed : Status.checkFailedQuietly),
          ).pipe(Effect.andThen(Effect.logWarning("Update check failed.", error.cause))),
        ),
        Effect.asVoid,
      );
    });

  const download = Effect.suspend(() => {
    if (status._tag !== "On" || nextStep() !== "download") return Effect.void;
    const version = status.availableVersion;
    if (version === null) return Effect.void;
    update(Status.downloadStarted);
    return Effect.tryPromise(() => autoUpdater.downloadUpdate()).pipe(
      Effect.tap(() => Effect.sync(() => update((on) => Status.downloaded(on, version)))),
      Effect.catch((error) =>
        Effect.sync(() => update(Status.downloadFailed)).pipe(
          Effect.andThen(Effect.logWarning("Update download failed.", error.cause)),
        ),
      ),
      Effect.asVoid,
    );
  });

  const install = Effect.sync(() => {
    if (nextStep() !== "install") return;
    installing = true;
    autoUpdater.quitAndInstall(true, true);
  }).pipe(
    Effect.catchDefect((cause) =>
      Effect.sync(() => {
        installing = false;
        update(Status.installFailed);
      }).pipe(Effect.andThen(Effect.logWarning("Update install failed.", cause))),
    ),
  );

  const fromApp = (event: Electron.IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url;
    return url !== undefined && URL.canParse(url) && new URL(url).origin === appOrigin;
  };
  const handle = (channel: string, run: () => Promise<unknown>) =>
    Electron.ipcMain.handle(channel, (event) =>
      fromApp(event) ? run() : Promise.reject(new Error("Not from the Glose window.")),
    );
  handle(DESKTOP_IPC.updatesStatus, () => Promise.resolve(status));
  handle(DESKTOP_IPC.updatesCheck, () => Effect.runPromise(check(true)));
  handle(DESKTOP_IPC.updatesDownload, () => Effect.runPromise(download));
  handle(DESKTOP_IPC.updatesInstall, () => Effect.runPromise(install));

  if (status._tag === "Off") return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("download-progress", (progress) =>
    update((on) => Status.downloadProgressed(on, progress.percent)),
  );
  autoUpdater.on("error", (error) => {
    if (!installing) return;
    installing = false;
    update(Status.installFailed);
    Effect.runFork(Effect.logWarning("Update install failed.", error));
  });

  yield* Effect.sleep(FIRST_CHECK_DELAY).pipe(
    Effect.andThen(check(false).pipe(Effect.repeat(Schedule.spaced(CHECK_INTERVAL)))),
    Effect.forkScoped,
  );
});

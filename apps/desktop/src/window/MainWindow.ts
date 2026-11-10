import * as Effect from "effect/Effect";
import * as Electron from "electron";

const isWebUrl = (url: string) => url.startsWith("https://") || url.startsWith("http://");

/**
 * Opens the app window on `url`. Size, title bar and menu are Electron's defaults:
 * no design decision has been made yet.
 */
const create = (url: string) => {
  const appOrigin = new URL(url).origin;
  const window = new Electron.BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The window only ever shows the app. Any other link opens in the user's browser.
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isWebUrl(target)) void Electron.shell.openExternal(target);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, target) => {
    if (new URL(target).origin === appOrigin) return;
    event.preventDefault();
    if (isWebUrl(target)) void Electron.shell.openExternal(target);
  });

  void window.loadURL(url);
  return window;
};

/** Opens the window and keeps the platform's conventions for closing and reopening it. */
export const open = Effect.fn("MainWindow.open")(function* (url: string) {
  yield* Effect.sync(() => {
    create(url);

    Electron.app.on("second-instance", () => {
      const [window] = Electron.BrowserWindow.getAllWindows();
      if (!window) return;
      if (window.isMinimized()) window.restore();
      window.focus();
    });
    // macOS keeps an app running without windows and reopens one from the dock.
    Electron.app.on("activate", () => {
      if (Electron.BrowserWindow.getAllWindows().length === 0) create(url);
    });
    Electron.app.on("window-all-closed", () => {
      if (process.platform !== "darwin") Electron.app.quit();
    });
  });
});

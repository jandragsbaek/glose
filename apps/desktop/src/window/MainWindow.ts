import * as Effect from "effect/Effect";
import * as Electron from "electron";
import * as NodePath from "node:path";

const isWebUrl = (url: string) => url.startsWith("https://") || url.startsWith("http://");

/**
 * Development builds have no View menu, so the window itself listens for the usual reload and
 * DevTools shortcuts: Ctrl/Cmd+R, Ctrl/Cmd+Shift+R, F5, Ctrl+Shift+I (Cmd+Option+I on macOS)
 * and F12. Packaged builds have none of them.
 */
const addDevShortcuts = (window: Electron.BrowserWindow) => {
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const mod = process.platform === "darwin" ? input.meta : input.control;
    const devToolsChord =
      process.platform === "darwin" ? input.meta && input.alt : input.control && input.shift;

    if (input.code === "F12" || (devToolsChord && input.code === "KeyI")) {
      window.webContents.toggleDevTools();
    } else if (mod && input.shift && input.code === "KeyR") {
      window.webContents.reloadIgnoringCache();
    } else if (input.code === "F5" || (mod && input.code === "KeyR")) {
      window.webContents.reload();
    } else {
      return;
    }
    event.preventDefault();
  });
};

/**
 * Opens the app window on `url`. Size and title bar are Electron's defaults: no design
 * decision has been made yet.
 */
const create = (url: string) => {
  const appOrigin = new URL(url).origin;
  const window = new Electron.BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Built next to main.cjs (see vite.config.ts).
      preload: NodePath.join(__dirname, "preload.cjs"),
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

  if (!Electron.app.isPackaged) addDevShortcuts(window);

  void window.loadURL(url);
  return window;
};

/**
 * Windows and Linux get no menu bar in the window. macOS always shows a menu bar at the top
 * of the screen, and its copy, paste, undo, hide and quit shortcuts only work through menu
 * items, so it keeps the standard app, Edit and Window menus.
 */
const setMenu = () => {
  const menu =
    process.platform === "darwin"
      ? Electron.Menu.buildFromTemplate([
          { role: "appMenu" },
          { role: "editMenu" },
          { role: "windowMenu" },
        ])
      : null;
  Electron.Menu.setApplicationMenu(menu);
};

/** Opens the window and keeps the platform's conventions for closing and reopening it. */
export const open = Effect.fn("MainWindow.open")(function* (url: string) {
  yield* Effect.sync(() => {
    setMenu();
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

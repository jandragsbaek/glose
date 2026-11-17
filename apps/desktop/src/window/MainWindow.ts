import * as Effect from "effect/Effect";
import * as Electron from "electron";
import * as NodePath from "node:path";

import * as Appearance from "./Appearance.ts";

const isWebUrl = (url: string) => url.startsWith("https://") || url.startsWith("http://");

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

const create = (url: string) => {
  const appOrigin = new URL(url).origin;
  const background = Appearance.restore();
  const window = new Electron.BrowserWindow({
    ...(background === undefined ? {} : { backgroundColor: background }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: NodePath.join(__dirname, "preload.cjs"),
    },
  });

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

export const open = Effect.fn("MainWindow.open")(function* (url: string) {
  yield* Effect.sync(() => {
    setMenu();
    Appearance.follow(new URL(url).origin);
    create(url);

    Electron.app.on("second-instance", () => {
      const [window] = Electron.BrowserWindow.getAllWindows();
      if (!window) return;
      if (window.isMinimized()) window.restore();
      window.focus();
    });
    Electron.app.on("activate", () => {
      if (Electron.BrowserWindow.getAllWindows().length === 0) create(url);
    });
    Electron.app.on("window-all-closed", () => {
      if (process.platform !== "darwin") Electron.app.quit();
    });
  });
});

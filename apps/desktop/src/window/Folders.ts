import { DESKTOP_IPC } from "@glose/contracts/desktop";
import * as Electron from "electron";
import * as NodePath from "node:path";

const text = (request: unknown, key: string): string | undefined => {
  if (typeof request !== "object" || request === null || !(key in request)) return undefined;
  const value: unknown = Reflect.get(request, key);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

export const answer = (appOrigin: string) => {
  Electron.ipcMain.handle(DESKTOP_IPC.foldersChoose, async (event, request: unknown) => {
    const url = event.senderFrame?.url;
    if (url === undefined || !URL.canParse(url) || new URL(url).origin !== appOrigin) {
      return Promise.reject(new Error("Not from the Glose window."));
    }
    const startIn = text(request, "startIn");
    const title = text(request, "title");
    const button = text(request, "button");
    const options: Electron.OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"],
      ...(startIn !== undefined && NodePath.isAbsolute(startIn) ? { defaultPath: startIn } : {}),
      ...(title === undefined ? {} : { title, message: title }),
      ...(button === undefined ? {} : { buttonLabel: button }),
    };
    const window = Electron.BrowserWindow.fromWebContents(event.sender);
    const result =
      window === null
        ? await Electron.dialog.showOpenDialog(options)
        : await Electron.dialog.showOpenDialog(window, options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
};

import type { AppearanceGrounds, AppearanceMode } from "@glose/contracts/desktop";
import { DESKTOP_IPC } from "@glose/contracts/desktop";
import * as Electron from "electron";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

interface Remembered {
  readonly mode: AppearanceMode;
  readonly grounds: AppearanceGrounds | null;
}

const COLOR = /^#[0-9a-f]{6}$/i;

const isMode = (value: unknown): value is AppearanceMode =>
  value === "light" || value === "dark" || value === "system";

const isGrounds = (value: unknown): value is AppearanceGrounds =>
  typeof value === "object" &&
  value !== null &&
  "light" in value &&
  "dark" in value &&
  typeof value.light === "string" &&
  typeof value.dark === "string" &&
  COLOR.test(value.light) &&
  COLOR.test(value.dark);

const file = () => NodePath.join(Electron.app.getPath("userData"), "appearance.json");

const read = (): Remembered | null => {
  try {
    const value: unknown = JSON.parse(NodeFS.readFileSync(file(), "utf8"));
    if (typeof value !== "object" || value === null || !("mode" in value)) return null;
    if (!isMode(value.mode)) return null;
    return {
      mode: value.mode,
      grounds: "grounds" in value && isGrounds(value.grounds) ? value.grounds : null,
    };
  } catch {
    return null;
  }
};

let remembered: Remembered | null = null;

const ground = () => {
  const grounds = remembered?.grounds;
  if (grounds === undefined || grounds === null) return undefined;
  return Electron.nativeTheme.shouldUseDarkColors ? grounds.dark : grounds.light;
};

const paintWindows = () => {
  const color = ground();
  if (color === undefined) return;
  for (const window of Electron.BrowserWindow.getAllWindows()) window.setBackgroundColor(color);
};

export const restore = (): string | undefined => {
  remembered ??= read();
  if (remembered !== null) Electron.nativeTheme.themeSource = remembered.mode;
  return ground();
};

export const follow = (appOrigin: string) => {
  remembered ??= read();
  Electron.nativeTheme.on("updated", paintWindows);
  Electron.ipcMain.handle(DESKTOP_IPC.appearanceSet, (event, mode: unknown, grounds: unknown) => {
    const url = event.senderFrame?.url;
    if (url === undefined || !URL.canParse(url) || new URL(url).origin !== appOrigin) {
      return Promise.reject(new Error("Not from the Glose window."));
    }
    if (!isMode(mode)) return Electron.nativeTheme.shouldUseDarkColors;
    const next: Remembered = {
      mode,
      grounds: isGrounds(grounds) ? grounds : (remembered?.grounds ?? null),
    };
    const changed =
      next.mode !== remembered?.mode ||
      next.grounds?.light !== remembered.grounds?.light ||
      next.grounds?.dark !== remembered.grounds?.dark;
    remembered = next;
    Electron.nativeTheme.themeSource = mode;
    paintWindows();
    if (changed) NodeFS.promises.writeFile(file(), JSON.stringify(next)).catch(() => undefined);
    return Electron.nativeTheme.shouldUseDarkColors;
  });
};

import type { AppearanceMode } from "@glose/contracts/desktop";
import { DESKTOP_IPC } from "@glose/contracts/desktop";
import * as Electron from "electron";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

interface Remembered {
  readonly mode: AppearanceMode;
  readonly background: string;
}

const MODES: ReadonlyArray<string> = ["light", "dark", "system"];
const COLOR = /^#[0-9a-f]{6}$/i;

const isRemembered = (value: unknown): value is Remembered =>
  typeof value === "object" &&
  value !== null &&
  "mode" in value &&
  "background" in value &&
  typeof value.mode === "string" &&
  MODES.includes(value.mode) &&
  typeof value.background === "string" &&
  COLOR.test(value.background);

const file = () => NodePath.join(Electron.app.getPath("userData"), "appearance.json");

const read = (): Remembered | null => {
  try {
    const value: unknown = JSON.parse(NodeFS.readFileSync(file(), "utf8"));
    return isRemembered(value) ? value : null;
  } catch {
    return null;
  }
};

const apply = ({ mode, background }: Remembered) => {
  Electron.nativeTheme.themeSource = mode;
  for (const window of Electron.BrowserWindow.getAllWindows()) {
    window.setBackgroundColor(background);
  }
};

export const restore = (): string | undefined => {
  const remembered = read();
  if (remembered === null) return undefined;
  Electron.nativeTheme.themeSource = remembered.mode;
  return remembered.background;
};

export const follow = (appOrigin: string) => {
  let last = read();
  Electron.ipcMain.on(DESKTOP_IPC.appearanceSet, (event, mode: unknown, background: unknown) => {
    const url = event.senderFrame?.url;
    if (url === undefined || !URL.canParse(url) || new URL(url).origin !== appOrigin) return;
    const next = { mode, background };
    if (!isRemembered(next)) return;
    apply(next);
    if (last?.mode === next.mode && last.background === next.background) return;
    last = next;
    NodeFS.promises.writeFile(file(), JSON.stringify(next)).catch(() => undefined);
  });
};

// No runtime import from effect here: the sandboxed preload bundles this file.
import type { UpdatesStatus } from "./updates.ts";

/**
 * What the desktop app gives its window, as `window.gloseDesktop`. The web app in a browser
 * has no desktop bridge.
 */
export interface DesktopBridge {
  readonly updates: {
    readonly status: () => Promise<UpdatesStatus>;
    /** Calls `listener` on every change; returns a function that stops it. */
    readonly watch: (listener: (status: UpdatesStatus) => void) => () => void;
    readonly check: () => Promise<void>;
    readonly download: () => Promise<void>;
    /** Quits Glose, installs the downloaded release and opens Glose again. */
    readonly install: () => Promise<void>;
  };
}

/** Names of the IPC channels between the desktop app and its window. */
export const DESKTOP_IPC = {
  updatesStatus: "glose:updates:status",
  updatesChanged: "glose:updates:changed",
  updatesCheck: "glose:updates:check",
  updatesDownload: "glose:updates:download",
  updatesInstall: "glose:updates:install",
} as const;

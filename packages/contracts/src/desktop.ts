import type { UpdatesStatus } from "./updates.ts";

export interface DesktopBridge {
  readonly updates: {
    readonly status: () => Promise<UpdatesStatus>;
    readonly watch: (listener: (status: UpdatesStatus) => void) => () => void;
    readonly check: () => Promise<void>;
    readonly download: () => Promise<void>;
    readonly install: () => Promise<void>;
  };
}

export const DESKTOP_IPC = {
  updatesStatus: "glose:updates:status",
  updatesChanged: "glose:updates:changed",
  updatesCheck: "glose:updates:check",
  updatesDownload: "glose:updates:download",
  updatesInstall: "glose:updates:install",
} as const;

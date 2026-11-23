import type { UpdatesStatus } from "./updates.ts";

export type AppearanceMode = "light" | "dark" | "system";

export interface AppearanceGrounds {
  readonly light: string;
  readonly dark: string;
}

export interface FolderRequest {
  readonly startIn: string;
  readonly title: string;
  readonly button: string;
}

export interface DesktopBridge {
  readonly appearance: {
    readonly set: (mode: AppearanceMode, grounds: AppearanceGrounds) => Promise<boolean>;
  };
  readonly folders: {
    readonly choose: (request: FolderRequest) => Promise<string | null>;
  };
  readonly updates: {
    readonly status: () => Promise<UpdatesStatus>;
    readonly watch: (listener: (status: UpdatesStatus) => void) => () => void;
    readonly check: () => Promise<void>;
    readonly download: () => Promise<void>;
    readonly install: () => Promise<void>;
  };
}

export const DESKTOP_IPC = {
  appearanceSet: "glose:appearance:set",
  foldersChoose: "glose:folders:choose",
  updatesStatus: "glose:updates:status",
  updatesChanged: "glose:updates:changed",
  updatesCheck: "glose:updates:check",
  updatesDownload: "glose:updates:download",
  updatesInstall: "glose:updates:install",
} as const;

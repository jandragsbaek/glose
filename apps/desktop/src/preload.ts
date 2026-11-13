import type { UpdatesStatus } from "@glose/contracts";
import { DESKTOP_IPC, type DesktopBridge } from "@glose/contracts/desktop";
import * as Electron from "electron";

/** What the window may ask of the desktop app. The main process checks each request. */
const bridge: DesktopBridge = {
  updates: {
    status: () => Electron.ipcRenderer.invoke(DESKTOP_IPC.updatesStatus),
    watch: (listener) => {
      const onChange = (_event: Electron.IpcRendererEvent, status: UpdatesStatus) =>
        listener(status);
      Electron.ipcRenderer.on(DESKTOP_IPC.updatesChanged, onChange);
      return () => {
        Electron.ipcRenderer.removeListener(DESKTOP_IPC.updatesChanged, onChange);
      };
    },
    check: () => Electron.ipcRenderer.invoke(DESKTOP_IPC.updatesCheck),
    download: () => Electron.ipcRenderer.invoke(DESKTOP_IPC.updatesDownload),
    install: () => Electron.ipcRenderer.invoke(DESKTOP_IPC.updatesInstall),
  },
};

Electron.contextBridge.exposeInMainWorld("gloseDesktop", bridge);

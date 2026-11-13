import type { UpdatesOffReason, UpdatesStatus } from "@glose/contracts";

export type On = Extract<UpdatesStatus, { _tag: "On" }>;

export const initial = (
  currentVersion: string,
  offReason: UpdatesOffReason | null,
): UpdatesStatus =>
  offReason === null
    ? {
        _tag: "On",
        currentVersion,
        activity: "idle",
        availableVersion: null,
        downloadedVersion: null,
        downloadPercent: null,
        checkedAt: null,
        problem: null,
      }
    : { _tag: "Off", reason: offReason, currentVersion };

export const checkStarted = (status: On): On => ({ ...status, activity: "checking" });

/** `version` is the newest release when it is newer than this copy, else null. */
export const checked = (status: On, version: string | null, at: number): On => ({
  ...status,
  activity: "idle",
  availableVersion: version,
  checkedAt: at,
  problem: null,
});

/** A check the user asked for failed: the bar says so, and a click tries again. */
export const checkFailed = (status: On): On => ({
  ...status,
  activity: "idle",
  problem: "check-failed",
});

/** An hourly check failed (offline, most likely): nothing changes, the next hour tries again. */
export const checkFailedQuietly = (status: On): On => ({ ...status, activity: "idle" });

export const downloadStarted = (status: On): On => ({
  ...status,
  activity: "downloading",
  downloadPercent: 0,
  problem: null,
});

export const downloadProgressed = (status: On, percent: number): On =>
  status.activity === "downloading"
    ? { ...status, downloadPercent: Math.min(100, Math.max(0, percent)) }
    : status;

export const downloaded = (status: On, version: string): On => ({
  ...status,
  activity: "idle",
  downloadedVersion: version,
  downloadPercent: null,
  problem: null,
});

export const downloadFailed = (status: On): On => ({
  ...status,
  activity: "idle",
  downloadPercent: null,
  problem: "download-failed",
});

export const installFailed = (status: On): On => ({ ...status, problem: "install-failed" });

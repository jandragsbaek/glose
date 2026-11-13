import { updatesNextStep } from "@glose/contracts";
import { assert, describe, it } from "@effect/vitest";

import * as Status from "./updatesStatus.ts";

const fresh = () => {
  const status = Status.initial("0.1.0-nightly.20261112.40", null);
  if (status._tag !== "On") throw new Error("Expected updates to be on.");
  return status;
};

describe("an update, step by step", () => {
  it("offers a check while nothing newer is known", () => {
    assert.strictEqual(updatesNextStep(Status.checked(fresh(), null, 1)), "check");
  });

  it("offers the download, then the restart", () => {
    const found = Status.checked(fresh(), "0.1.0-nightly.20261113.42", 1);
    assert.strictEqual(updatesNextStep(found), "download");
    const loading = Status.downloadProgressed(Status.downloadStarted(found), 40);
    assert.strictEqual(updatesNextStep(loading), "wait");
    assert.strictEqual(loading.downloadPercent, 40);
    assert.strictEqual(
      updatesNextStep(Status.downloaded(loading, "0.1.0-nightly.20261113.42")),
      "install",
    );
  });

  it("still offers the restart when the next check finds the downloaded release", () => {
    const ready = Status.downloaded(fresh(), "0.1.0-nightly.20261113.42");
    assert.strictEqual(
      updatesNextStep(Status.checked(ready, "0.1.0-nightly.20261113.42", 2)),
      "install",
    );
  });

  it("offers a newer release over one already downloaded", () => {
    const ready = Status.downloaded(fresh(), "0.1.0-nightly.20261113.42");
    assert.strictEqual(
      updatesNextStep(Status.checked(ready, "0.1.0-nightly.20261114.43", 2)),
      "download",
    );
  });

  it("offers the download again after it failed", () => {
    const found = Status.checked(fresh(), "0.1.0-nightly.20261113.42", 1);
    const failed = Status.downloadFailed(Status.downloadStarted(found));
    assert.strictEqual(failed.problem, "download-failed");
    assert.strictEqual(updatesNextStep(failed), "download");
  });

  it("keeps a found release when a later check fails", () => {
    const found = Status.checked(fresh(), "0.1.0-nightly.20261113.42", 1);
    const failed = Status.checkFailed(Status.checkStarted(found));
    assert.strictEqual(failed.problem, "check-failed");
    assert.strictEqual(updatesNextStep(failed), "download");
  });

  it("shows no problem when an hourly check fails, and keeps the last check's time", () => {
    const upToDate = Status.checked(fresh(), null, 1);
    const failed = Status.checkFailedQuietly(Status.checkStarted(upToDate));
    assert.strictEqual(failed.problem, null);
    assert.strictEqual(failed.checkedAt, 1);
    assert.strictEqual(updatesNextStep(failed), "check");
  });
});

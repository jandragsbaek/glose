import { assert, describe, it } from "@effect/vitest";

import { isPublicAddress, webUrl } from "./WebPages.ts";

describe("isPublicAddress", () => {
  it("refuses this computer and its own networks", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.10",
      "169.254.169.254",
      "100.78.30.45",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      assert.isFalse(isPublicAddress(address), address);
    }
  });

  it("allows addresses on the open internet", () => {
    for (const address of ["93.184.215.14", "2606:4700::6810:84e5", "::ffff:8.8.8.8"]) {
      assert.isTrue(isPublicAddress(address), address);
    }
  });
});

describe("webUrl", () => {
  it("reads only http and https pages without a sign-in in the address", () => {
    assert.strictEqual(webUrl(" https://a.example/x#part ")?.href, "https://a.example/x");
    assert.isNull(webUrl("file:///etc/passwd"));
    assert.isNull(webUrl("https://user:secret@a.example/"));
    assert.isNull(webUrl("not an address"));
  });
});

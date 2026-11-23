import { assert, describe, it } from "@effect/vitest";

import { isFullScreenKey } from "./fullScreenKey.ts";

describe("full screen from the keyboard", () => {
  it("takes F11 on Windows and Linux, where the window has no menu for it", () => {
    assert.isTrue(isFullScreenKey({ type: "keyDown", code: "F11", isAutoRepeat: false }, "win32"));
    assert.isTrue(isFullScreenKey({ type: "keyDown", code: "F11", isAutoRepeat: false }, "linux"));
  });

  it("leaves F11 to macOS, which shows the desktop on it and has its own full screen", () => {
    assert.isFalse(
      isFullScreenKey({ type: "keyDown", code: "F11", isAutoRepeat: false }, "darwin"),
    );
  });

  it("acts once per press", () => {
    assert.isFalse(isFullScreenKey({ type: "keyUp", code: "F11", isAutoRepeat: false }, "win32"));
    assert.isFalse(isFullScreenKey({ type: "keyDown", code: "F11", isAutoRepeat: true }, "win32"));
  });
});

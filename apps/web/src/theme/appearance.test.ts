import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const KEY = "glose:appearance";

const browser = (
  options: {
    readonly refuseWrites?: boolean;
    readonly stored?: string;
    readonly desktopDark?: boolean;
  } = {},
) => {
  const stored = new Map<string, string>(
    options.stored === undefined ? [] : [[KEY, options.stored]],
  );
  const mediaListeners: Array<() => void> = [];
  const pending: Array<() => void> = [];
  const root = { dataset: {} as Record<string, string> };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (options.refuseWrites === true) throw new Error("QuotaExceededError");
        stored.set(key, value);
      },
    },
    matchMedia: () => ({
      matches: false,
      addEventListener: (_type: string, listener: () => void) => mediaListeners.push(listener),
    }),
    addEventListener: () => undefined,
    ...(options.desktopDark === undefined
      ? {}
      : { gloseDesktop: { appearance: { set: () => Promise.resolve(options.desktopDark) } } }),
  });
  vi.stubGlobal("document", {
    documentElement: root,
    body: { append: () => undefined },
    createElement: () => ({ dataset: {}, remove: () => undefined }),
    startViewTransition: (change: () => void) => {
      pending.push(change);
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
    },
  });
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "#0d0f17" }));
  return {
    stored,
    root,
    transitions: () => pending.length,
    changeComputerMode: () => {
      for (const listener of mediaListeners) listener();
    },
    finishTransitions: () => {
      for (const change of pending.splice(0)) change();
    },
  };
};

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("chooseAppearance", () => {
  it("keeps every choice made while an earlier crossfade is still running", async () => {
    const page = browser();
    const { chooseAppearance } = await import("./appearance.ts");

    void chooseAppearance({ mode: "light" });
    void chooseAppearance({ mode: "dark" });
    void chooseAppearance({ theme: "sepia" });
    await settle();
    page.finishTransitions();

    expect(JSON.parse(page.stored.get(KEY) ?? "null")).toEqual({ theme: "sepia", mode: "dark" });
    expect(page.root.dataset).toEqual({ theme: "sepia", appearance: "dark" });
  });

  it("still changes the page when storage refuses the choice", async () => {
    const page = browser({ refuseWrites: true });
    const { chooseAppearance } = await import("./appearance.ts");

    void chooseAppearance({ theme: "murex", mode: "dark" });
    await settle();
    page.finishTransitions();

    expect(page.root.dataset).toEqual({ theme: "murex", appearance: "dark" });
  });

  it("crossfades once when the desktop answer and the computer's mode change both arrive", async () => {
    const page = browser({
      stored: JSON.stringify({ theme: "lapis", mode: "dark" }),
      desktopDark: false,
    });
    const { chooseAppearance } = await import("./appearance.ts");

    await chooseAppearance({ mode: "system" });
    page.changeComputerMode();

    expect(page.transitions()).toBe(1);
    page.finishTransitions();
    expect(page.root.dataset).toEqual({ theme: "lapis", appearance: "light" });
  });
});

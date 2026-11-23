import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const KEY = "glose:writing-text";

const load = async (stored?: string) => {
  const saved = new Map<string, string>(stored === undefined ? [] : [[KEY, stored]]);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
    addEventListener: () => undefined,
  });
  vi.resetModules();
  const text = await import("./writingText.ts");
  return { ...text, saved };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the text in Write", () => {
  it("keeps today's desk until the writer chooses another text", async () => {
    const { DEFAULT_TEXT, foldOf, leafWidthOf } = await load();
    const leaf = leafWidthOf(DEFAULT_TEXT);
    expect(leaf).toBe(680);
    expect(foldOf(1104, leaf)).toBe("none");
    expect(foldOf(1103, leaf)).toBe("left");
    expect(foldOf(864, leaf)).toBe("left");
    expect(foldOf(863, leaf)).toBe("both");
  });

  it("folds the margins sooner when a larger, wider text needs the room", async () => {
    const { foldOf, leafWidthOf } = await load();
    const leaf = leafWidthOf({ face: "typewriter", size: 22, width: "wide" });
    expect(leaf).toBeGreaterThan(680);
    expect(foldOf(1104, leaf)).toBe("both");
  });

  it("keeps the line length in characters when only the size changes", async () => {
    const { charactersOf } = await load();
    expect(charactersOf({ face: "book", size: 15, width: "standard" })).toBe(
      charactersOf({ face: "book", size: 22, width: "standard" }),
    );
  });

  it("remembers a choice for this computer", async () => {
    const { chooseWritingText, saved } = await load();
    chooseWritingText({ face: "book", size: 20 });
    expect(JSON.parse(saved.get(KEY) ?? "null")).toEqual({
      face: "book",
      size: 20,
      width: "standard",
    });
  });

  it("keeps the rest of a stored choice when one value is unknown", async () => {
    const { chooseWritingText, saved } = await load(
      JSON.stringify({ face: "comic", size: 20, width: "wide" }),
    );
    chooseWritingText({});
    expect(JSON.parse(saved.get(KEY) ?? "null")).toEqual({
      face: "plain",
      size: 20,
      width: "wide",
    });
  });
});

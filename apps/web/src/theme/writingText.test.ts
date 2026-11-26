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
      overview: false,
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
      overview: false,
    });
  });

  it("keeps the Overview off until the writer turns it on, then remembers it", async () => {
    const before = await load(JSON.stringify({ face: "book", size: 18, width: "wide" }));
    before.chooseWritingText({});
    expect(JSON.parse(before.saved.get(KEY) ?? "null")).toMatchObject({ overview: false });

    const after = await load(
      JSON.stringify({ face: "book", size: 18, width: "wide", overview: true }),
    );
    after.chooseWritingText({});
    expect(JSON.parse(after.saved.get(KEY) ?? "null")).toMatchObject({
      face: "book",
      overview: true,
    });
  });

  it("shows the Overview only beside both margins, so it never folds one", async () => {
    const { DEFAULT_TEXT, foldOf, leafWidthOf, overviewFits } = await load();
    const leaf = leafWidthOf(DEFAULT_TEXT);
    const desk1280 = 1280 - 96 - 17;
    expect(overviewFits(desk1280, leaf)).toBe(true);
    expect(foldOf(desk1280, leaf)).toBe("none");
    expect(overviewFits(1161, leaf)).toBe(false);
    const wide = leafWidthOf({ face: "typewriter", size: 22, width: "wide" });
    expect(overviewFits(desk1280, wide)).toBe(false);
  });
});

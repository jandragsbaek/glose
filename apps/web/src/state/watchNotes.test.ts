import { afterEach, assert, describe, it, vi } from "@effect/vitest";

import { draftOf, finishNotes, keepDraft, savedOver, saveNotes } from "./watchNotes.ts";

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

const reloaded = async () => {
  vi.resetModules();
  return import("./watchNotes.ts");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const later = () => {
  let open: (revision: number | false) => void = () => undefined;
  const promise = new Promise<number | false>((resolve) => {
    open = resolve;
  });
  return { promise, open };
};

describe("Watch notes saved from two views", () => {
  it("writes the newest words after a slow save, then finishes without writing again", async () => {
    const written: Array<string> = [];
    const slow = later();
    const write = (finish: boolean) => async (text: string) => {
      written.push(`${finish ? "finish" : "save"}: ${text}`);
      return written.length === 1 ? slow.promise : 2;
    };

    keepDraft("video", "A", "");
    const first = saveNotes("video", write(false));
    await Promise.resolve();
    keepDraft("video", "A and B, typed in the other view", "");
    const second = saveNotes("video", write(false));
    const finished = finishNotes("video", write(true), async () => {
      written.push("advance");
      return true;
    });
    keepDraft("video", "A and B and C", "");
    slow.open(1);
    await Promise.all([first, second, finished]);

    assert.deepStrictEqual(written, ["save: A", "save: A and B and C", "advance"]);
    assert.isTrue(await finished);
    assert.isUndefined(draftOf("video"));
  });

  it("finishes with no words to write by only moving the step on, so the file keeps lines added in another editor", async () => {
    const steps: Array<string> = [];

    const ok = await finishNotes(
      "obsidian",
      async () => {
        steps.push("write");
        return 1;
      },
      async () => {
        steps.push("advance");
        return true;
      },
    );

    assert.isTrue(ok);
    assert.deepStrictEqual(steps, ["advance"]);
  });

  it("finishes with the newest draft when words are still unsaved", async () => {
    const steps: Array<string> = [];
    keepDraft("typed", "Typed just now", "");

    await finishNotes(
      "typed",
      async (text) => {
        steps.push(`write and finish: ${text}`);
        return 1;
      },
      async () => {
        steps.push("advance");
        return true;
      },
    );

    assert.deepStrictEqual(steps, ["write and finish: Typed just now"]);
  });

  it("writes one Video's notes at a time, so a save for another Video never cuts one short", async () => {
    const events: Array<string> = [];
    const slow = later();
    keepDraft("first", "First notes", "");
    keepDraft("second", "Second notes", "");

    const first = saveNotes("first", async (text) => {
      events.push(`start ${text}`);
      const ok = await slow.promise;
      events.push(`end ${text}`);
      return ok;
    });
    const second = saveNotes("second", async (text) => {
      events.push(`start ${text}`);
      return 1;
    });
    slow.open(1);
    await Promise.all([first, second]);

    assert.deepStrictEqual(events, ["start First notes", "end First notes", "start Second notes"]);
    assert.deepStrictEqual([draftOf("first"), draftOf("second")], [undefined, undefined]);
  });

  it("keeps the words for the next view when a save fails or throws, and goes on saving", async () => {
    keepDraft("lost", "Words not on disk yet", "");
    const failed = await saveNotes("lost", async () => false);
    const threw = await saveNotes("lost", async () => {
      throw new Error("The connection dropped.");
    });
    const kept = draftOf("lost");
    const next = await saveNotes("lost", async () => 1);

    assert.deepStrictEqual(
      [failed, threw, kept, next],
      [false, false, "Words not on disk yet", true],
    );
    assert.isUndefined(draftOf("lost"));
  });

  it("brings back words typed just before Glose closed, when the file still has the text they were typed on", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    before.keepDraft("closed", "Saved words, and a line typed just before closing", "Saved words");

    const after = await reloaded();

    assert.strictEqual(
      after.restoreDraft("closed", "Saved words"),
      "Saved words, and a line typed just before closing",
    );
    assert.strictEqual(
      after.draftOf("closed"),
      "Saved words, and a line typed just before closing",
    );
  });

  it("drops words kept from before a reload when the file changed since", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    before.keepDraft("changed", "Saved words, and a typed line", "Saved words");

    const after = await reloaded();

    assert.isUndefined(after.restoreDraft("changed", "Saved words, then edited in Obsidian"));
    assert.isUndefined(after.draftOf("changed"));
  });

  it("brings back newer words after a reload while an older save was reaching the file", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    const slow = later();
    before.keepDraft("racing", "First line\n", "");
    void before.saveNotes("racing", () => slow.promise);
    await Promise.resolve();
    before.keepDraft("racing", "First line\nSecond line", "");

    const after = await reloaded();

    assert.strictEqual(after.restoreDraft("racing", "First line"), "First line\nSecond line");
  });

  it("brings back words typed right after a save, before the view heard of that save", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    before.keepDraft("quick", "A", "");
    await before.saveNotes("quick", async () => 1);
    before.keepDraft("quick", "A and B", "");

    const after = await reloaded();

    assert.strictEqual(after.restoreDraft("quick", "A"), "A and B");
  });

  it("keeps an undo that matches the file while a longer save may still land", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    const slow = later();
    before.keepDraft("undone", "A and B", "A");
    void before.saveNotes("undone", () => slow.promise);
    await Promise.resolve();
    before.keepDraft("undone", "A", "A");

    const after = await reloaded();

    assert.strictEqual(after.restoreDraft("undone", "A"), "A");
    assert.strictEqual(after.draftOf("undone"), "A");
  });

  it("counts indentation at the start, as a Markdown reader does", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    before.keepDraft("indented", "    [1:00] now code", "[1:00] not code");

    const after = await reloaded();

    assert.strictEqual(after.restoreDraft("indented", "[1:00] not code"), "    [1:00] now code");
  });

  it("counts a blank first line, which the Source file keeps", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const before = await reloaded();
    before.keepDraft("blank", "\nSaved words and new ones", "\nSaved words");

    const after = await reloaded();

    assert.isUndefined(after.restoreDraft("blank", "Saved words"));
  });

  it("opens a new view on the words just saved while the Source shown is older than the save", async () => {
    keepDraft("refreshing", "Old words and new ones", "Old words");
    await saveNotes("refreshing", async () => 20);
    keepDraft("refreshing", "Old words and new ones, and more", "Old words");
    await saveNotes("refreshing", async () => 30);

    assert.strictEqual(
      savedOver("refreshing", "Old words", 10),
      "Old words and new ones, and more",
    );
    assert.isUndefined(savedOver("refreshing", "Old words and new ones, and more", 30));
    assert.isUndefined(savedOver("refreshing", "Old words", 10));
  });

  it("never puts saved words over a newer file, even when another editor restored the old text", async () => {
    keepDraft("restored", "Typed in Glose", "Old words");
    await saveNotes("restored", async () => 20);

    assert.isUndefined(savedOver("restored", "Old words", 40));
    assert.isUndefined(savedOver("restored", "Old words", 10));
  });
});

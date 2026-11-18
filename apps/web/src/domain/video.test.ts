import { assert, describe, it } from "@effect/vitest";

import { stampAtCursor, stampInsert } from "../components/WatchNotes.tsx";
import { cueAt, cuesOf, notesWordCount } from "./video.ts";

const ID = "u4ZoJKF_VuA";

const LINK = (time: string, seconds: number) =>
  `[${time}](https://www.youtube.com/watch?v=u4ZoJKF_VuA&t=${seconds}s)`;

const NOTES = [
  "My first thoughts, before any time.",
  `${LINK("4:10", 250)} The **golden circle**:`,
  "why, how, what.",
  "",
  "A new paragraph without a time.",
  LINK("6:02", 362),
  "",
  "Words a blank line below their time.",
  `${LINK("0:42", 42)} People buy [why](https://example.com) you do it, as [[Sinek 2009|Sinek]] says in [[Start with why]].`,
].join("\n");

describe("The timestamps of watch notes", () => {
  it("lists each moment in the order of the video, with the words after it", () => {
    assert.deepStrictEqual(
      cuesOf(NOTES, ID).map((cue) => [cue.label, cue.words]),
      [
        ["0:42", "People buy why you do it, as Sinek says in Start with why."],
        ["4:10", "The golden circle: why, how, what."],
        ["6:02", "Words a blank line below their time."],
      ],
    );
  });

  it("knows which moment the video is at", () => {
    const cues = cuesOf(NOTES, ID);

    assert.isNull(cueAt(cues, 10));
    assert.strictEqual(cueAt(cues, 249.7)?.label, "4:10");
    assert.strictEqual(cueAt(cues, 3600)?.label, "6:02");
  });

  it("counts the user's words, not the timestamps", () => {
    assert.strictEqual(notesWordCount(`${LINK("0:42", 42)} People buy why.`, ID), 3);
  });
});

describe("Stamping the time", () => {
  it("plays from the timestamp at or before the cursor", () => {
    const notes = `Intro. ${LINK("0:42", 42)} People buy why. ${LINK("4:10", 250)} The circle.`;

    assert.isNull(stampAtCursor(notes, 3, ID));
    assert.strictEqual(stampAtCursor(notes, notes.indexOf("People"), ID), 42);
    assert.strictEqual(stampAtCursor(notes, notes.length, ID), 250);
    assert.isNull(stampAtCursor(notes, notes.length, "AAAAAAAAAAA"));
  });

  it("puts a timestamp at the cursor with a space on each side where it needs one", () => {
    const link = LINK("0:42", 42);

    assert.strictEqual(stampInsert("", 0, 0, "u4ZoJKF_VuA", 42.8), `${link} `);
    assert.strictEqual(stampInsert("He said", 7, 7, "u4ZoJKF_VuA", 42), ` ${link} `);
    assert.strictEqual(stampInsert("He said.", 7, 7, "u4ZoJKF_VuA", 42), ` ${link}`);
    assert.strictEqual(stampInsert("He said this", 3, 7, "u4ZoJKF_VuA", 42), link);
    assert.strictEqual(stampInsert("", 0, 0, null, 3723), "[1:02:03] ");
  });
});

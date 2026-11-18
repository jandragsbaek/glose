import { assert, describe, it } from "@effect/vitest";

import {
  findStamps,
  isTimestamp,
  plainStamps,
  stampLink,
  timestampSeconds,
  timestampText,
  youtubeId,
} from "./video.ts";

const ID = "u4ZoJKF_VuA";

describe("YouTube addresses", () => {
  it("finds the video in every address YouTube gives out", () => {
    for (const address of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/watch?feature=share&v=${ID}&t=90s`,
      `https://youtu.be/${ID}?si=abc&t=12`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}?start=3`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `youtube.com/watch?v=${ID}`,
      `  https://youtu.be/${ID}  `,
    ]) {
      assert.strictEqual(youtubeId(address), ID, address);
    }
  });

  it("refuses addresses that are not one YouTube video", () => {
    for (const address of [
      "",
      "not an address",
      "https://vimeo.com/76979871",
      "https://www.youtube.com/@TEDx",
      "https://www.youtube.com/playlist?list=PL123",
      "https://www.youtube.com/watch?v=short",
      `https://evil.example/watch?v=${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      `javascript:alert(1)//youtu.be/${ID}`,
    ]) {
      assert.isNull(youtubeId(address), address);
    }
  });
});

describe("Timestamps", () => {
  it("writes a time as YouTube does and reads it back", () => {
    assert.strictEqual(timestampText(0), "0:00");
    assert.strictEqual(timestampText(65.9), "1:05");
    assert.strictEqual(timestampText(754), "12:34");
    assert.strictEqual(timestampText(3723), "1:02:03");
    assert.strictEqual(timestampSeconds("12:34"), 754);
    assert.strictEqual(timestampSeconds("1:02:03"), 3723);
    assert.strictEqual(timestampSeconds("125:00"), 7500);
  });

  it("tells a time from a page or a paragraph", () => {
    assert.isTrue(isTimestamp("12:34"));
    assert.isTrue(isTimestamp("0:05"));
    for (const location of ["47", "47–49", "xii", "¶ 8", "12:3", "12:60", "1:2:3", "12.34"]) {
      assert.isFalse(isTimestamp(location), location);
    }
  });

  it("finds the timestamps Glose writes and the ones typed by hand, and nothing else", () => {
    const notes = [
      `${stampLink(ID, 754)} Start with why.`,
      "Typed by hand: [1:02:03] the golden circle.",
      `Shared from YouTube: [0:42](https://youtu.be/${ID}?t=42) and [100:00:00].`,
      "Not a stamp: [12:34](https://example.com) or [[12:34]] or [12:34][ref] or ![0:10](x).",
      `Nor a link to another video, [4:10](https://www.youtube.com/watch?v=AAAAAAAAAAA&t=250s),`,
      `nor a link whose time is not its label, [4:40](https://www.youtube.com/watch?v=${ID}&t=250s),`,
      `[4:40](https://youtu.be/${ID}#t=250) or [4:40](https://www.youtube.com/watch?v=${ID}&time_continue=250),`,
      `[1:00](https://www.youtube.com/watch?v=${ID}&t=60&t=120),`,
      "nor code: `[12:34]` and",
      "```",
      "[1:00]",
      "```",
      "",
      "    indented code",
      "",
      "    [2:00] still the same code block",
    ].join("\n");

    assert.strictEqual(
      stampLink(ID, 754.6),
      `[12:34](https://www.youtube.com/watch?v=${ID}&t=754s)`,
    );
    assert.deepStrictEqual(
      findStamps(notes, ID).map((stamp) => [stamp.label, stamp.seconds]),
      [
        ["12:34", 754],
        ["1:02:03", 3723],
        ["0:42", 42],
        ["100:00:00", 360000],
      ],
    );
    assert.strictEqual(
      plainStamps(notes, ID).split("\n").slice(0, 3).join("\n"),
      [
        "[12:34] Start with why.",
        "Typed by hand: [1:02:03] the golden circle.",
        "Shared from YouTube: [0:42] and [100:00:00].",
      ].join("\n"),
    );
    assert.deepStrictEqual(
      findStamps(notes, null).map((stamp) => stamp.label),
      ["1:02:03", "100:00:00"],
    );
  });
});

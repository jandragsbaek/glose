import { assert, describe, it } from "@effect/vitest";

import { intervalOf } from "./interval.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe("intervalOf", () => {
  it("picks the largest readable unit, as Anki's rating buttons do", () => {
    assert.deepStrictEqual(
      [
        intervalOf(20_000),
        intervalOf(10 * MINUTE),
        intervalOf(90 * MINUTE),
        intervalOf(8 * DAY + 3 * 60 * MINUTE),
        intervalOf(45 * DAY),
        intervalOf(400 * DAY),
      ],
      [
        { value: 1, unit: "minute" },
        { value: 10, unit: "minute" },
        { value: 1.5, unit: "hour" },
        { value: 8, unit: "day" },
        { value: 1.5, unit: "month" },
        { value: 1.1, unit: "year" },
      ],
    );
  });
});

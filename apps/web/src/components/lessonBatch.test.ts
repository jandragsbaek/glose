import { assert, describe, it } from "@effect/vitest";

import type { Lesson } from "./LessonTable.tsx";
import { isHeld } from "./lessonBatch.ts";

const conflict: Lesson = {
  key: "0:Intro.md",
  name: "Intro.md",
  path: "Intro.md",
  markdown: "# Intro",
  part: "1.1",
  title: "Intro",
  words: 1,
  state: "named",
  id: null,
  order: 0,
  partByName: false,
  takenAs: "Berg 2026 1.1 Intro.md",
};

describe("isHeld", () => {
  it("holds a lesson back while its file name is still the one that was taken", () => {
    const course = { family: "berg", year: "2026" };

    assert.isTrue(isHeld(conflict, course));
    assert.isTrue(isHeld({ ...conflict, part: "1.1" }, { family: "Berg ", year: "2026" }));
    assert.isFalse(isHeld({ ...conflict, title: "Intro, again" }, course));
    assert.isFalse(isHeld({ ...conflict, part: "1.2" }, course));
    assert.isFalse(isHeld(conflict, { family: "Berg", year: "2024" }));
  });
});

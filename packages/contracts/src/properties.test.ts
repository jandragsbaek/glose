import { assert, describe, it } from "@effect/vitest";

import { isPropertyKey, propertyKind } from "./properties.ts";

describe("propertyKind", () => {
  it("reads a field's kind from its YAML value, as Obsidian shows it", () => {
    const values = [
      null,
      "Study skills",
      "2026-11-20",
      "2026-11-20T10:00",
      4,
      true,
      ["a", "b"],
      [1, 2],
      { by: "me" },
    ];
    assert.deepStrictEqual(values.map(propertyKind), [
      "text",
      "text",
      "date",
      "text",
      "number",
      "checkbox",
      "list",
      "other",
      "other",
    ]);
  });
});

describe("isPropertyKey", () => {
  it("takes a name without edge spaces or line breaks", () => {
    const names = ["tags", "due date", "", " tags", "a\nb"];
    assert.deepStrictEqual(names.map(isPropertyKey), [true, true, false, false, false]);
  });
});

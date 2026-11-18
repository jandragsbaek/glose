import { assert, describe, it } from "@effect/vitest";

import { EMPTY_FORM, fillFromCatalog } from "./sourceForm.ts";

const BARNDOM = {
  ...EMPTY_FORM,
  familyName: "Ditlevsen",
  givenName: "Tove",
  title: "Barndom",
  firstPublished: "1967",
  publisher: "Hasselbalch",
  editionYear: "1967",
};

const HUMAN_CONDITION = {
  ...EMPTY_FORM,
  familyName: "Arendt",
  givenName: "Hannah",
  title: "The Human Condition",
  firstPublished: "1958",
  publisher: "Doubleday",
  editionYear: "1959",
};

describe("fillFromCatalog", () => {
  it("never replaces what the user typed, even when an earlier record matched it", () => {
    const typed = { ...EMPTY_FORM, familyName: "Ditlevsen", translator: "Tiina Nunnally" };
    const first = fillFromCatalog(typed, [], BARNDOM);
    const second = fillFromCatalog(first.values, first.filled, HUMAN_CONDITION);

    assert.deepStrictEqual(first.filled, [
      "givenName",
      "title",
      "firstPublished",
      "editionYear",
      "publisher",
    ]);
    assert.deepStrictEqual(second.values, {
      ...HUMAN_CONDITION,
      familyName: "Ditlevsen",
      translator: "Tiina Nunnally",
    });
    assert.deepStrictEqual(second.kept, ["familyName", "translator"]);
  });

  it("counts a field an earlier record filled and this one empties as replaced, not filled", () => {
    const first = fillFromCatalog(EMPTY_FORM, [], HUMAN_CONDITION);
    const second = fillFromCatalog(first.values, first.filled, { ...BARNDOM, publisher: "" });

    assert.strictEqual(second.values.publisher, "");
    assert.isFalse(second.filled.includes("publisher"));
    assert.isTrue(second.replaced.includes("publisher"));
  });
});

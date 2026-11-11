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
    // The user typed the family name and a translator before choosing; the record agrees on the name.
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
});

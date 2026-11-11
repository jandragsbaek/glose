import { assert, describe, it } from "@effect/vitest";

import { EMPTY_FORM, fillFromCatalog, isFromCatalog } from "./sourceForm.ts";

const BARNDOM = {
  ...EMPTY_FORM,
  familyName: "Ditlevsen",
  givenName: "Tove",
  title: "Barndom",
  firstPublished: "1967",
  publisher: "Hasselbalch",
  editionYear: "1967",
};

const CHILDHOOD = {
  ...EMPTY_FORM,
  familyName: "Ditlevsen",
  givenName: "Tove",
  title: "Childhood",
  firstPublished: "1967",
  publisher: "Penguin",
  editionYear: "2019",
};

describe("fillFromCatalog", () => {
  it("keeps what the user typed and replaces what an earlier Catalog fill wrote", () => {
    const typed = { ...EMPTY_FORM, translator: "Tiina Nunnally", edition: "2nd" };
    const first = fillFromCatalog(typed, null, BARNDOM);
    // The user corrects the title after the first fill; that correction is theirs now.
    const corrected = { ...first.values, title: "Barndom: erindringer" };
    const second = fillFromCatalog(corrected, BARNDOM, CHILDHOOD);

    assert.deepStrictEqual(second.values, {
      ...CHILDHOOD,
      title: "Barndom: erindringer",
      translator: "Tiina Nunnally",
      edition: "2nd",
    });
    assert.deepStrictEqual(second.kept, ["title", "edition", "translator"]);
    assert.deepStrictEqual(
      ["publisher", "title", "translator"].map((name) =>
        isFromCatalog(second.values, CHILDHOOD, name as "publisher" | "title" | "translator"),
      ),
      [true, false, false],
    );
  });
});

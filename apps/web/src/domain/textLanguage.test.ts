import { assert, describe, it } from "@effect/vitest";
import { parseArticle } from "@glose/contracts";

import { textLanguage } from "./textLanguage.ts";

describe("textLanguage", () => {
  it("tells English from Danish text, and stays silent on too little", () => {
    assert.strictEqual(
      textLanguage(
        parseArticle(
          "The model reads the text and it is not a person. It can be wrong, and that is the point of the test.",
        ),
      ),
      "en",
    );
    assert.strictEqual(
      textLanguage(
        parseArticle(
          "Det er ikke modellen, der læser teksten. Den kan tage fejl, og det er en del af det, vi skal se på med jer.",
        ),
      ),
      "da",
    );
    assert.isUndefined(textLanguage(parseArticle("Retrieval before generation.")));
  });
});

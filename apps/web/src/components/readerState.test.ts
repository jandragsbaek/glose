import { assert, describe, it } from "@effect/vitest";
import { parseArticle, type Session } from "@glose/contracts";

import { passageKey, passageStates } from "./readerState.ts";

const TEXT = "First ==one idea== and then ==another idea== in the same paragraph.\n";

const probe = (entries: Session["entries"]): Session => ({
  id: "s",
  kind: "probe",
  subject: "A source",
  model: null,
  created: 0,
  entries,
  working: false,
  draft: "",
  problem: null,
});

describe("passageStates", () => {
  it("keeps two Passages in one paragraph apart", () => {
    const { passages } = parseArticle(TEXT);
    const states = passageStates(
      passages,
      probe([
        { _tag: "ProbeFocus", paragraph: 1, text: "another idea" },
        {
          _tag: "ProbeQuestion",
          number: 1,
          topic: "Ideas",
          text: "Why?",
          again: null,
          paragraph: 1,
          passage: "another idea",
        },
        { _tag: "ProbeFocusDone", paragraph: 1, text: "another idea" },
      ]),
      [],
    );
    assert.deepStrictEqual(
      passages.map((passage) => [
        passage.id,
        states.get(passage.id)?.asked.length,
        states.get(passage.id)?.understood,
      ]),
      [
        ["1.1", 0, false],
        ["1.2", 1, true],
      ],
    );
  });

  it("keys a Passage by where its words start, so marking an earlier twin moves nothing", () => {
    const before = parseArticle("A model learns. A ==model== predicts.\n").passages;
    const after = parseArticle("A ==model== learns. A ==model== predicts.\n").passages;
    assert.deepStrictEqual(before.map(passageKey), ["1:18:model"]);
    assert.deepStrictEqual(after.map(passageKey), ["1:2:model", "1:18:model"]);
  });
});

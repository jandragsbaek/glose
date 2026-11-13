import { assert, describe, it } from "@effect/vitest";

import { composeBody, noteSegments, type SegmentEdit, startEdit } from "./noteEdit.ts";

const MIXED = [
  "My own opening.",
  "",
  "> [!ai] A title the AI gave",
  "> The AI's first.",
  ">",
  "> The AI's second.",
  "",
  "## How it connects",
  "",
  "> [!ai-part]",
  "> The AI wrote this Part.",
  "",
  "Related: [[Deep work]]",
].join("\n");

describe("noteSegments and composeBody", () => {
  it("splits a Note into the user's runs and each AI run, and saves it unchanged as written", () => {
    const segments = noteSegments(MIXED, false);

    assert.deepStrictEqual(
      segments.map((segment) =>
        segment.kind === "own"
          ? { own: segment.markdown }
          : { ai: segment.scope, text: segment.text, heading: segment.heading?.text ?? null },
      ),
      [
        { own: "My own opening." },
        {
          ai: "paragraphs",
          text: "A title the AI gave\n\nThe AI's first.\n\nThe AI's second.",
          heading: null,
        },
        { ai: "part", text: "The AI wrote this Part.", heading: "How it connects" },
        { own: "Related: [[Deep work]]" },
      ],
    );
    assert.deepStrictEqual(composeBody(segments, segments.map(startEdit)), {
      body: MIXED,
      aiNote: false,
    });
  });

  it("puts the user's words in place of the AI text they rewrote, and keeps corrected AI text marked", () => {
    const segments = noteSegments(MIXED, false);
    const edits: ReadonlyArray<SegmentEdit> = [
      { yours: "My own opening, sharper.", yourHeading: "", corrected: null },
      { yours: "", yourHeading: "", corrected: "The AI's first, with a typo fixed." },
      { yours: "In my words.", yourHeading: "Where it leads", corrected: null },
      { yours: "Related: [[Deep work]]", yourHeading: "", corrected: null },
    ];

    assert.deepStrictEqual(composeBody(segments, edits), {
      body: [
        "My own opening, sharper.",
        "",
        "> [!ai]",
        "> The AI's first, with a typo fixed.",
        "",
        "## Where it leads",
        "",
        "In my words.",
        "",
        "Related: [[Deep work]]",
      ].join("\n"),
      aiNote: false,
    });
  });

  it("keeps the indent of the user's first line, which makes it a code block", () => {
    const body = "    const kept = true;\n\nThen text.\n\n> [!ai]\n> The AI's line.";
    const segments = noteSegments(body, false);

    assert.deepStrictEqual(composeBody(segments, segments.map(startEdit)), {
      body,
      aiNote: false,
    });
  });

  it("keeps a Note marked as a whole marked until the user rewrites it", () => {
    const body = "The AI wrote all of this.\n\n- and this list";
    const segments = noteSegments(body, true);

    assert.deepStrictEqual(composeBody(segments, segments.map(startEdit)), { body, aiNote: true });
    assert.deepStrictEqual(
      composeBody(segments, [{ yours: "Mine now.", yourHeading: "", corrected: null }]),
      { body: "Mine now.", aiNote: false },
    );
  });
});

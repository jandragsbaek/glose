import { assert, describe, it } from "@effect/vitest";

import {
  type CitedSource,
  findReferences,
  bibliographyEntry,
  noteCitation,
  postFileName,
  renderBlogPost,
  referenceToken,
  resolveReferences,
  shortCitation,
} from "./writing.ts";

const NEWPORT: CitedSource = {
  id: "Newport 2016 Deep Work",
  familyName: "Newport",
  givenName: "Cal",
  title: "Deep Work",
  firstPublished: 2016,
  edition: null,
  editionYear: null,
  publisher: "Grand Central Publishing",
  translator: null,
};

const NODES = [
  {
    id: "Busyness is a proxy for productivity",
    kind: "note" as const,
    sourceId: "Newport 2016 Deep Work",
    body: "Newport calls this busyness as a proxy for productivity.",
    page: "64",
  },
  {
    id: "Attention residue lowers performance after switching",
    kind: "note" as const,
    sourceId: "Newport 2016 Deep Work",
    body: "Part of your attention stays with the task you left.",
    page: null,
  },
  { id: "An idea of my own", kind: "note" as const, sourceId: null, body: "", page: null },
];

const problems = (body: string) =>
  resolveReferences(body, NODES, [NEWPORT]).map((reference) => reference.problems.join(","));

describe("findReferences", () => {
  it("reads the Location in braces, in English or Danish, and skips code", () => {
    const body =
      "One [[Busyness is a proxy for productivity]]{p. 64}, two [[Deep Work|the book]]{s. 12}, `[[Not a Reference]]` and [[Plain]].";
    assert.deepStrictEqual(
      findReferences(body).map(({ target, location }) => [target, location]),
      [
        ["Busyness is a proxy for productivity", "64"],
        ["Deep Work", "12"],
        ["Plain", null],
      ],
    );
  });
});

describe("resolveReferences", () => {
  it("takes the Note's page when the Reference gives none", () => {
    const [reference] = resolveReferences("Busy.[[Busyness is a proxy for productivity]]", NODES, [
      NEWPORT,
    ]);
    assert.strictEqual(reference?.page, "64");
    assert.strictEqual(reference?.source?.id, "Newport 2016 Deep Work");
    assert.deepStrictEqual(reference?.problems, []);
  });

  it("warns about what keeps a Citation from being correct", () => {
    assert.deepStrictEqual(
      problems(
        [
          "[[Attention residue lowers performance after switching]]",
          "[[An idea of my own]]",
          "[[No such Note]]",
        ].join(" "),
      ),
      ["no-location", "no-source", "not-found"],
    );
  });

  it("checks that a quote matches its Note word for word", () => {
    assert.deepStrictEqual(
      problems(
        [
          "He calls it “busyness as a proxy for productivity.”[[Busyness is a proxy for productivity]]",
          'He says "busy people are productive".[[Busyness is a proxy for productivity]]',
        ].join("\n\n"),
      ),
      ["", "quote-mismatch"],
    );
  });
});

describe("Citations", () => {
  it("builds a note Citation and the short ones of each style", () => {
    assert.strictEqual(
      noteCitation(NEWPORT, "64"),
      "Cal Newport, *Deep Work* (Grand Central Publishing, 2016), 64.",
    );
    assert.strictEqual(shortCitation(NEWPORT, "64", "chicago"), "Newport 2016, 64");
    assert.strictEqual(shortCitation(NEWPORT, "64", "apa"), "Newport, 2016, p. 64");
    assert.strictEqual(
      shortCitation({ ...NEWPORT, firstPublished: null }, null, "harvard"),
      "Newport n.d.",
    );
  });
});

describe("Citations of an Article or a Course lesson", () => {
  const HOLM: CitedSource = {
    id: "Holm 2026 Notes that answer back",
    familyName: "Holm",
    givenName: "Ida",
    title: "Notes that answer back",
    firstPublished: 2026,
    edition: null,
    editionYear: null,
    publisher: null,
    translator: null,
    kind: "article",
    container: "Sample Essays",
    url: "https://example.com/notes",
  };

  it("cites the paragraph and where the text appeared, not a publisher", () => {
    assert.strictEqual(
      noteCitation(HOLM, "¶ 4"),
      "Ida Holm, “Notes that answer back,” *Sample Essays* (2026), par. 4.",
    );
    assert.strictEqual(shortCitation(HOLM, "¶ 4", "apa"), "Holm, 2026, para. 4");
    assert.strictEqual(
      bibliographyEntry(HOLM, "apa"),
      "Holm, I. (2026). Notes that answer back. *Sample Essays*. https://example.com/notes",
    );
    assert.strictEqual(
      bibliographyEntry(HOLM, "chicago"),
      "Holm, Ida. “Notes that answer back.” *Sample Essays*, 2026. https://example.com/notes",
    );
  });

  it("asks for where the text appeared instead of a publisher", () => {
    const [reference] = resolveReferences(
      "A claim.[[Holm 2026 Notes that answer back]]{¶ 4}",
      [],
      [{ ...HOLM, container: null }],
    );
    assert.deepStrictEqual(reference?.problems, ["no-container"]);
  });
});

describe("Citations of a Video", () => {
  const SINEK: CitedSource = {
    id: "Sinek 2009 Start with why",
    familyName: "Sinek",
    givenName: "Simon",
    title: "Start with why",
    firstPublished: 2009,
    edition: null,
    editionYear: null,
    publisher: null,
    translator: null,
    kind: "video",
    container: "TEDx Talks",
    url: "https://www.youtube.com/watch?v=u4ZoJKF_VuA",
  };

  it("cites the time in the video, the channel and the address", () => {
    assert.strictEqual(
      noteCitation(SINEK, "12:34"),
      "Simon Sinek, “Start with why,” TEDx Talks, YouTube video (2009), 12:34.",
    );
    assert.strictEqual(shortCitation(SINEK, "12:34", "apa"), "Sinek, 2009, 12:34");
    assert.strictEqual(shortCitation(SINEK, "1:02:03", "chicago"), "Sinek 2009, 1:02:03");
    assert.strictEqual(
      bibliographyEntry(SINEK, "apa"),
      "Sinek, S. (2009). *Start with why* [Video]. YouTube. https://www.youtube.com/watch?v=u4ZoJKF_VuA",
    );
    assert.strictEqual(
      bibliographyEntry(SINEK, "harvard"),
      "Sinek, S. (2009) *Start with why* [Video]. TEDx Talks. Available at: https://www.youtube.com/watch?v=u4ZoJKF_VuA",
    );
    assert.strictEqual(
      bibliographyEntry(SINEK, "chicago"),
      "Sinek, Simon. “Start with why.” TEDx Talks, 2009. YouTube video. https://www.youtube.com/watch?v=u4ZoJKF_VuA",
    );
  });

  it("writes a time as a time in the prose, and asks for the channel instead of a publisher", () => {
    assert.strictEqual(
      referenceToken(SINEK.id, "12:34", true),
      "[[Sinek 2009 Start with why]]{12:34}",
    );
    assert.strictEqual(referenceToken("A book", "3:16"), "[[A book]]{p. 3:16}");
    assert.strictEqual(referenceToken(SINEK.id, "64"), "[[Sinek 2009 Start with why]]{p. 64}");
    assert.strictEqual(
      shortCitation({ ...SINEK, kind: "book" }, "3:16", "apa"),
      "Sinek, 2009, p. 3:16",
    );
    const [reference] = resolveReferences(
      "A claim.[[Sinek 2009 Start with why]]{12:34}",
      [],
      [{ ...SINEK, container: null }],
    );
    assert.strictEqual(reference?.page, "12:34");
    assert.deepStrictEqual(reference?.problems, ["no-container"]);
  });
});

describe("renderBlogPost", () => {
  const body =
    "Busy is not productive.[[Busyness is a proxy for productivity]]\n\nA second claim [[Busyness is a proxy for productivity]]{p. 65}.";
  const post = (referenceForm: "footnotes" | "links", language = "en") =>
    renderBlogPost(
      { title: 'A "busy" day', body, referenceForm, language },
      resolveReferences(body, NODES, [NEWPORT]),
      "2026-11-13",
    );

  it("writes footnotes for Bridgetown's kramdown", () => {
    assert.strictEqual(
      post("footnotes"),
      [
        "---",
        "layout: post",
        'title: "A \\"busy\\" day"',
        "date: 2026-11-13",
        "---",
        "",
        "Busy is not productive.[^1]",
        "",
        "A second claim[^2].",
        "",
        "[^1]: Cal Newport, *Deep Work* (Grand Central Publishing, 2016), 64.",
        "[^2]: Cal Newport, *Deep Work* (Grand Central Publishing, 2016), 65.",
        "",
      ].join("\n"),
    );
  });

  it("links short Citations to a list of Sources in the language of the prose", () => {
    const danish = post("links", "da");
    assert.include(danish, "Busy is not productive. ([Newport 2016, 64](#kilder))");
    assert.include(danish, "A second claim ([Newport 2016, 65](#kilder)).");
    assert.include(
      danish,
      "## Kilder\n\n- Newport, Cal. *Deep Work*. Grand Central Publishing, 2016.\n",
    );
  });

  it("names the file by date and title, safe for a URL", () => {
    assert.strictEqual(
      postFileName("2026-11-13", "Hvad får én til at læse Kierkegaard?"),
      "2026-11-13-hvad-faar-en-til-at-laese-kierkegaard.md",
    );
  });
});

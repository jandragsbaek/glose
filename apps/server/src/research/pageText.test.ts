import { assert, describe, it } from "@effect/vitest";

import { pageFromHtml, pageFromText } from "./pageText.ts";

const ARTICLE = `<!doctype html>
<html><head>
<title>Retrieval practice, explained | Learning Example</title>
<meta property="og:site_name" content="Learning Example">
<meta name="author" content="Sample Author">
<meta property="article:published_time" content="2024-03-01T10:00:00Z">
</head><body>
<nav><a href="/">Home</a> <a href="/about">About</a></nav>
<article>
<h1>Retrieval practice, explained</h1>
<p>Retrieval practice means bringing information to mind without looking. It is one of the
best studied ways to learn, and it works for students of every age and subject.</p>
<p>Students who tested themselves remembered more a week later than students who reread. The
gain held for prose passages, for word lists and for maps, and it grew with the delay.</p>
<p><img src="http://192.168.1.1/tracker.png" alt="x"> See <a href="/next">the next part</a>
and <a href="javascript:alert(1)">this</a>.</p>
<p>The effort of recall is part of what makes it stick, so a test that feels hard is not a sign
that the method fails. Feedback after the test helps, but the test helps without it too.</p>
</article>
<footer>© Learning Example</footer>
</body></html>`;

describe("pageFromHtml", () => {
  it("keeps the article's text as Markdown and reads who wrote it, where and when", () => {
    const page = pageFromHtml(ARTICLE, "https://learning.example/retrieval");
    assert.isNotNull(page);
    assert.strictEqual(page!.author, "Sample Author");
    assert.strictEqual(page!.site, "Learning Example");
    assert.strictEqual(page!.published, "2024-03-01T10:00:00Z");
    assert.include(
      page!.markdown,
      "Students who tested themselves remembered more a week later than students who reread.",
    );
    assert.notInclude(page!.markdown, "About");
    assert.notInclude(page!.markdown, "<p>");
  });

  it("keeps no images, makes links absolute and drops links that are not web pages", () => {
    const page = pageFromHtml(ARTICLE, "https://learning.example/retrieval");
    assert.notInclude(page!.markdown, "192.168.1.1");
    assert.include(page!.markdown, "[the next part](https://learning.example/next)");
    assert.notInclude(page!.markdown, "javascript:");
  });

  it("gives nothing for a page without text", () => {
    assert.isNull(pageFromHtml("<html><body></body></html>", "https://empty.example/"));
  });
});

describe("pageFromText", () => {
  it("takes a Markdown page's first heading as its title", () => {
    const page = pageFromText("# Notes on spacing\n\nSpace it out.", "https://notes.example/s.md");
    assert.strictEqual(page?.title, "Notes on spacing");
    assert.strictEqual(page?.site, "notes.example");
  });

  it("keeps no image, only links, and makes links absolute, as for HTML", () => {
    const page = pageFromText(
      "# Notes\n\n![](http://tracker.example/pixel) See [next](/next) and [this](javascript:alert(1)).\n\n<img src=x>",
      "https://notes.example/s.md",
    );
    assert.notInclude(page!.markdown, "![");
    assert.notInclude(page!.markdown, "<img");
    assert.include(page!.markdown, "[next](https://notes.example/next)");
    assert.notInclude(page!.markdown, "javascript:");
  });

  it("turns every image form into a plain link, and leaves code as written", () => {
    const page = pageFromText(
      [
        "![a [b] c](https://x.example/p.png) ![pixel][t]",
        "",
        "[t]: https://tracker.example/pixel.png",
        "",
        "[home](<https://notes.example/a b>)",
        "",
        "```",
        "![kept](code.png)",
        "```",
      ].join("\n"),
      "https://notes.example/s.md",
    );
    assert.notInclude(page!.markdown.split("```")[0]!, "![");
    assert.include(page!.markdown, "![kept](code.png)");
    assert.include(page!.markdown, "[home](https://notes.example/a%20b)");
  });
});

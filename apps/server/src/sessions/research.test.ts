import { assert, describe, it } from "@effect/vitest";

import { parseArticle, WIKILINK } from "@glose/contracts";

import { PAGE_A } from "../testkit/research.ts";
import { linkSafe, sourceOfPage } from "./pageDecisions.ts";
import { findWholeQuote } from "../research/wholeQuote.ts";
import { addressesOf, checkQuotes, trimAddress } from "./research.ts";

describe("addresses the user writes", () => {
  it("keeps a closing bracket that belongs to the address, and drops end punctuation", () => {
    assert.strictEqual(
      trimAddress("https://en.wikipedia.org/wiki/Mercury_(planet)"),
      "https://en.wikipedia.org/wiki/Mercury_(planet)",
    );
    assert.deepStrictEqual(
      addressesOf({
        type: "message",
        role: "user",
        content: "Read https://a.example/x_(y). Also (see https://b.example/z), please.",
      }),
      ["https://a.example/x_(y)", "https://b.example/z"],
    );
  });

  it("takes no address from what the AI wrote", () => {
    assert.deepStrictEqual(
      addressesOf({ type: "message", role: "assistant", content: "https://evil.example/?q=x" }),
      [],
    );
    assert.deepStrictEqual(
      addressesOf({
        type: "web_search_call",
        action: { type: "search", query: "https://evil.example/?q=x", sources: [] },
      }),
      [],
    );
  });
});

describe("quotes", () => {
  it("match whole words only", () => {
    const article = parseArticle("She never said this would work.\n");
    assert.isNull(findWholeQuote(article, "ever said this would work"));
    assert.strictEqual(findWholeQuote(article, "never said this would")?.n, 1);
    assert.strictEqual(
      checkQuotes("She never said this would work.\n", ["ever said this would"]).missing,
      1,
    );
    const finding = parseArticle(
      "The study found non-significant differences between the groups.\n",
    );
    assert.isNull(findWholeQuote(finding, "significant differences between the groups"));
    assert.isNull(
      findWholeQuote(parseArticle("It isn't over yet, they said.\n"), "t over yet, they"),
    );
    assert.isNull(
      findWholeQuote(
        parseArticle("The study found non\u00ADsignificant differences between the groups.\n"),
        "significant differences between the groups",
      ),
    );
    assert.strictEqual(
      findWholeQuote(
        parseArticle("She said, ‘Read the full report.’ Then left.\n"),
        "Read the full report.",
      )?.n,
      1,
    );
    assert.isNull(
      findWholeQuote(
        parseArticle("The rule will apply to the U.S.’s largest cities first.\n"),
        "will apply to the U.S.",
      ),
    );
    assert.isNull(
      findWholeQuote(
        parseArticle("We compared the groups’ results over time.\n"),
        "We compared the groups",
      ),
    );
  });
});

describe("the Source a kept page becomes", () => {
  it("has a name a wikilink can reach, whatever its title holds", () => {
    const details = sourceOfPage(
      { ...pageOf(PAGE_A), title: "Memory [Review] | Part #2 ^x" },
      PAGE_A.markdown,
      "2026-11-18",
    );
    assert.strictEqual(details.title, "Memory (Review) - Part 2 x");
    const id = `${details.familyName} 2024 ${details.title}`;
    assert.strictEqual([...`[[${id}]]`.matchAll(WIKILINK)].length, 1);
    assert.strictEqual(linkSafe("a[b]c"), "a(b)c");
    assert.strictEqual(linkSafe("Methods.md"), "Methods");
    assert.strictEqual(linkSafe("What is README.md?"), "What is README");
  });
});

const pageOf = (page: typeof PAGE_A) => ({
  id: "w1",
  url: page.url,
  title: page.title,
  site: page.site,
  author: page.author,
  published: page.published,
  articleType: "web" as const,
  stance: "supports" as const,
  why: "",
  quotes: [],
  state: "kept" as const,
  source: null,
});

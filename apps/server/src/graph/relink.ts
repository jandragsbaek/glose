import { linkKey, MARKDOWN_CODE, parseWikilink, WIKILINK } from "@glose/contracts";

/**
 * The Markdown with every wikilink to the file `from` naming `to` instead, as Obsidian does
 * when a file is renamed: the shown words, a heading or block after `#` or `^`, a folder path
 * and the `!` of an embed stay. A wikilink inside code is not a Link, so it stays as written.
 */
export const relinkWikilinks = (markdown: string, from: string, to: string): string => {
  const key = linkKey(from);
  const code = Array.from(markdown.matchAll(MARKDOWN_CODE), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
  return markdown.replace(WIKILINK, (whole: string, inner: string, offset: number) => {
    if (code.some((range) => offset >= range.start && offset < range.end)) return whole;
    if (linkKey(parseWikilink(inner).target) !== key) return whole;
    const pipe = inner.indexOf("|");
    const ref = pipe === -1 ? inner : inner.slice(0, pipe);
    const shown = pipe === -1 ? "" : inner.slice(pipe);
    const anchorAt = ref.search(/[#^]/);
    const target = anchorAt === -1 ? ref : ref.slice(0, anchorAt);
    const anchor = anchorAt === -1 ? "" : ref.slice(anchorAt);
    // Keep what is around the name: spaces, a folder path, a `.md`.
    const [, before = "", after = ""] = /^(\s*(?:.*\/)?).*?((?:\.md)?\s*)$/i.exec(target) ?? [];
    const open = whole.slice(0, whole.indexOf("[[") + 2);
    return `${open}${before}${to}${after}${anchor}${shown}]]`;
  });
};

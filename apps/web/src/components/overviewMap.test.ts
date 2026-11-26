import { describe, expect, it } from "vite-plus/test";

import { overviewPicture, overviewView } from "./overviewMap.ts";

describe("the Overview's picture", () => {
  it("gives a paragraph as many rows as the editor measured, and a Reference a dot", () => {
    const { rows, references } = overviewPicture(
      [
        {
          top: 0,
          height: 78,
          text: "It is **very** easy to feel busy.[[Busyness]]{p. 64} Busyness looks like work from the outside.",
        },
      ],
      30,
      26,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.top)).toEqual([0, 26, 52]);
    expect(references).toHaveLength(1);
  });

  it("keeps the measured number of rows when no wrap width gives it", () => {
    const { rows } = overviewPicture([{ top: 0, height: 78, text: "aaaa bbbb cccc dddd" }], 9, 26);
    expect(rows).toHaveLength(3);
  });

  it("draws every heading the editor styles, whatever its number of marks", () => {
    const kinds = overviewPicture(
      [
        { top: 0, height: 40, text: "# One" },
        { top: 40, height: 40, text: "#### Four" },
        { top: 80, height: 40, text: "##\tTabbed" },
      ],
      40,
      26,
    ).rows.map((row) => [row.kind, row.text]);
    expect(kinds).toEqual([
      ["h2", "One"],
      ["h3", "Four"],
      ["h2", "Tabbed"],
    ]);
  });

  it("skips blank lines, so the gaps between paragraphs stay empty", () => {
    const { rows } = overviewPicture(
      [
        { top: 0, height: 40, text: "## A heading" },
        { top: 40, height: 26, text: "" },
        { top: 66, height: 52, text: "one two three four five six seven eight" },
      ],
      20,
      26,
    );
    expect(rows.map((row) => [row.kind, Math.round(row.top)])).toEqual([
      ["h2", 4],
      ["p", 66],
      ["p", 92],
    ]);
  });

  it("keeps a short piece still and lets a long one move so its ends meet the piece's ends", () => {
    const base = { stripHeight: 700, scale: 0.14, viewHeight: 800 };
    const short = overviewView({
      ...base,
      pictureHeight: 500,
      scrollTop: 600,
      scrollMax: 1200,
      viewTop: 600,
    });
    expect(short.offset).toBe(0);
    expect(short.viewY).toBeCloseTo(84);

    const long = { ...base, pictureHeight: 1400, scrollMax: 9000 };
    expect(overviewView({ ...long, scrollTop: 0, viewTop: 0 }).offset).toBe(0);
    expect(overviewView({ ...long, scrollTop: 9000, viewTop: 9000 }).offset).toBe(700);
    expect(
      overviewView({ ...long, scrollTop: 4500, viewTop: 4500 }).boxPerScrolledPixel,
    ).toBeGreaterThan(0);
  });
});

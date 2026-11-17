---
version: 1
slug: "src-components-reader-tsx"
primary_target: "src/components/Reader.tsx"
related_targets:
  [
    "src/components/ReaderMargin.tsx",
    "src/components/ReaderParts.tsx",
    "src/components/Deeper.tsx",
    "src/components/ArticleText.tsx",
    "src/components/AddArticle.tsx",
    "src/components/AddLessons.tsx",
    "src/routes/sources.$sourceId.tsx",
  ]
---

# The Reader (The Critical Edition)

Mode: Read. The Read step of an Article or Course lesson at `/sources/<Source>` (while
`reading-step` is `read`, or with `?text=1` from a later step), plus Add Source for Articles and
Course lessons (`/sources/new?kind=article|lesson`).

Audience and task: a reader at a desk in a long, focused stretch (Jan with 20 AI-course lessons,
his girlfriend with academic papers). They read the text, mark Passages, write their own words on
them, go deeper on one with the Probe, and make Points. Success: they finish with Passages that
carry their words, the hard parts taken deeper, and Points waiting in Extraction, each with an
exact Location (`¶ 8`).

Chosen by Jan with impeccable (Nov 2026), "The Critical Edition", over Facing Pages and Passage
Slips.

## Direction contract

THESIS: The text is set like a scholarly edition: contents at the side, every paragraph numbered as
its Location, the reader's Passages gathered in an apparatus under the text. It refuses the
e-reader with a highlight sidebar and the chat-beside-a-PDF arrangement.

OWN-WORLD: Glose's Call Numbers world unchanged. A Paper leaf on Ground; paragraph numbers in
Courier in the gutter (Lapis where a Passage sits); a Passage is a kept selection in Gilt Wash,
its underline saying its work (Gilt marked, Lapis taken deeper, Verdigris a Point); the apparatus
under a heavy Ink rule; the margin a Panel with a Cinzel initial; the mark bar a small Lapis strip.

STORY: The reader opens where they left off, reads, selects words and marks them (M) or goes
deeper (D), writes their words or a Point in the margin, answers the Probe on that Passage, and at
the end chooses Points first or the Probe first.

FIRST VIEWPORT: Page head with title, author, course or site, call number, and the lesson before
and after. A Ground band: the Step Bar (Read · Extraction · Probe) and the keys. Three columns:
Contents (190–240px) with the current section in a Gilt edge, the leaf (up to 780px, 66ch text,
17px/1.7) with ¶ numbers in an 88px gutter and the sticky apparatus at its foot, and the margin
(300–360px): Reading notes, or the open Passage.

FORM: The Critical Edition, position 7 of 7 on the ordered list (dealt lead). seed:a61e6f5013727dd0

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Course images: copied beside the text, or left out (today: a line says the image was not
  copied).
- PDF import (later).

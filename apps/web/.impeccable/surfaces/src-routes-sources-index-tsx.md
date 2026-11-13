---
version: 1
slug: "src-routes-sources-index-tsx"
primary_target: "src/routes/sources.index.tsx"
related_targets: ["src/components/Rail.tsx"]
---

# Sources

Mode: Operate. The Sources page at `/sources`: every Source in the Graph, reached from the rail
under Today and above the rule (a place like Today, not a Section).

## Audience and job

Jan and his girlfriend, at a desk, with 150+ Sources of many kinds after a year. In order of
weight: find a Source and continue it; see which Sources share Links through their Notes;
prepare for writing (which Sources are ready to cite, what to fix first).

## Confirmed decisions

- Rail place: Today, Sources, then the rule, then the three Sections (Jan, November 2026).
- Structure: The Accession Register, chosen over The Faceted Catalogue and The Shelf and the
  Record on the impeccable decision page.
- Kind (book, video, article) waits for video Sources to be designed; no Kind column or filter
  until the data exists.

## Direction contract

THESIS: What you read stands on the desk; everything else is one long register you search, sort
and read down. Connections show in place: pick a Source and the rows it shares Links with light
up in the register. It refuses a grid of book covers and a dashboard of counts.

OWN-WORLD: Glose's Call Numbers world, unchanged: lapis rail and spines with gilt bands, white
panels on ground with Cinzel initials and the rubric flourish, typed call-number labels. State is
a mark in a fixed cell (verdigris filled done, gilt-underlined current, hollow not yet; rubric
icon and words for missing data). Rank comes from weight, never from bigger type.

STORY: The user sees the Sources in progress and continues one in a click; searches or sorts the
register to find any Source and opens it; picks a Source to see which others share its Links and
how many; reads down the Citation column to see what to fix before writing.

FIRST VIEWPORT: Rail with Sources current (gilt icon). White header: "Sources", a muted count
line, primary Add Source right. Panel "On the desk": the in-progress Sources side by side, each a
56px spine, title, author, Reading marks with the step, a missing-data line, primary Continue.
Panel "The register" under it: search, a segmented sort (Added, Call number, Author), Reading and
Citation selects, the Links hint pushed right; then the table (call number, title and author,
Reading marks, Notes, with a Location, Links to other Sources, Citation), with group rows (month
added, or initial letter).

FORM: Surface structure 4 of 7 (dealt lead). seed:5c8a16344c6483c5

Signature interaction: the Links cell of a row is a toggle; pressed, the row turns Lapis Tint,
every row it shares Links with gains a 3px lapis edge and "N shared" in Lapis 700, and the hint
names the Source. Motion: 160ms ease-out on the tint and the edge only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open

- When a Source was added is not stored today. Decision: Glose writes `added` (a date) in a new
  Source's frontmatter; a Source without it falls back to the file's creation time, then its
  last change.

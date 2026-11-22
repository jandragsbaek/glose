---
version: 1
slug: "apps-web-src-routes-people-personname-tsx"
primary_target: "apps/web/src/routes/people.$personName.tsx"
related_targets: ["apps/web/src/components/CareerLine.tsx"]
---

## Scope

Person page, `/people/<Person>` in apps/web. Mode: Operate. A Person is a Rich note (`glose: person`) at the top of the Vault; it has no single Source. Jan chose "The Career Line" on the decision page (20 November 2026) over "Their Shelf" and "The Authority Record". Sample content only (Cal Newport in the demo Vault).

## Audience and job

Jan and his girlfriend, at a desk, gathering what they know about one person: the books and talks of theirs in the Vault, the Notes kept from each, their own words on the person, and the other People the person links to.

## Direction contract

THESIS: A person is their work over time. The page owns one Career Line: every Source by the person as a call number on a year rule, books and talks alike; choosing one opens its Notes under the line. It refuses a profile card with a bio on top and an undifferentiated list of files.

OWN-WORLD: Glose's established world, unchanged: lapis rail, white Paper panels on Ground with Cinzel initials and the rubric flourish, call numbers as typed Courier labels, Gilt for "here" (the chosen work's underline), Accent rings where People meet, Rubric only for AI text. Public Sans data, tabular numerals.

STORY: The user sees at a glance what of this person's work they have, how far they read each, and where this person meets the others they keep. They open a work's Notes, read their own words on the person, and follow a Link to another Person.

FIRST VIEWPORT: Page head: crumb to Graph, the name (h1), sub-line "Person · N Sources · N Notes · N People", "Add a Source" at the right. Main column: "Works and talks" panel with the Career Line (stacked call-number labels above a year rule; book a filled dot, talk a hollow dot), and under it one quiet lane per linked Person with an Accent ring at the work where their Links meet; a legend at its foot. Under it "From <work>" with that work's Notes (title, Growth, call number with page). Under it "In your words": the Person's body in an always-open editor (Links by `[[`, saved as the user pauses; AI text shown marked with "Rewrite in the Graph"). Then "From <work>". Side column: People (each with the sentence that links them), Properties. Head action: "Add a Source", prefilled with the name (decided 22 November 2026, see docs/ideas.md "Decided, writing a Person").

FORM: The Career Line; position 3 on the ordered list of seven grounded structures, dealt as the lead. seed:636c6579a4341ba3. Raise from the declined transit-diagram challenger: linked People as lanes with an interchange ring where Links meet.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- How a Person node looks on the Graph canvas (built as a lapis medallion: a filled node with a Paper ring inside; Jan may redesign).
- Matching a Source to a Person is by family and given name; aliases and co-authors come later.

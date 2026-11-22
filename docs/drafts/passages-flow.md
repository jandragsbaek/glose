# Draft: words from a book as their own node (UX flow, round 3)

Jan's ask (2026-11-22): "extracts from books as an entirely node type, which is basically just a
raw reference to a quote from a book, which I then can write a note about (or AI can), and we can
link notes together, like in actual zettelkasten. I'm not sure how we can do this flow properly,
when working through a book."

Context: read `docs/ideas.md` and `GLOSSARY.md`. A book is read **elsewhere** (a paper copy or an
e-reader); Glose has no text of it. Today a book's Reading Stage is Free text → Extraction → Probe,
and the AI can quote only the user's Free text. An Article already has **Passages** (words the user
marks in the text, kept inline as `==words==`).

## 0. The term and the rule

A book's quote is a **Passage**, as in an Article: the author's words that the user kept, with
their Location and the user's own words on them. The glossary entry widens to books. Storage
differs (an Article's Passage is inline in its text; a book's is its own file), behaviour does not:
a Passage has words, a Location, the user's words on it, and the Notes that use it.

The rule that makes it zettelkasten: **a Passage holds the author's words, a Note holds mine.** A
Passage is never a Note and has no Growth. Glose keeps no Passage words that the user has not
confirmed against their copy (so a later photo capture can propose words, and the user confirms
them).

A Passage is not a debt. Many Passages stay useful as evidence and never become Notes. Glose shows
what each Passage became, and never counts the unused ones as work owed.

## 1. The file

`Passages/<Source file name> <Location> <first words>.md` (the Location as given, with `p.` before a
bare number: `p. 47`, `Loc 1234`, `xii`; the words cut to fit a safe name; more words when two names
clash), in a `Passages` folder that Glose reads as part of the Graph. **The
name is fixed at capture**: editing the words or the Location changes the body, never the name, so
footnotes never break.

```md
---
glose: passage
source: "[[Newport 2016 Deep Work]]"
page: "47"
created: 2026-11-22
---

> Deep work is the ability to focus without distraction on a cognitively demanding task.

The definition the whole book leans on.
```

- The quote is a blockquote. The line under it is optional: **your words on it** (a fleeting
  thought, in Ahrens' terms the start of a literature note).
- `page` is the Location, the same key a Note uses for its Location (a timestamp on a Video Note), a
  string: `47`, `47–48`, `xii`, `Loc 1234`. It is **not
  required**. A Passage without it saves and shows "No page: cannot be cited" (ideas.md: warn, not
  block).
- A Note that uses a Passage cites it in a footnote **with the words**, as New Note research does:
  `[^q1]: “Deep work is the ability to focus …” [[Newport 2016 Deep Work p. 47 Deep work is the ability|p. 47]]`.
  The Note stands alone in any editor. Glose checks the footnote words against the Passage with
  the exact-words check it already has.
- Delete is withheld while a Note uses the Passage ("Used in 2 Notes"). Edit on a used Passage says
  "Used in 2 Notes", and the same save changes the footnote words and Location in those Notes. No new state.
- A Passage is not a Note for the AI or the counts: `search_graph`, `propose_links`, Find Links and
  the Graph's Note counts skip the `Passages` folder, so the AI never proposes a Link to a Passage.

## 2. Working through a book: the main path

A book takes weeks. The unit of work is **one sitting**: read some pages away from Glose (pencil,
flags, e-reader highlights), then sit at the desk and keep what mattered. Each sitting has three
moves, each optional: **Capture → Write → Connect.**

### 2.1 The way in and the way out

- "Where are you with this book?" gets a fourth answer: **"I'm reading it now"** → Passages →
  Extraction → Probe (`reading-start: reading`). The three current answers assume the book is done.
- For that start, **Passages is the first step** of the step bar, as Read is for an Article and
  Watch for a Video. The Free text is in the Passages page's margin, as the reading notes are in
  the Reader's margin.
- Whatever the start, Passages stays open from every step ("Passages 12" in the step bar), as "Read
  the text" does for an Article. A user on another start can still capture.
- **Done reading** at the foot of the Passages page asks what comes next, as for an Article: Make
  Points (Extraction, then the Probe) or Question me first (the Probe, then Extraction).

### 2.2 Capture (the book open beside the keyboard)

The Capture strip sits at the top of the Passages page, keyboard first:

- **Page** (small field), **the words** (a large box) and **Your words on it** (one line,
  optional), in that Tab order. The cursor starts in the words; Shift+Tab reaches Page.
- **Ctrl+Enter** keeps the Passage, clears the words, keeps the page. While the page stays open the
  page carries, shown as carried ("p. 47, as before"), so a reused page is visible before the save.
  A new visit starts with Page empty and a hint, "Last time: p. 52".
- Paste keeps the text as pasted. When the paste has an e-reader tail with a location ("Kindle
  Location 1234", "Page 47"), Glose offers "Use Loc 1234 as the page"; the text stays intact until
  the user accepts. When the paste has broken lines, a small "Join the lines" offers to mend them.
  No silent edits.
- The same words from the same Source again warn at save ("You kept these words on 12 Nov"), and
  never block.
- The words box keeps one draft, saved apart from other saves (as a Video's watch notes are), so
  half a quote survives leaving the page.
- The book's edition shows in the strip's head ("Your copy: Piatkus 2016, 1st ed."), since the page
  numbers belong to it.

Follow-ups, not in this round: a photo of the page whose words the user confirms, a Kindle
`My Clippings.txt` import.

### 2.3 The stack

Under the Capture strip: every Passage of the Source **in page order** (the book's argument order;
numbers read as numbers, so p. 100 comes after p. 47; a Passage without a Location sits by when it
was captured),
as slips: Location, the words, your words on it, and what it became: the Notes that use it (as
links), or nothing.

- Filter: **All** (default) / **Unused**.
- Select one slip or several (click, Shift-click, X on the focused slip).
- Actions: **Write a Note** (primary), **Edit**, **Delete** (withheld while used).

### 2.4 Write (the zettelkasten move)

**Write a Note** on one or more Passages opens the Note leaf New Note has ("The Commonplace Leaf"),
**without the Research panel and without a web pass**.

- **Rests on** is the book. The chosen Passages are numbered under the text, `[1]`, `[2]`, each with
  its Location. (The leaf's "Kept quotes" band is named for the Passages here.) The Note's page is the Passage's Location when there is one Passage; with several, it
  is empty for the user to set (the footnotes carry each Location).
- The title is a claim in the user's words ("What do you take from this, in one sentence?"). It is
  required before Save and before Ask the AI for a draft, so a draft never rests on the Passage
  alone.
- The text field opens **blank**, with the Passages and your words on them in view above it.
- **Ask the AI for a draft** runs in the Source's Extraction Session (`draft_note`), not in a new
  one. The draft shows **beside** the field, marked as AI text (the rewrite desk's rule). The user
  writes their own, or takes the draft in, where it stays marked (Seed). Nothing they typed is lost.
  (So `draft_note` has two behaviours: in Extraction's open Point it replaces the text, as today;
  here and for Points from Passages, 2.5, it shows beside. Recorded as a decision.)
- **Find Links** runs only on request (the Links pass: `search_graph`, `read_note`,
  `propose_links`), each proposal with its reason and whether the Note **repeats** or **pulls
  against** it. The user can open a proposed Note in the Graph's side panel before keeping it, and
  comes back to the leaf with the draft intact. A kept Link goes on the `Related:` line with the
  reason as a starting sentence ("Related: [[…]], because …"), to edit. Typing `[[` in the text
  links by hand, as everywhere.
- Save is always available. It writes the Note (top of the Vault, `source` = the book), the
  footnotes with the words, and returns to the stack with the next unused Passage focused. The
  user can stop after one Note.

### 2.5 The AI path: Extraction reads the Passages

For a book, Extraction gains one tool, `read_passages`. It proposes Points that rest on Passages
(origin "From your Passages, p. 47, p. 52"); Glose keeps a quote only when a Passage holds those
words. `read_passages` gives each Passage with the Notes that use it, so the AI knows what was
written by hand, drafted or not. Unused Passages come first; for each proposed claim the AI checks
whether it `repeats` a saved Note (one Passage can support several claims, so a used Passage is
not skipped).

**A kept Point that rests on Passages is written the same way as 2.4**, in place in Extraction:
its Passages in view, the text blank, the AI's draft beside it (marked when taken in), Find Links
on request, and on Save the footnotes with the Passage words and each Location. So every Note from
Passages cites them, whichever door it came through, and the stack shows it.

When it runs: when the user chooses it (Done reading → Make Points, or the Extraction step). It is
one Session per Source, as today. One line on the Passages page says the rule: "Write Notes as you
go. When you finish the book, Extraction starts with the Passages you have not used."

This answers the open question "How does the tool check a quote without the full text?" for books.

### 2.6 What shows where

- **Graph canvas**: Passages are **hidden by default**. Selecting a Source or a Note shows its
  Passages in that neighbourhood only (small nodes linked to it). No global toggle in this round.
- **Graph side panel**: a Source lists its Passages count and opens the stack; a Note lists the
  Passages it rests on, each with words and Location; a Passage (opened from either) shows its
  words, Location, your words on it, the Notes that use it, and **Write a Note**.

## 3. A worked sitting

Jan reads ch. 2 of _Deep Work_ on the sofa with a pencil, marks 5 lines. At the desk:

1. Sources → On the desk → Deep Work → Continue opens Passages (his start was "I'm reading it now").
2. Shift+Tab, `47`, Tab, the quote, Ctrl+Enter. The next quote (p. 47 carried), Ctrl+Enter.
   Shift+Tab, `52`, Tab, the quote, Tab, "this contradicts Csikszentmihalyi?", Ctrl+Enter. Two more.
   4 minutes.
3. Selects both p. 47 slips → Write a Note. Title "Deep work needs an unbroken stretch of focus".
   Writes two sentences. Find Links proposes [[Attention residue lowers performance after
   switching]] and "pulls against [[Flow needs clear goals]]". Keeps both, edits the "because".
   Save → back at the stack, p. 52 focused.
4. p. 52: tired, he asks for a draft, reads it beside his empty box, takes it in. Seed, marked.
5. Leaves p. 61 and p. 63 unused. Nothing nags him.
6. Weeks later, last chapter done: Done reading → Make Points. Extraction proposes Points from the
   unused Passages and the Free text; the Probe follows.

## 4. Cut or deferred (round 1 → round 2)

Cut: the Today reminder, the Sources register column, a global Passages toggle on the canvas, the
"looks unfinished" Passage shape, the automatic switch to a Waiting filter, cross-Source Passage
search in the leaf, and direct Passage References in Writing projects (a Reference to the Note
already carries the words and the Location).

Follow-ups: photo capture, Kindle import, the Probe reading the Passages, "Write a Note" on an
Article's Passages, a "one idea or several Notes?" hint on a big selection.

## 5. Docs to update when this is decided

GLOSSARY.md: widen **Passage** to books (its own file), and the Relationships line on how each kind
of Source starts. ideas.md: `reading-start: reading`, the book's Passages step, `read_passages`,
`draft_note` beside the field for Passages, and the Passages folder in the Graph.

## 6. What changed in round 3

- Fixed: a kept Extraction Point from Passages is written like 2.4, with the footnotes (Sol's
  blocker, Opus note 1); `read_passages` is the AI's source for used Passages; the claim, not the
  Passage, is checked for `repeats` (Sol). Tab order Page → words → your words, cursor in the words,
  and the worked sitting to match (Opus). Editing a used Passage updates its footnotes (Opus).
  Passages skipped by Graph search, Links and counts (Opus). Title required before a draft and Save
  (Muse). Page order with numbers read as numbers (Muse). Location as given in file names, the
  `page` key stated (Muse). Duplicate warning (Muse). Location carried within a visit only, paste
  location offered, not moved (Sol). Typed `[[` Links and the return from a proposed Note (Sol).
  Docs list (Opus).

## 7. What changed since round 1

- Fixed: footnotes carry the words (Opus B1); the leaf's AI runs in the Extraction Session, no
  Research or web pass (Opus B2); a fourth start answer, Passages as the first step, Done reading
  (Opus B3); a kept draft of the words box, Location not required (Opus B4, Sol); Location as a
  free string, a Note's page not taken from the first Passage (Muse B4, Sol); no debt counter,
  default All, Unused filter (all three); one rule for when Extraction reads Passages, unused
  first, `repeats` for used ones (Muse B3); AI draft beside a blank field, Find Links on request,
  Save always available, back to the stack after Save (Sol); paste kept as pasted, cleanup offered
  (Sol); stable file names, Delete withheld while used (Muse, Sol); edition shown in capture (Sol);
  the label "Your words on it" (Opus, Muse); Passages hidden on the canvas (all three).
- Not taken: a required "In my words" line before Write a Note (Muse B1). The Note is the own-words
  work; a gate before it adds a second box that says the same. The draft is beside a blank field
  and its text stays marked, so the AI cannot skip the user's thinking silently. A `checked: true`
  state per Passage (Muse B2): typing from the copy is the check; the stated rule covers future
  photo capture. Kindle import in this round (Muse B2): kept as the first follow-up, to ask Jan
  how he reads.

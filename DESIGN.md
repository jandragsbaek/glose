---
name: Glose
description: Call Numbers, embellished in Rubric & Lapis. A reading and writing desk where every Source wears a call number and ornament stays at the edges.
colors:
  lapis: "#1e2f7a"
  lapis-raised: "#2b3e92"
  lapis-line: "#3a4c9c"
  on-lapis: "#ffffff"
  on-lapis-mute: "#c3cbec"
  gold: "#c8a040"
  gold-wash: "#f6efdc"
  rubric: "#b3261e"
  rubric-wash: "#fbeceb"
  rubric-line: "#e7c9c6"
  verdigris: "#3e7c5a"
  ground: "#fbfaf7"
  paper: "#ffffff"
  ink: "#141414"
  mute: "#5c5f6a"
  line: "#dedde3"
  line-strong: "#c9c8d1"
  tint: "#eef0f8"
  tray: "#f3f2ee"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  panel-heading:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  initial:
    fontFamily: "Cinzel Decorative, Cinzel, serif"
    fontSize: "2em"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "0"
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-writing:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
  meta:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: '"tnum"'
  rail-label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.25
  call:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "18px"
    fontFeature: '"tnum"'
  code:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "0.14em"
    fontFeature: '"tnum"'
  review-question:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  review-answer:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
  review-start-count:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  label: "2px"
  base: "4px"
spacing:
  2xs: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.on-lapis}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.lapis-raised}"
    textColor: "{colors.on-lapis}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.base}"
    padding: "8px 12px"
  textarea-writing:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-writing}"
    rounded: "{rounded.base}"
    padding: "16px 18px"
    width: "72ch"
  choice-selected:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "16px 20px 20px"
  call-number:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.call}"
    rounded: "{rounded.label}"
    padding: "1px 7px"
  call-number-missing:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.rubric}"
    typography: "{typography.call}"
    rounded: "{rounded.label}"
    padding: "1px 7px"
  spine:
    backgroundColor: "{colors.lapis}"
    width: "56px"
    height: "136px"
  rail:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.on-lapis-mute}"
    width: "96px"
    padding: "16px 8px"
  rail-link-active:
    backgroundColor: "{colors.lapis-raised}"
    textColor: "{colors.on-lapis}"
    typography: "{typography.rail-label}"
    rounded: "{rounded.base}"
    padding: "12px 4px 10px"
  step-current:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    padding: "10px 14px 9px"
  notice-warning:
    backgroundColor: "{colors.rubric-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
  button-quiet:
    textColor: "{colors.mute}"
    rounded: "{rounded.base}"
    padding: "0 12px"
    height: "36px"
  button-quiet-hover:
    textColor: "{colors.ink}"
  key-cap:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.mute}"
    rounded: "{rounded.base}"
    padding: "0 6px"
    height: "22px"
  key-cap-on-primary:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.on-lapis}"
  review-leaf:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.review-question}"
    rounded: "{rounded.base}"
    padding: "40px 48px 36px"
    width: "720px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    width: "min(560px, calc(100vw - 32px))"
  typed-code:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.label}"
    padding: "6px 14px"
  link-button:
    textColor: "{colors.lapis}"
  segmented-option:
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "9px 12px"
  segmented-option-selected:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.lapis}"
  select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "9px 34px 9px 12px"
  register-cell:
    textColor: "{colors.ink}"
    padding: "9px 12px"
  register-group:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    padding: "6px 12px"
  register-row-selected:
    backgroundColor: "{colors.tint}"
  register-links:
    textColor: "{colors.lapis}"
  reading-mark:
    backgroundColor: "{colors.paper}"
    size: "9px"
  reading-mark-done:
    backgroundColor: "{colors.verdigris}"
    size: "9px"
  review-start-leaf:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.review-start-count}"
    rounded: "{rounded.base}"
    padding: "22px 28px"
    width: "980px"
  tray:
    backgroundColor: "{colors.tray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "14px 12px 12px"
  slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
  tray-folded:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "16px"
---

# Design System: Glose

This file records the visual system as it is built today in `apps/web/src`. It is the current
committed state, not a fixed rule set: Jan designs Glose's UI, and every visual choice
(layout, color, type, window chrome, icons) goes to him. A change he approves updates this file.
Light theme only; a dark theme is planned and not yet designed.

## Overview

**Creative North Star: "Call Numbers, embellished in Rubric & Lapis"**

Glose is a library desk, not a file tree. Every Source wears a call number (three letters of
the author's family name and the first-publication year, typed on a white label) that leads
back to the page. The app is embellished the way old books are: at the edges, never in the
text. A lapis rail holds the Sections like a bound spine; panels are white leaves on a
near-white ground, each opened by a decorated initial and a small red pen flourish set in a
hairline rule.

The mode is Operate. Density is calm and working: lapis marks the next step, panels that
say what to do next when empty, data set plainly in Public Sans with tabular numerals.
Ornament (Cinzel initials, the flourish, gilt bands, the gold current marker) lives on headings
and chrome. Data, Note text and controls stay plain. The world refuses the category's
file-tree-plus-editor arrangement in neutral grey, and it refuses dashboards and gamification.

Every string comes from the English and Danish catalogs (`i18n/en.ts`, `i18n/da.ts`; the lint
rule `glose/no-untranslated-ui-text` enforces this), and every layout takes the longer Danish
compounds without clipping.

AI text carries rubric marks at its edge (a red pilcrow, a gloss and a rule) while the text
itself stays ink; see the AI Text component.

**Key Characteristics:**

- Lapis rail (96px) of large icons with labels under them: Today and Sources above a short rule,
  the Sections below it; gold marks the current one.
- White panels with hairline borders; each heading opens with a rubric or lapis Cinzel initial,
  alternating down a column, above a hairline with a rubric pen flourish in its middle.
- Call numbers as typed white spine labels in Courier Prime with a 1px ink border.
- Flat surfaces; depth comes from hairlines and the ground/paper step, not shadows.
- Red is a signal with fixed jobs, never a decoration of data.
- State is a small mark in a fixed cell (Reading marks, a Citation check or triangle); rank comes
  from weight, never from bigger type.
- A focus screen (Review) drops the rail and the page header: one Paper leaf on Ground.
- Recall is a desk: today's Review leaf on top, and under it Trays (a well a step darker than
  Ground) that hold the Cards as Paper slips, sorted by the work they need.

## Colors

A cool, bookish palette: one deep lapis field, white paper on a warm near-white ground, and
three small pigments (gold, rubric red, verdigris) each with one job.

### Primary

- **Lapis** (lapis): the rail, the Source spine, the primary button, links and link buttons, focus outlines on
  paper, the caret and native accent color. The one large field of color on any screen. In the
  Sources register it is also the Links toggle, the ring of the current Reading mark, the checked
  segment's label, and the 3px edge on rows that share Links with the chosen Source. In the Probe
  it is the question number and the head of each judgment gloss.
- **Raised Lapis** (lapis-raised): rail item hover and current state; primary button hover.
- **Lapis Rule** (lapis-line): hairlines and outlines on the lapis field (rail divider, the
  language switch border).
- **On-Lapis White** (on-lapis) and **Lapis Mist** (on-lapis-mute): text and icons on lapis;
  white for current and hover, mist for resting rail labels.

### Secondary

- **Gilt** (gold): the "you are here" marker. The current rail icon, the current step's 3px
  underline, the 2px underline under the current Reading mark, the two gilt bands on a spine, and
  the focus outline on lapis. Also the triangle of a Check that warns on a Recall slip, beside
  Ink words. Never text on paper.
- **Gilt Wash** (gold-wash): text selection only.

### Tertiary

- **Rubric** (rubric): decorated initials, the pen flourish, AI text (the AI Text component), and
  signals of missing data or error, always paired with an icon and words (on a Recall slip, the
  triangle and words of a Check that fails). In the Probe, at 16% (`rgb(179 38 30 / 16%)`), it
  is the faint highlight under the words of the user's Reasoning a judgment points at.
- **Rubric Wash** (rubric-wash): the background of a stand-alone warning notice.
- **Rubric Line** (rubric-line): the border of a stand-alone warning notice.
- **Verdigris** (verdigris): done. The check icon and 3px underline of a finished step, the
  check of a finished sheet and the "Copied" check, a filled (done) Reading mark, and the check
  and "Ready" of a Source ready to cite. In the Probe, the check of a sound Reasoning, a right
  result and a known topic.

### Neutral

- **Ground** (ground): the page behind panels and the setup body; the group rows of the register;
  the band over the Probe and the user's turns in a transcript.
- **Paper** (paper): panels, the page header, inputs, buttons, call-number labels.
- **Ink** (ink): text, secondary button border, call-number and typed-code border; at 32%
  (`rgb(20 20 20 / 32%)`) the veil behind a sheet.
- **Mute** (mute): secondary text, hints, meta, empty-state copy, field legends, fact labels,
  the Review progress line, rating intervals and key-cap letters.
- **Hairline** (line): panel borders, header rule, row and step dividers, the flourish rule.
- **Strong Hairline** (line-strong): input and choice borders, the segmented control's border and
  dividers, key-cap borders, the ring of a Reading mark not reached yet, the border of a leaf over
  the page (the Versions panel, a sheet), the left rule of a Probe judgment gloss, scrollbar thumb.
- **Lapis Tint** (tint): secondary button hover, the current step, a selected choice, a hovered or
  checked segment, the register row whose Links are shown.
- **Tray** (tray): a warm well a step darker than Ground, behind the Recall Trays only, so the
  Paper slips in it read as lying in a tray. A neutral, not a field of color.

### Named Rules

**The Rubric Rule.** Rubric red marks the decorated initials, the pen flourish and AI text.
When red marks an error or missing data, it always comes with a warning icon and words; red
alone never carries a meaning. The Probe's faint highlight under the user's words follows the
same rule: the gloss beside it gives the triangle and the words.

**The Gilt Marker Rule.** Gold says "here": the current Section, the current step (in the Step
Bar and under a Reading mark), a spine's bands, focus on lapis. It has one more job: the triangle
icon of a Check that warns on a Recall slip, always beside Ink words ("Could be better · …").
It is never used for text on paper or for decoration elsewhere.

**The One Field Rule.** Lapis is the only large color field (rail, spine, the primary button).
Panels and the page stay paper and ground; the one other surface is the neutral Tray well under
Recall's slips.

**The Ribbon Edge Rule.** A 3px Lapis edge on the left of a register row says "this Source shares
Links with the one you chose", like a ribbon marker in a book. It is the one place a side edge
marks rows, and it never comes alone: the row's Links cell reads "N shared" in Lapis 700, and the
hint above the table repeats the same edge beside a sentence that names the Source.

## Typography

**Display and UI Font:** Public Sans 400/500/600/700 (with system-ui, sans-serif)
**Initial Font:** Cinzel Decorative 700 (with Cinzel, serif)
**Label Font:** Courier Prime 400/700 (with ui-monospace, monospace)

All three are self-hosted via @fontsource. **Character:** a plain, civic sans does all the
working text; a typewriter face types the library labels; a decorated capital appears once per
heading like an illuminated initial.

### Hierarchy

- **Display** (700, 30px, 1.2, -0.015em): the first-start title only, with a Cinzel initial
  at 1.35em.
- **Headline** (700, 22px, -0.01em): the page title in the white header.
- **Title** (700, 21px, 1.25): the current Source's title on Today.
- **Panel heading** (600, 13px, 1.3, 0.06em tracking, uppercase): every panel's `h2`; its first
  letter is the Initial. Fieldset legends use the same set in Mute. The Review bar title uses
  the same set, with a lapis Initial.
- **Initial** (Cinzel Decorative 700, 2em of the heading, 0.9 line height): the panel heading's
  first letter, in rubric or lapis.
- **Body** (400, 15px, 1.5): all running text; empty states cap at 62ch.
- **Body for writing** (400, 16px, 1.65, max 72ch): the Free text area.
- **Review question** (700, 28px, 1.3, -0.01em, max 30ch, balanced wrap; 24px on phones): the
  question on the Review leaf.
- **Review answer** (400, 21px, 1.5, max 40ch; 18px on phones): the answer on the Review leaf.
- **Review count** (700, 24px, 1.2, -0.01em, balanced wrap): the one headline on Recall's Review
  leaf ("12 Cards to review today"; no full stop).
- **Probe question** (600, 16px, 1.6, pretty wrap): the AI's question in the Probe transcript.
- **Label** (600, 14px): buttons, field labels, step names, row titles.
- **Meta** (400, 13px, tabular numerals): hints, step notes, panel meta, status lines.
- **Rail label** (500, 12px, 1.25): Section names under rail icons; they wrap and hyphenate.
- **Call** (Courier Prime 700, 12px/18px, tabular): call numbers, step numbers and the Probe's
  question numbers (in Lapis); the Location part of a call number is 400 in Mute.
- **Code** (Courier Prime 700, 28px/36px, 0.14em tracking, tabular): a code the user types
  elsewhere, today the GitHub sign-in code in the Backup sheet; see Typed Code.

### Named Rules

**The One Initial Rule.** Cinzel Decorative appears only as the first letter of a panel heading,
the setup title or the Review bar title, through `::first-letter`, so the heading text stays
whole for screen readers. Never on data, buttons or body.

**The Typed Label Rule.** Courier Prime is for call numbers, step numbers, the Probe's question
numbers ("Q6"), repository names in the
Repository Rows (a repository is the Graph's shelf mark on GitHub) and a code the user types
elsewhere (the GitHub sign-in code) only.

## Layout

A two-column frame: the 96px lapis rail, then a scrolling main area. The main area opens with a
white page header (title, a muted sub-line such as the date, actions pushed right; it wraps), and
then the page body (24px top, 32px sides, 40px bottom) on Ground.

The main column ends in the Status Bar, a 28px running foot under the main area only, so the
rail stays a full-height spine.

Working pages use a main column plus a 300 to 380px side column with 20px gaps; panels stack in
each column with 20px gaps. Below 1080px the columns become one, in reading order. Form and
single-topic pages cap at 760px. First start keeps a bare lapis band at rail width with the
setup body at 48px top.

Spacing steps through 4, 6, 8, 12, 16, 20, 24 and 32px; panel bodies pad 16px 20px 20px and
heads pad 14px 20px. Forms use a two-column field grid (16px row, 20px column gaps) with wide
fields spanning both.

The Sources page (`/sources`) is one column of two full-width panels with 20px between: On the
desk, then The register. The header carries "Sources", a Mute count line ("10 Sources · 2 in
progress") and Add Source (primary) on the right. The desk sets its Sources side by side in a
grid of 300px-minimum cells with 24px gaps. The register's tools wrap on one band (10px row, 8px
column gaps, 16px 20px 14px padding) with the hint pushed right; the table under them scrolls
sideways inside the panel rather than squeezing, since its cells don't wrap (only the title
cell, at least 18em). Below 720px the segmented control and the selects wrap too.

The Recall page (`/recall`) is a desk in one column with 28px between its parts. The header
carries "Recall" and a Mute count line ("240 Cards · 12 with AI text"). First the Recall Review
leaf, centred, up to 980px wide, with up to three paper edges under it. Then the Card desk (16px
gaps): a find row that wraps (8px 16px gaps) with the find field, a `role="status"` line while
searching ("3 Cards match."), and, without ChatGPT, one quiet AI-Checks-off line pushed right
(Mute 13px with a 16px icon, no box); under it the three Trays side by side, To fix, To rewrite
and Good ("At rette", "At omskrive", "Gode"), in columns of 1fr, 1fr and 260 to 300px with 20px
gaps, each as tall as its slips. Below 1080px To fix and To rewrite share a row and Good runs
across under them; below 720px the Trays stack in one column and the Review leaf's parts stack
too (18px 20px padding). With no Cards at all, the page is one 760px empty panel.

Extraction (the Reading Stage past the Free text) fills the window under the header: a work
column (24px 32px 48px padding, content up to 960px, its own scroll) and a 360 to 420px margin
column for the Session on Paper, divided by a full-height Hairline. The margin's transcript
scrolls; its message box stays at the foot (16px 24px 18px, a Hairline above). Below 1080px the
margin moves under the points and the page scrolls as one; below 720px the work column pads 16px.

The Probe (the Reading step that questions the user on a Source) also fills the window under the
header, as one column of three bands. The page head carries the actions on the right: Free text
(quiet; it opens the Free text and the Source's details above the transcript) and, once a question
is asked and until the Probe is finished, Finish the Probe (secondary). Under the head, a Ground
band (16px 32px, a Hairline below) holds the Step Bar on Paper (up to 520px) on the left and the
tally on the right; it wraps, so the tally drops under the step bar when narrow. Then the
transcript: a Paper leaf with its own scroll (24px 32px 40px), set as a 680px column and a 240 to
300px gloss margin, 36px apart, centred as a pair. The answer box stays at the foot (14px 32px
16px, a Hairline above, Paper) on the same two columns. Below 1080px the gloss goes under its turn
in the one column, the answer box keeps two columns (the answer side 220 to 270px, 20px apart) so
the transcript keeps its height, and the Probe keeps its own scroll. Below 720px the three bands
pad 16px at the sides.

Writing projects (`/writing`) is one column of two full-width panels: "Start a new piece" (the
Specimen Leaves) above "Your pieces" (a register table). A Writing project (`/writing/<id>`) is the
Writing Desk: a sticky 56px bar, then a five-track grid, `1fr | 180–250px | up to 680px |
200–290px | 1fr`, that sets the leaf between two margins (32px top). Below 1200px the margins fold
under the leaf in reading order (left margin, then right) and the desk pads 24px; below 720px it
pads 16px.

A focus screen (today only Review, at `/review`) fills the window without the rail and the page
header. A 64px bar (12px 32px padding) holds the title left, a centred progress line and the way
out right; the desk below centres one 720px column (68px top, 32px sides, 48px bottom). Below
720px the bar pads 16px, the progress line drops under the title, the desk pads 24px 16px 32px
and button rows stack full width.

**The Danish Length Rule.** No layout depends on the length of English text. Heads, rows and
button rows wrap; rail labels hyphenate and break anywhere; nothing truncates a label.
Check every new screen in Danish.

## Elevation & Depth

Flat by default. Depth comes from the step between Ground and Paper and from 1px hairlines.
There are two shadows, both responses to state.

### Shadow Vocabulary

- **Lapis lift** (`box-shadow: 0 2px 6px rgb(30 47 122 / 22%)`): primary button hover only.
- **Focus halo** (`box-shadow: 0 0 0 3px rgb(30 47 122 / 18%)`): inputs and the textarea on
  keyboard focus, with a lapis border.

Elsewhere, focus is a 2px lapis outline at 2px offset (gold on the rail).

The Review stack shows depth the same way: the Cards still to come are paper edges under the
leaf, each narrower, with hairline borders and no shadow.

A sheet lifts off the page without a shadow: the page behind it dims under an Ink veil at 32%,
and the leaf takes a Strong Hairline border.

Recall stacks the same way. The Recall Review leaf has up to three paper edges under it, and
the folded Good pile up to two. The Trays sink one step below Ground (Tray), with a Hairline
border, so their Paper slips lie in them; nothing casts a shadow.

The register's lapis edge is drawn with `box-shadow: inset 3px 0 0` on a row's first cell, so it
needs no border that would shift the columns. It is a mark, not depth.

### Named Rules

**The Hairline Rule.** Panels separate by a 1px Hairline and a white leaf on Ground. Don't add
resting shadows.

## Shapes

Quiet, nearly square corners: 4px on panels, buttons, inputs, choices, notices, the step bar and
rail items, key caps, the Review leaf and a sheet; 2px on call-number labels, the typed code
and skeleton bars; 3px on the spine. Review leaf edges round only their two lower corners (4px). The one curve is the
pen flourish (a 64 by 10px stroked SVG with a center dot) set between two hairlines. The one circle
is the Reading mark (9px, 1.5px ring). The register's lapis edge is a straight 3px band. The one dashed line is the folded Good pile's
1px Strong Hairline border: a leaf that stands for Cards not laid out.

## Components

### Buttons

Firm and plain, ink-outlined.

- **Shape:** gently squared (4px), 36px minimum height, 16px side padding, 8px gap to an icon.
- **Primary:** Lapis fill and border, white label, for the next step forward (Add Source, Continue, Start, Skip, Start Review, Show answer, Recalled, Back to Recall, Back up to GitHub, Connect GitHub, Choose on GitHub, Use this repository, Start the Probe, Send, Continue to the Probe, Continue to Extraction, Mark the Source as read).
- **Hover / Focus:** primary moves to Raised Lapis with the lapis lift; secondary fills with
  Lapis Tint. 160ms on the shared ease-out. Focus is the 2px lapis outline.
- **Secondary:** Paper with a 1px Ink border and Ink label (Open, Cancel, Save, Retry, Copy
  code, Open GitHub again, Show the good Cards, Finish the Probe, Stop).
- **Icon:** a 16px Lucide icon (1.8 stroke) before the label, as on Copy code and Open GitHub
  again.
- **Disabled:** 55% opacity, no shadow, not-allowed cursor.
- **Quiet:** no border or fill, Mute 600 13px, 36px minimum height, 12px side padding; hover turns
  it Ink and underlines it (3px offset). For a way out of a slip, set apart from the choices
  (Review's Back), for Discuss, Drop and Undo beside a choice, for the second path beside a
  primary (Use another git remote), for Cancel in a sheet foot and Close in the Card sheet, for
  an action that undoes a setting (Stop backing up), for Fold in the Good Tray's head (26px
  tall there), for a page-head toggle (the Probe's Free text) and for the Probe's "I don't know,
  teach me".
- **Small:** 30px tall, 12px side padding, 13px, for choices repeated down a list (Keep, Add).
- **Link button:** a button that reads as a link inside running text: no box, Lapis, inherits the
  text's font, a 1px underline at 3px offset that thickens to 2px on hover. For an action that
  belongs to a sentence ("Use another account", "Back up to GitHub" in the Versions panel). On a
  Recall slip, "I rewrote it" is a link button set at 13px/600 in the AI gloss row.

### Choices

- **Style:** a bordered row (Strong Hairline, 4px) holding a native radio and a 600 label.
- **State:** checked turns the border Lapis and the fill Lapis Tint.

### Cards / Containers (Panel)

- **Corner Style:** 4px.
- **Background:** Paper on Ground, 1px Hairline border, no shadow.
- **Head:** the panel heading (uppercase, Initial in rubric or lapis, alternating down a column),
  optional Meta pushed right, then the hairline rule with the rubric flourish centered.
- **Internal Padding:** 16px 20px 20px; stacked bodies divide with a Hairline.
- **Empty state:** Mute body, max 62ch, saying what comes next and how; a lead line (600, 16px,
  Ink) where the empty state is the main content.

### Inputs / Fields

- **Style:** Paper, 1px Strong Hairline, 4px, 8px 12px padding, Body type. Label 600 14px above,
  "(optional)" in Mute 400 beside it, hint in Meta below.
- **Hover / Focus:** hover darkens the border to Mute; focus turns it Lapis with the focus halo.
- **Error:** border Rubric, and below the field a Rubric line with a circle-alert icon and the
  words. Never the border alone.

### Facts

A short ledger of states as a two-column description list: labels in Mute 13px/21px, values in
Ink 14px, 8px row and 16px column gaps, tabular numerals. Labels take their own width; values
wrap anywhere, so a long remote address never widens the panel. A value may carry a link (where
the backup is) or a small quiet button after it (Disconnect GitHub). Used by the Versions panel
and the Backup panel.

### Notices

- **Style:** an icon (18px) and words in a 4px box. Info uses a lapis icon on Paper. Warning uses
  a rubric icon on Rubric Wash. Error uses a rubric icon and a Rubric border, with role alert.
- **Inside a panel:** the panel is the box; the notice drops its border and fill and keeps icon
  and words (a warning title turns Rubric).
- **Inline warning:** a rubric triangle icon and a sentence, with a link to the fix.

### Navigation (Rail)

- **Style:** Lapis column, 16px 8px padding. The mark is a call-number label ("GLO"). Each item is
  a 32px Lucide icon (1.6 stroke) over its rail label. Today (calendar) and Sources (library) are
  places and sit above a short Lapis Rule; the three Sections (Graph, Writing projects, Recall)
  sit under it.
- **States:** resting Lapis Mist; hover and current fill Raised Lapis with white text; the current
  icon turns Gilt. 160ms transitions.
- **Foot:** the EN/DA switch (a stacked segmented control, checked segment white with lapis text)
  and Settings.

### Status Bar

The running foot of the window, as the foot of a printed page carries the folio: Paper, a
Hairline above, 28px tall (32px left and 12px right padding), Mute 13px with tabular numerals.
The left end is free for later status. At the right end sit the Updates button and then the
Versions item.

The Updates button is always the next step for the app's own updates, and exists only in the
desktop app where it can replace itself. At rest it is a 16px refresh icon alone (named "Check
for updates"); "Checking…" spins it (it stands still under reduced motion). A found release turns it Lapis
600 with a download icon and "Update" ("Opdater"); a download shows a Lapis progress ring
(Strong Hairline track) and the percent; a downloaded release fills it Lapis with a white
rotate icon and "Restart to update" ("Genstart for at opdatere"), the bar's only fill, because
restarting is the step forward. A failed step the user asked for shows a Rubric triangle and
words ("Not downloaded"), and a click tries again; a failed hourly check shows nothing. Its
tooltip is an Ink leaf above the item's right end (280px at most, 8px 10px, 4px corners): a
Paper 600 line on what is true ("Nightly 13 Nov (42) is ready to download.") and a softer line
with the running version and the last check, or what the restart does. It shows after 400ms of
hover, at once on keyboard focus, and Esc hides it. Versions read as "Nightly 13 Nov (42)"
("Natversion 13. nov. (42)").

The Versions item: a 16px Lucide
git-commit icon (1.6 stroke) and "Saved 14:32" ("Gemt 14.12"), or "Saving…" and "Syncing…" while
Glose works. A 6px Ink dot follows while changes are not saved yet (named for screen readers).
On a problem, a Rubric triangle and words ("Not synced") follow, in 600. The item is a 22px
button with 4px corners; hover and an open panel fill it with Lapis Tint and turn it Ink.

The Versions panel opens above the item's right end as a Glose panel leaf (380px, Strong
Hairline border, no shadow): the heading "Versions of your Graph" with a lapis Initial and the
flourish; a problem as an in-panel warning notice; the Facts (a remote as `github.com/<login>/<repo>`;
a missing one as "Only on this computer." ("Kun på denne computer.") in Mute, followed by a
"Back up to GitHub" link button that opens the Backup sheet); then, under a Hairline, the End the day
form: a field label, the input, a Meta hint, and the primary End the day button with a Mute
status beside it (a Verdigris check after the day is saved). It fades in and rises 4px in
160ms on the shared ease-out; Esc and a click outside close it.

### Sheet

A modal leaf for a one-time task: it opens over the page, does the task, and leaves. A native
`<dialog>` opened with `showModal`, `min(560px, 100vw - 32px)` wide, at most the window height
less 32px, scrolling inside when taller.

- **Leaf:** a Glose panel with a Strong Hairline border: the panel head (Initial, optional Meta
  pushed right such as "Step 1 of 2" ("Trin 1 af 2")), then the flourish rule.
- **Body:** a column with 16px gaps; paragraphs cap at 62ch. Field errors keep their icon at the
  first line when the words wrap.
- **Foot:** a button row 4px under the body: the action on the left (primary for the next step,
  secondary for a way back to an outside page), and a quiet Cancel pushed right.
- **Veil and motion:** the page dims under Ink at 32%. The leaf fades in and rises 4px in 160ms on
  the shared ease-out while the veil fades in. No shadow.
- **Leaving:** Esc cancels, as Cancel does. The task's first control takes focus.

**Backup sheet.** Opened from Settings (Back up to GitHub, Use another git remote) and from the
Versions panel's link button. Titled "Back up to GitHub" ("Tag backup på GitHub") with a rubric
Initial.

- **Step 1, connect:** one sentence on what GitHub keeps, then Connect GitHub (primary), "No
  GitHub account? Create one, free" in Mute 13px, and Cancel.
- **Step 1, the code:** "Type this code on GitHub's page." over the Typed Code and Copy code
  (secondary; its icon turns to a Verdigris check and "Copied" for 2s); a Mute 13px line with the
  16px Lapis tick, ending "Glose continues by itself" ("Glose fortsætter selv"); the foot carries
  Open GitHub again (secondary with an external-link icon) and Cancel.
- **Step 2, Repository name:** "Signed in to GitHub as <login>." with a "Use another account"
  link button; the Repository name field (320px max, a suggested name, a hint) with the field
  error line; Back up (primary) and Cancel.
- **Done:** an 18px Verdigris check and a 15px sentence ("Backed up. …"), the place as a link
  under it, and Done (primary).
- **Another git remote:** the same sheet without steps: a sentence, the Remote address field,
  Use this remote (primary) and Cancel.

**Card sheet.** Opened from a Recall slip, titled "Card" ("Kort") with a rubric Initial and the
flourish. The leaf itself takes focus, so the Card is read first. The body is the Card as on
other pages: its words, its Checks as callouts with the passed ones folded under a quiet Mute 13px
disclosure ("5 Checks passed", a drawn 14px chevron that turns 90° in 160ms when open; hover turns
it Ink), where it comes from, and Edit and Delete (secondary) with a quiet Close pushed right
(Esc). The sheet shows each change to the Card and closes when it is deleted.

**Remote Graph sheet.** The Backup sheet run the other way, opened from the first start's Graph
folder step. Titled "Get your Graph from GitHub" ("Hent din graf fra GitHub") with a rubric Initial;
it only chooses, and the setup page copies.

- **Step 1, connect:** the Backup sheet's connect step and code, in this sheet's own words (what
  GitHub's code lets Glose read).
- **Step 2, choose:** "Signed in to GitHub as <login>." with "Use another account", then the
  Repository Rows under the field label "Choose the Graph" and a Meta hint, the latest pushed
  Graph chosen and focused; Use this repository (primary, off while no row is chosen) and Cancel. Loading is the live line; a failed list is an
  in-sheet warning notice with Try again; no repositories is the Mute empty sentence.
- **Another git remote:** the same sheet without steps: a sentence, the Remote address field,
  Use this remote (primary, "Checking…" while git looks) and Cancel; a remote git cannot read
  gets the field error line.

### Repository Rows

The account's private repositories as radio rows in the Choice style: Strong Hairline, 4px, 10px
12px padding, 12px gaps; checked turns Lapis with Lapis Tint, hover darkens the border to Mute.
Each row: the radio, the repository as a typed call-number label (`jandragsbaek/glose-graph`; a long
name wraps inside its label) over a Mute 13px "Updated 12 Nov", and at the right end its states in
fixed places: a Lapis 600 13px "Graph" with a 14px Lucide waypoints icon (the Graph Section's icon)
over a Mute "Yours" or "Shared by <owner>". Graphs come first; the rest fold under a Mute 600 13px
disclosure, "Other repositories (7)", with a hint that one becomes a Graph as it is. Below 520px the
states drop under the name.

### Setup Remote Ledger

In the first start's Graph folder panel, "Get it from GitHub" is the third choice. Under the choices,
a Hairline, then the Facts ("From": "Not chosen yet" in Mute, or the place, such as
`github.com/jandragsbaek/glose-graph`, with "Yours" or "Shared by <owner>" in Mute 13px), a Meta line
that Glose keeps the backup there, an error line when the copy failed, and the buttons: Choose on
GitHub (primary until a remote is chosen, then the secondary Choose another) and a quiet Use another
git remote. The folder field follows, 14px below. While Glose copies, the start button reads
"Copying your Graph…" with the live tick and "A large Graph can take a few minutes." beside it. A
copy from GitHub that fails says so in its own words (check the connection, or choose again); the
sheet hands focus back to the button that opened it.

### Typed Code

A code the user types on another site, set like a call-number label at reading size: Paper, 1px
Ink border, 2px corners, 6px 14px padding, Code type (`WDJB-MJHT`). It selects as one unit, and
its accessible name spells it out character by character. It sits in a wrapping row with Copy
code (12px 16px gaps).

### Backup Panel

The third Settings panel, rubric Initial (ChatGPT below it turned lapis to keep the alternation).
A ledger, not a form; setting up happens in the Backup sheet.

- **Not backed up:** Facts ("Versions: Only on this computer", "Last saved: Today 14:37"), the
  rubric inline warning ("If this computer is lost or breaks, your Graph is lost with it."), then
  Back up to GitHub (primary) and a quiet Use another git remote, 18px below.
- **Backed up:** a sync problem as an in-panel warning notice; Facts ("Backed up to" with
  `github.com/<login>/<repo>` as a link, "Last sync", and "GitHub" with the login and a small
  quiet Disconnect GitHub); then a quiet Stop backing up whose words line up with the fact labels.
- **Stop:** an inline confirm under a Hairline (62ch max): the question, which says where the copy
  stays, then Stop backing up (secondary) and Keep backing up (quiet, focused).

### Call Number (signature)

A typed spine label: Paper, 1px Ink border, 2px corners, Courier Prime 700 12px, no wrapping,
for example `ARE 1958 · p. 79`. With a missing year it turns Rubric (border and text), shows a
triangle icon, and ends in `?`; its accessible name says what it is.

### Spine (signature)

A 56 by 136px lapis block with gilt double bands at the top and the call number set vertically
at the foot. It stands beside the current Source and its bibliographic data.

### Reading Start

The first page of a Source that has not started: the Reading Stage's columns, with one panel
(rubric Initial) "Where are you with this book?" ("Hvor er du med denne bog?") in the main column
and the Source's details (lapis Initial) in the side column.

- **Answers:** a Mute 13px hint, then three stacked Choice rows (640px max, 10px gaps, 12px 16px
  padding): the radio at the first line, a 600 label over a Mute 13px hint. Hover darkens the
  border to Mute; checked turns it Lapis on Lapis Tint.
- **What follows:** under a Hairline, a Mute 600 13px uppercase label (no Initial), then the
  checked answer's steps as a Step Bar strip (220px a step; one column under 520px). The first
  step wears the current step's Lapis Tint and Gilt underline. Before an answer, a Mute line says
  to choose one.
- **Action:** one primary button, 18px below, that names the first step ("Start Free text",
  "Start the Probe"); it is off until an answer is checked.

### Step Bar

The Reading steps in the order the Source's start gives them, in one bordered strip of equal
columns divided by Hairlines: three for a Source started by writing (Free text, Extraction,
Probe), two for one started with the Probe or a catch-up (Probe, Extraction). Each step: a Courier
step number, a Label name, a Meta note ("203 words", "0 of 1 point written", "6 questions", or
"with ChatGPT" before a step starts). Current: Lapis Tint with a 3px Gilt underline and
`aria-current`. Done: a 3px Verdigris underline and a Verdigris check.

### Reading Marks

One small mark per Reading step of the Source's start (three or two), read left to right: a filled Verdigris dot for a
step done, a Lapis ring with a 2px Gilt underline (5.5px below) for the current step, and a
hollow Strong Hairline ring for a step not reached. Each is 9px with a 1.5px ring on Paper, 5px
apart. In the register they are one image named by the state ("In Extraction", "Read"); on the
desk they are hidden from screen readers because the words beside them say the step.

### Desk

The "On the desk" panel (rubric Initial, the count in progress as Meta): every Source not yet
read, side by side. Each holds the 56px Spine, then the title (700 16px, 1.3, an Ink link that
underlines on hover), the author in Mute 14px, the Reading marks with the step and its count in
600 14px tabular ("Probe · 9 Notes"), an inline warning for missing Citation data (13px with a
16px triangle), and, 14px below, a small primary Continue that names the step. Long Danish
step names wrap inside the button. When every Source is read, the panel says so in Mute.

### Register (signature)

"The register" panel (lapis Initial, the count or "4 of 10 Sources" as Meta): every Source as a
row of a table that reads down.

- **Tools:** a search form above the table. The find field is the Text Field with a drawn 16px
  Mute Search icon at its left (36px left padding); the Order as a Segmented control (Added, Call
  number, Author); Reading and Citation as Selects; and the hint pushed right (Mute 13px, max
  56ch, `role="status"`).
- **Segmented control:** one Strong Hairline box (4px) of options divided by Strong Hairlines,
  each 600 14px/20px at 9px 12px. Hover fills Lapis Tint; checked fills Lapis Tint with a Lapis
  label. The radio is invisible over its option; focus is a 2px Lapis outline inside the option.
  160ms on the shared ease-out.
- **Select:** the native select with the Text Field's border, focus and hover, set like a segment
  (600 14px/20px, 9px top and bottom), its own arrow removed for a drawn 16px Mute ChevronDown
  10px from the right.
- **Table:** 14px with tabular numerals; cells 9px 12px (20px at the panel edges) with a Hairline
  under each, no wrapping. Head cells in Mute 600 13px, and they wrap. Number columns align
  right. A Source group opens with a row on Ground in 600 13px ("November 2026 · 2 added", or a
  letter when ordered by Call number or Author).
- **Cells:** the Call Number; the title as an Ink 600 link with the author after it in Mute; the
  Reading marks; Notes; "With a Location" as "3 of 10" (a Mute dash with no Notes); Links to other
  Sources; Citation, either a 15px Verdigris check and "Ready" or a 15px Rubric triangle and the
  missing data in 600 ("No publisher").
- **Links toggle:** the count of Sources a Source shares Links with ("4 Sources") is a button
  that reads as a Lapis link, 1px underline at 3px offset, 2px on hover, with `aria-pressed`.
  "Stands alone" in Mute when there are none.
- **Showing Links:** pressed, its row fills Lapis Tint and its count turns Lapis 700. Every row
  sharing Links with it gains the 3px Lapis edge and reads "N shared" in Lapis 700 (screen
  readers hear "3 Links shared with Deep Work"). The hint changes to the same 3px edge (16px tall),
  "6 Sources share Links with Deep Work." and a Clear link button. The chosen Source lives in the
  address (`?source=`), so Back returns to it. The tint and the edge ease in over 160ms.
- **Nothing found:** "No Source matches." in Mute and a "Clear search and filters" link button.

### AI Text (signature)

AI text in a Note. The text stays Ink and Body type; the mark sits at the edge, and it says how
much the AI wrote.

- **Paragraphs:** a 2px Rubric rule on the left with 12px padding, and above the text a Rubric
  gloss (12px, 600, 0.06em tracking, uppercase) opened by a ¶ pilcrow: "AI paragraph" ("AI-afsnit").
- **A whole Part, Note or Card:** a 3px Rubric rule, and a gloss opened by a § section sign:
  "AI-written Part", "AI-written Note" or "AI-written Card" ("AI-skrevet del", "AI-skrevet note",
  "AI-skrevet kort"). For a Part, the rule and the gloss cover its heading too. On a Recall
  slip the rule runs down the slip's own left edge.
- The block is a group named by its gloss, so a screen reader hears the words, not only the
  colour.
- **AI text the user may still rewrite** (the Note box in Extraction): the gloss says how long
  the mark stays ("¶ AI paragraphs · marked until you rewrite it") and ends in a quiet small
  "I rewrote it" (26px tall) pushed right on the same line; the line wraps when narrow. The
  button takes the mark away; the field keeps its place and its focus.

Note headings in the side panel: 700 15px, 18px above when they follow other text.

- **A title:** "¶ AI-written title" ("AI-skrevet titel") with the lighter 2px rule, above a
  Note's title in the Graph panel and above the title field of a Point the AI proposed.

### Rewrite Desk (signature)

A Note opened over the Graph's canvas to edit, with the AI's words beside the user's, like a gloss
in the margin of a page. The side panel stays beside it and keeps reading other nodes; for the Note
on the desk it shows only the title, the Source and the Links.

- **Way in:** in the Note panel's button row, "Rewrite in your words" (primary) while the Note
  holds AI text, else "Edit" (secondary), before Make Cards.
- **Desk:** fills the canvas cell on Ground (24px 28px 28px padding, a Hairline border, its own
  scroll), the canvas inert under it. It fades in and rises 4px in 160ms on the shared ease-out.
  One panel leaf, up to 1120px, with a Strong Hairline border: "Rewrite the Note" ("Omskriv noten")
  or, without AI text, "Edit the Note", with a lapis Initial; the call number with page and the
  Source's title as Meta.
- **Rows:** two equal columns divided by Hairlines (cells 18px 28px 22px). Mute 600 13px heads,
  "What the AI wrote" and "In your words". The title row first (the AI Text title mark on the
  left, the borderless title field 700 18px with a Strong Hairline under it on the right, then a
  Meta hint on the rename and a Page field), then one row per run of the Note's text. AI text sits
  on the left under its mark with a quiet small "Correct the AI text" at the end of the gloss; the
  right holds an empty field (16px/1.65, at least 168px, growing with its text) whose Mute
  placeholder says that empty keeps the AI text. A Part's row has a heading field above it,
  showing the AI's heading as its placeholder. The user's own Markdown has an empty left cell and
  its field on the right.
- **States:** words in a right field pale the AI mark's rule beside them to Rubric Line (the text
  stays Ink, to read beside the user's) and add a Mute 13px line with a 15px Verdigris check:
  "Yours. It replaces the AI text when you save." Correcting turns the AI
  text into a field under its mark, its gloss ending "· stays marked" and the action "Undo".
- **Foot:** sticky at the leaf's foot, so Save stays in reach: Save (primary, "Saving…"), Cancel
  (quiet), and a Mute tabular count pushed right ("1 of 2 in your words"). Cancel with changes becomes an inline confirm: "Discard what you wrote?" in
  600, Discard (secondary) and Keep writing (quiet, focused); Esc keeps writing and focus returns to
  Cancel. The same question comes when the user opens another Note on the desk or leaves the Graph
  with unsaved words.
- **Focus:** the desk opens on the first field where the AI's words are (the title when the AI
  wrote it, else the first run of AI text); closing it returns focus to the button that opened it. A title another file has gets the
  field error line under the title; a failed save, an error line in the foot.
- **Without AI text:** one column at 72ch, labels shown, no heads and no count.
- **Narrow:** below 1080px the desk takes the canvas's place in the page's flow; below 720px each
  row stacks, the AI text above the user's field.

### Core Points (Extraction)

One panel, its groups divided by Hairlines (22px 28px 26px padding), in this order:

- **The open Point:** the kept Point being written gets the room. Its number in a 28px column;
  the title as a borderless 19px 600 field with a Strong Hairline under it (Lapis on focus);
  where it comes from; the Note text (16px/1.65, 168px tall), which starts as the AI's draft
  under the AI Text mark until the user rewrites it; a small page field and a word count; the
  proposed Links as a plain list (Note link, Mute reason, Add or Drop); then Save Note
  (primary), Ask for a draft, and a quiet Drop pushed right.
- **Proposed by the AI:** one AI Text mark for the whole group ("¶ Proposed by the AI · 3"),
  not one per Point. Each row: number, 16px 600 claim, small Keep (secondary) and quiet Discuss
  and Drop; under it one line each for where it comes from and how it meets the Graph.
- **Written:** one line each: a Verdigris check, the Note as a link, its call number with page,
  its Links counted.
- **Foot:** Add a point in your words, Propose more, and the dropped count as a quiet toggle.

Origin lines are Mute 13px with a 14px icon: a quote mark and the user's words in Ink, or a book
and "Not in your Free text. Check it against your copy." Graph lines are Ink with a Lapis icon:
"You have this Note:" (copy icon) and "Pulls against" (compare icon) with a Mute reason.

The Point under discussion wears the Gilt "you are here" mark: a 3px underline under its
number, as the current step has.

### Session

The transcript in turns, 28px apart. An AI turn opens with "AI" in Mute 600 13px. What the AI
read folds into one quiet Mute line per run of tool uses ("Read your Free text and 2 Notes ·
searched your Graph"), its reasoning into "Thought for 21 s"; open, each lists its lines beside a
Strong Hairline, Notes as links. The answer is Body at 15px/1.65; a closing question is 600.
Wikilinks are Lapis links into the Graph; a Point's number is a small typed tab (Strong
Hairline, 2px corners, Lapis 700 12px) that shows the Point. The user's turn is a Ground box (no
border) with "You · about 2" in Mute 600 12px. While the AI works, one line says what it does,
with a 16px Lapis tick moving beside it (stopped by reduced motion).

The message box: the Point it is about as a Mute line with the title in Ink 600 and a way to
clear it; the textarea; then Send (primary, with its key cap) and Stop, and the plan line pushed
right.

### Extraction's Next Step

The way on from Extraction, as the last group of the Core Points panel while the Source is in
Extraction: a Meta hint over a primary button, 10px apart, the button described by the hint. For
a Source started by writing it reads "Continue to the Probe" ("Next, the Probe questions you on the
book. Your points and Notes stay here."); otherwise "Mark the Source as read". A failed step shows
an error notice between the two. Extraction does not end by itself.

### Probe Transcript (signature)

The conversation is the page, read like a marked script: the user's words in the column, the
AI's judgment in the margin beside them. No chat bubbles, no quiz card. The transcript is a list
of turns 22px apart, the newest scrolling into view as it lands (at once under reduced motion).

- **Question:** "AI" in Mute 600 13px, the question number as a Lapis Call ("Q6"), the topic in
  Mute 400 and, for a second try, "· Q5 again"; under it the Probe question (600 16px/1.6).
- **Answer:** a Ground box (4px, 12px 16px 14px padding, no border). "Your Reasoning" and "Your
  answer" name the two parts in Mute 600 12px, 0.04em tracking, uppercase. The Reasoning is
  15px/1.65; the answer follows under a Hairline (10px either side) in 600. A turn where the user
  asked to be taught opens with a Mute 13px italic line ("You asked to be taught.").
- **Taught:** the AI Text mark for a whole Part (3px Rubric rule, § gloss: "Taught · the gap in
  Q5 · Attention residue"), the teaching in Ink, then a Mute 13px line with a 15px book icon:
  "From the AI's knowledge of the book, not your copy. Check it there."
- **Other turns:** the Session's tool-use fold, reasoning and AI messages; the user's own messages
  as a Ground box; a 600 line when the AI has covered the main ideas; while the AI works, the live
  line with the moving Lapis tick.

### Judgment Gloss (signature)

The AI's judgment of one answer, in the margin beside it: the Reasoning and the result judged
apart. A note with a 1px Strong Hairline on its left (16px padding), headed "Judged" in Lapis 600
12px, 0.06em tracking, uppercase, then two verdicts 10px apart. Each verdict is a 16px icon and a
600 14px/1.45 name ("Reasoning: sound", "Result: partly right") over the reason in Mute 13px.
Sound and right take a Verdigris check; partly sound, flawed, partly right and wrong take a
Rubric triangle and a Rubric name; no Reasoning takes a Mute dash. The words of the Reasoning the
judgment points at carry the faint Rubric highlight (the lower 40% of the line, Ink text), so the
reader sees where the thinking went wrong. Below 1080px the gloss sits under its answer, 12px
below, with the same rule.

### Answer Box

The Probe's foot, in the transcript's two columns.

- **Left, Reasoning:** the label "Your Reasoning · Q6" (600 14px, the number in Mute 400), a Meta
  hint on the computer's own dictation ("To speak instead, start your Mac's dictation: press Fn
  twice, or the microphone key."), then the textarea (84px tall, 64px below 1080px) with the
  placeholder "Think out loud: how do you get there?".
- **Right, answer:** the label "Your answer", the Text Field ("In one or two sentences"), then a
  wrapping row (10px gaps) of Send (primary, with its key cap, ⌘↵ or Ctrl+Enter, which also sends
  from either field) and the quiet "I don't know, teach me", which becomes a secondary Stop while
  the AI works. Under it the plan line in Mute 12px with a Manage usage link. Send stays off until
  there is an answer and an open question.
- A send that fails shows an error notice under the answer field. The box goes when the Probe is
  finished.

### What the Probe Found

The close of the transcript, 40px below the last turn, on the same leaf (up to 1016px, centred).
The heading is a panel heading with a rubric Initial over the flourish rule. Then the topics by
state, each in the verdict set: Known and Known after teaching with a Verdigris check; Taught, not
confirmed yet and Still open with a Rubric triangle; Asked, no answer yet with a Mute dash. The
topics follow in Mute 13px, joined by " · ". A Meta line says where the record is kept ("The
Probe is kept in Probes/<Source>.md in your Graph folder."), then the way on: a primary button
("Continue to Extraction", or "Done: <title> is read") with a Mute status beside it. An empty
Probe says "The Probe ended before any answer."

The tally in the band above says the same in one Mute 13px line with tabular numerals ("2 known ·
1 known after teaching · 1 taught, not confirmed yet"), with `role="status"`. Before the first
question, the leaf holds a 680px start: the empty-state lead line, a Mute body that follows the
Source's start, and Start the Probe.

### Specimen Leaves

"Start a new piece" shows each type of Writing project as a small finished page beside its
words, so the choice shows what it becomes. Each specimen is a Strong Hairline box (18px padding,
20px gap, Lapis border on hover and focus-within): a 200px miniature (aria-hidden; Ground for a
blog post with numbered notes under a rule, Paper for an assignment with a bibliography; 9–10px
text, a picture, not reading text), then the type in 700 16px, a Mute lead line, two points, and
the start button (primary for Blog post, secondary for University assignment). Two specimens sit
side by side at 460px minimum and stack below; under 720px the miniature goes on top. Starting a
piece saves it at once as "Untitled blog post" (numbered when taken) and opens its desk with the
title selected.

### Writing Desk (signature: The Glossed Manuscript)

One Paper leaf in the middle (44px 56px 64px padding, Hairline border, lower edge open), its
Citations in the right margin beside their lines and its checks in the left.

- **Bar:** "Writing projects /" in Mute 600 13px, the title in 600 15px, the Settings Slip chip,
  the save state in Mute 13px pushed right, Write | Proof as a Segmented control, then in Write
  "Cite a Note" (secondary with a Key Cap, ⌘K or Ctrl+K) and "Ask the AI to check" (quiet); in Proof
  the post's path in Courier 12px Mute and "Write to site" (primary; "Choose your site" until a
  site folder is set). A one-line note under the bar reports the AI review or the Publication.
- **Leaf:** the title as a borderless 700 30px field over a Strong Hairline (Lapis on focus,
  Rubric with the field error when taken), a Mute meta line ("Blog post · 83 words · 3
  References"), then the prose at 16px/1.65 in CodeMirror with no chrome; Gilt Wash selection,
  Lapis caret. A Reference shows as its number, raised, Courier 700 12px Lapis (Rubric when a check
  flags it); with the cursor in it, it shows its token (`[[Note]]{p. 64}`) on Lapis Tint (Rubric
  Wash when flagged).
- **Right margin (glosses):** per Reference, beside its line: a Hairline above, the number in
  Courier Lapis, the full note Citation (title in italic), the Note in Ink 600, and its Call Number
  with the page. Glosses never overlap; a later one moves down 12px past the one above.
- **Left margin (flags):** right-aligned beside the line, each problem as a Rubric uppercase
  12px line with a 14px triangle ("No page", "The quote is not in the Note word for word"), the
  Reference in Mute, and the fix as a link button ("Add the page", "Choose a Note", "Open the
  Source", "Show the Note"). After an AI review: "No Reference" flags with "Find a Note", and Notes
  for a passage under the AI Text mark (a 2px Rubric rule on the margin side and a ¶ gloss), each
  with "Cite".
- **Proof:** the leaf shows the post as readers will see it, in its Reference form: raised
  numbers and a numbered note list under a Hairline (footnotes), the short Citation in brackets and
  a list of Sources (links + list), or notes under each paragraph (side notes). A flagged Citation
  is Rubric with a triangle and words. The left margin becomes "Before you publish" (Verdigris
  check lines and Rubric problem lines, each with its fix); the right margin "Questions from the
  AI", each question beside a Strong Hairline under a Mute "AI · About …" line.

### Settings Slip

The chip in the desk bar ("Blog post · Footnotes": Lapis 600 13px, Strong Hairline, 4px) opens a
420px Paper slip under it (Strong Hairline, no shadow): the type as choice rows that say what each
ends as, "References appear as" as a Segmented control with a sample sentence and its note on
Ground, a hint that the text stays the same, and the language of the text as a Select. A click
outside or Esc closes it.

### Writing Sheets

Three sheets on the Sheet pattern. **Cite a Note:** the find field, matches as choice rows (title,
Note or Source in Mute 12px, the Call Number with the Note's page), an optional Page field (160px)
with its hint, Cite (primary) and Cancel; `[[` in the prose or ⌘K opens it at the cursor.
**Your Bridgetown site:** a sentence, the Site folder field with its hint and the field error
line, "Use this folder" (primary) and Cancel. **Replace the post in your site?:** what is lost,
"Replace it" (secondary) and "Keep it" (quiet, focused).

### Key Cap

A small hairline box that names the key doing the same as the button it sits in: Paper, 1px
Strong Hairline with a 2px bottom border, 4px corners, 22px tall (22px minimum width, 6px side
padding), Mute 600 12px. On a primary button it turns transparent with a 45% white border and
white text. It is hidden from screen readers; the button carries `aria-keyshortcuts`. Every button
on the Review screen that a key presses has one (Stop, Show answer, each rating, Back).

### Review Leaf (signature)

One Card on the desk: a Paper leaf, max 720px, 1px Hairline border, 4px corners, no shadow,
40px 48px 36px padding (28px 24px on phones).

- **Content:** the Review question; after Show answer, the rubric pen flourish between two
  hairlines (32px above, 28px below), then the Review answer. A Mute Meta foot line 28px below
  says the state and the Note: "New Card · From <Note>". An AI-written Card carries the AI Text mark.
- **Leaf edges:** under the leaf, one paper strip for each Card still to come, up to five. Each is
  8px tall, 16px narrower than the one above, centred, with a Hairline border and no top border.
  The edges say "many" or "few"; the bar gives the number.
- **Motion:** a rating lifts the leaf 14px and fades it out in 200ms; the next leaf rises 10px
  from 0.6 opacity in 280ms, both on the shared ease-out. Reduced motion stops both.

### Review Bar

The focus screen's bar: the title in the panel-heading set with a lapis Initial; a centred Mute
Meta progress line with tabular numerals and the count left in Ink 600 ("12 left · 3 new · 1
learning · 8 due"); and a secondary Stop button with an Esc key cap. When nothing is due, the
progress line is empty and Stop goes; Esc still leaves.

### Rating

The rating comes in two steps under the leaf, centred, each a 600 prompt over a row of buttons
(12px gaps). Step one: Show answer, the one primary button. Step two: Forgot (secondary) and
Recalled (primary). Step three: the three efforts as secondary buttons, then Back as a quiet
button on its own line below. Secondary rating buttons end with their interval in Mute 400,
tabular. On phones the buttons stack full width.

### Done Desk

When nothing is due, the desk shows the closing pen flourish between two short hairlines (240px
across), the empty-state lead line and its Mute body, and a primary Back to Recall, centred
with 20px gaps and 72px from the bar.

### Recall Review Leaf

Today's Review seen from Recall: the Review screen's leaf lying on the desk. A Paper panel leaf
(Hairline border, 4px corners, 22px 28px padding) up to 980px, centred, with no flourish rule.
One row of three parts (12px 32px gaps, centred): the panel heading "Review" with a lapis
Initial; the Review count headline over the Mute 13px tabular counts ("12 new · 0 learning ·
0 due"); and Start Review (primary) on the right. Under it, one paper edge for each Card due after
the first, up to three, set like the Review leaf's edges. When nothing is due, the leaf holds the
Review's nothing-due state and has no edges. Below 720px the three parts stack.

### Tray (signature)

A tray on the desk that holds Cards by the work they need: To fix (rubric Initial), To rewrite
(lapis Initial) and Good (rubric Initial). A Card with a Check that warns or fails goes to To fix,
even with AI text (fixing it rewrites the text); in To fix, Needs work comes before Could be
better.

- **Well:** Tray fill, 1px Hairline border, 4px corners, 14px 12px 12px padding, 10px gaps.
- **Head:** the panel heading set (no flourish), the count pushed right in Mute 13px tabular
  ("12 Cards"), and an optional quiet action; at least 36px tall, 0 6px 10px padding, a Hairline
  under it. Heads wrap.
- **Slips:** a list of Slips with 10px gaps, 50 at a time; past that, a foot line ("Showing 50 of
  120 Cards." in Mute) with a small Show more.
- **Empty:** a lead line (600 16px Ink: "Nothing to fix", "No AI text") over a Mute sentence;
  while searching, "No Card matches." alone.
- **Good, folded:** Good stays folded as a pile: a Paper leaf with a 1px dashed Strong Hairline
  border, 4px corners and 16px padding, holding the lead "6 good Cards in your own words", the
  Mute line "Nothing to do here. Show them to read or edit one." and Show the good Cards
  (secondary, 12px below; it wraps). Up to two paper edges lie under it. A search opens it; once
  shown by the button, a quiet Fold in the head closes it.

### Slip (signature)

One Card in a Tray: a Paper slip, 1px Hairline border, 4px corners, 12px 14px padding. Hover
darkens the border to Mute (160ms). The question (600 15px/1.4, Ink, wraps anywhere) is a button
that opens the Card sheet, and the whole slip is its target; keyboard focus draws the 2px Lapis
outline at 2px offset around the slip. The answer follows 4px below in Mute 14px.

- **Fault line:** the first Check that fails or warns, 10px below, 600 13px/1.4 beside a 16px
  triangle (1.8 stroke, 8px gap): Grade, Check name and "1 more" when there are others ("Needs
  work · Asks you to recall, not to choose · 1 more"). A Check that fails sets triangle and words
  in Rubric; one that warns sets a Gilt triangle with Ink words. Failures come first.
- **AI text:** the AI Text mark for a whole Card, its 3px Rubric rule down the slip's left edge
  and the § gloss "AI-written Card" on top. In To rewrite, the gloss row ends in "I rewrote it",
  a Lapis link button at 13px/600.
- **Leaving:** "I rewrote it" lifts the slip 14px and fades it out in 200ms on the shared
  ease-out, as a rated leaf leaves the Review; its slot then closes (grid rows 1fr to 0fr, 200ms,
  starting at 160ms) so the slips below slide up into it. The save starts at once, but the list
  reads again only after 380ms, so the motion is never cut short. Reduced motion moves it and closes the slot at
  once.
- **Not saved:** if the save fails, the slip comes back with a Rubric 16px circle-alert and the
  words, as an alert.

### Loading

Skeleton bars (14px, 2px corners) shimmer Tint to Ground over 1.4s inside a panel, with a hidden
"Loading" label. Reduced motion stops all animation and transitions.

## Do's and Don'ts

### Do:

- **Do** put ornament (initials, flourish, gilt) on headings and chrome only, and the flourish in
  the hairline rule between a Review question and its answer.
- **Do** alternate panel initials rubric and lapis down each column.
- **Do** pair every red error or missing-data signal with a warning icon and words.
- **Do** use Gilt only to mark the current place (Section, step) and focus on lapis.
- **Do** give every Source its call number label wherever it is listed.
- **Do** take every string from the EN/DA catalogs and check the layout in Danish.
- **Do** keep Lapis buttons for the next step forward (Add Source, Continue, Start); other actions are ink-outlined secondary.
- **Do** give every button on a focus screen that a key presses a key cap, and name the key in
  `aria-keyshortcuts`.
- **Do** use tabular numerals for counts, years and call numbers.
- **Do** show a Source's state as a mark in a fixed cell (Reading marks, the Citation check or
  triangle), and rank by weight, not by bigger type.
- **Do** keep the 3px Lapis edge for rows that share Links with a chosen Source, with "N shared"
  and the hint saying it in words.
- **Do** sort Recall's Cards into the Trays by the work they need (To fix, To rewrite, Good), as
  Paper slips in the Tray well, with Good folded to its count until asked for or searched.
- **Do** let a slip that leaves its Tray finish its lift and the closing of its slot before the
  list reads again; under reduced motion it goes at once.

### Don't:

- **Don't** decorate data, Note text, inputs or buttons (no initials, flourishes or gilt there).
- **Don't** use red alone to mean anything; color never carries a message by itself.
- **Don't** add resting shadows or new fields of color beyond the lapis rail, spine and primary.
- **Don't** use Cinzel Decorative beyond a single heading initial, or Courier Prime beyond call
  numbers, step numbers, question numbers, repository names and a code the user types elsewhere.
- **Don't** fix widths to English text, truncate labels, or block wrapping.
- **Don't** build a file-tree-plus-editor arrangement in neutral grey, a busy dashboard, or
  gamification.

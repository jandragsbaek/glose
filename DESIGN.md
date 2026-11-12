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

- Lapis rail (96px) of large Section icons with labels under them; gold marks the current one.
- White panels with hairline borders; each heading opens with a rubric or lapis Cinzel initial,
  alternating down a column, above a hairline with a rubric pen flourish in its middle.
- Call numbers as typed white spine labels in Courier Prime with a 1px ink border.
- Flat surfaces; depth comes from hairlines and the ground/paper step, not shadows.
- Red is a signal with fixed jobs, never a decoration of data.
- A focus screen (Review) drops the rail and the page header: one Paper leaf on Ground.

## Colors

A cool, bookish palette: one deep lapis field, white paper on a warm near-white ground, and
three small pigments (gold, rubric red, verdigris) each with one job.

### Primary

- **Lapis** (lapis): the rail, the Source spine, the primary button, links and link buttons, focus outlines on
  paper, the caret and native accent color. The one large field of color on any screen.
- **Raised Lapis** (lapis-raised): rail item hover and current state; primary button hover.
- **Lapis Rule** (lapis-line): hairlines and outlines on the lapis field (rail divider, the
  language switch border).
- **On-Lapis White** (on-lapis) and **Lapis Mist** (on-lapis-mute): text and icons on lapis;
  white for current and hover, mist for resting rail labels.

### Secondary

- **Gilt** (gold): the "you are here" marker. The current rail icon, the current step's 3px
  underline, the two gilt bands on a spine, and the focus outline on lapis. Never text on paper.
- **Gilt Wash** (gold-wash): text selection only.

### Tertiary

- **Rubric** (rubric): decorated initials, the pen flourish, AI text (the AI Text component), and
  signals of missing data or error, always paired with an icon and words.
- **Rubric Wash** (rubric-wash): the background of a stand-alone warning notice.
- **Rubric Line** (rubric-line): the border of a stand-alone warning notice.
- **Verdigris** (verdigris): done. The check icon and 3px underline of a finished step, the
  check of a finished sheet and the "Copied" check.

### Neutral

- **Ground** (ground): the page behind panels and the setup body.
- **Paper** (paper): panels, the page header, inputs, buttons, call-number labels.
- **Ink** (ink): text, secondary button border, call-number and typed-code border; at 32%
  (`rgb(20 20 20 / 32%)`) the veil behind a sheet.
- **Mute** (mute): secondary text, hints, meta, empty-state copy, field legends, fact labels,
  the Review progress line, rating intervals and key-cap letters.
- **Hairline** (line): panel borders, header rule, row and step dividers, the flourish rule.
- **Strong Hairline** (line-strong): input and choice borders, key-cap borders, the border of a
  leaf over the page (the Versions panel, a sheet), scrollbar thumb.
- **Lapis Tint** (tint): secondary button hover, the current step, a selected choice.

### Named Rules

**The Rubric Rule.** Rubric red marks the decorated initials, the pen flourish and AI text.
When red marks an error or missing data, it always comes with a warning icon and words; red
alone never carries a meaning.

**The Gilt Marker Rule.** Gold says "here": the current Section, the current step, a spine's
bands, focus on lapis. It is never used for text on paper or for decoration elsewhere.

**The One Field Rule.** Lapis is the only large color field (rail, spine, the primary button).
Panels and the page stay paper and ground.

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
- **Label** (600, 14px): buttons, field labels, step names, row titles.
- **Meta** (400, 13px, tabular numerals): hints, step notes, panel meta, status lines.
- **Rail label** (500, 12px, 1.25): Section names under rail icons; they wrap and hyphenate.
- **Call** (Courier Prime 700, 12px/18px, tabular): call numbers and step numbers; the Location
  part of a call number is 400 in Mute.
- **Code** (Courier Prime 700, 28px/36px, 0.14em tracking, tabular): a code the user types
  elsewhere, today the GitHub sign-in code in the Backup sheet; see Typed Code.

### Named Rules

**The One Initial Rule.** Cinzel Decorative appears only as the first letter of a panel heading,
the setup title or the Review bar title, through `::first-letter`, so the heading text stays
whole for screen readers. Never on data, buttons or body.

**The Typed Label Rule.** Courier Prime is for call numbers, step numbers and a code the user
types elsewhere (the GitHub sign-in code) only.

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

Extraction (the Reading Stage past the Free text) fills the window under the header: a work
column (24px 32px 48px padding, content up to 960px, its own scroll) and a 360 to 420px margin
column for the Session on Paper, divided by a full-height Hairline. The margin's transcript
scrolls; its message box stays at the foot (16px 24px 18px, a Hairline above). Below 1080px the
margin moves under the points and the page scrolls as one; below 720px the work column pads 16px.

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

### Named Rules

**The Hairline Rule.** Panels separate by a 1px Hairline and a white leaf on Ground. Don't add
resting shadows.

## Shapes

Quiet, nearly square corners: 4px on panels, buttons, inputs, choices, notices, the step bar and
rail items, key caps, the Review leaf and a sheet; 2px on call-number labels, the typed code
and skeleton bars; 3px on the spine. Review leaf edges round only their two lower corners (4px). The one curve is the
pen flourish (a 64 by 10px stroked SVG with a center dot) set between two hairlines.

## Components

### Buttons

Firm and plain, ink-outlined.

- **Shape:** gently squared (4px), 36px minimum height, 16px side padding, 8px gap to an icon.
- **Primary:** Lapis fill and border, white label, for the next step forward (Add Source, Continue, Start, Skip, Start Review, Show answer, Recalled, Back to Recall, Back up to GitHub, Connect GitHub).
- **Hover / Focus:** primary moves to Raised Lapis with the lapis lift; secondary fills with
  Lapis Tint. 160ms on the shared ease-out. Focus is the 2px lapis outline.
- **Secondary:** Paper with a 1px Ink border and Ink label (Open, Cancel, Save, Retry, Copy
  code, Open GitHub again).
- **Icon:** a 16px Lucide icon (1.8 stroke) before the label, as on Copy code and Open GitHub
  again.
- **Disabled:** 55% opacity, no shadow, not-allowed cursor.
- **Quiet:** no border or fill, Mute 600 13px, 36px minimum height, 12px side padding; hover turns
  it Ink and underlines it (3px offset). For a way out of a slip, set apart from the choices
  (Review's Back), for Discuss, Drop and Undo beside a choice, for the second path beside a
  primary (Use another git remote), for Cancel in a sheet foot, and for an action that undoes a
  setting (Stop backing up).
- **Small:** 30px tall, 12px side padding, 13px, for choices repeated down a list (Keep, Add).
- **Link button:** a button that reads as a link inside running text: no box, Lapis, inherits the
  text's font, a 1px underline at 3px offset that thickens to 2px on hover. For an action that
  belongs to a sentence ("Use another account", "Back up to GitHub" in the Versions panel).

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

- **Style:** Lapis column, 16px 8px padding. The mark is a call-number label ("GLO"). Each
  Section is a 32px Lucide icon (1.6 stroke) over its rail label; a short Lapis Rule separates
  Today from the Sections.
- **States:** resting Lapis Mist; hover and current fill Raised Lapis with white text; the current
  icon turns Gilt. 160ms transitions.
- **Foot:** the EN/DA switch (a stacked segmented control, checked segment white with lapis text)
  and Settings.

### Status Bar

The running foot of the window, as the foot of a printed page carries the folio: Paper, a
Hairline above, 28px tall (32px left and 12px right padding), Mute 13px with tabular numerals.
The left end is free for later status. At the right end sits the Versions item: a 16px Lucide
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

### Step Bar

The three Reading steps in one bordered strip, divided by Hairlines. Each step: a Courier step
number, a Label name, a Meta note. Current: Lapis Tint with a 3px Gilt underline and
`aria-current`. Done: a 3px Verdigris underline and a Verdigris check.

### AI Text (signature)

AI text in a Note. The text stays Ink and Body type; the mark sits at the edge, and it says how
much the AI wrote.

- **Paragraphs:** a 2px Rubric rule on the left with 12px padding, and above the text a Rubric
  gloss (12px, 600, 0.06em tracking, uppercase) opened by a ¶ pilcrow: "AI paragraph" ("AI-afsnit").
- **A whole Part or Note:** a 3px Rubric rule, and a gloss opened by a § section sign: "AI-written
  Part" or "AI-written Note" ("AI-skrevet del", "AI-skrevet note"). For a Part, the rule and the
  gloss cover its heading too.
- The block is a group named by its gloss, so a screen reader hears the words, not only the
  colour.

Note headings in the side panel: 700 15px, 18px above when they follow other text.

- **A title:** "¶ AI-written title" ("AI-skrevet titel") with the lighter 2px rule, above a
  Note's title in the Graph panel and above the title field of a Point the AI proposed.

### Core Points (Extraction)

One panel, its groups divided by Hairlines (22px 28px 26px padding), in this order:

- **The open Point:** the kept Point being written gets the room. Its number in a 28px column;
  the title as a borderless 19px 600 field with a Strong Hairline under it (Lapis on focus);
  where it comes from; the Note text (16px/1.65, 168px tall); a small page field and a word
  count; the AI's draft, if asked for, under the AI Text mark with a quiet toggle to leave it out;
  the proposed Links as a plain list (Note link, Mute reason, Add or Drop); then Save Note
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

### Don't:

- **Don't** decorate data, Note text, inputs or buttons (no initials, flourishes or gilt there).
- **Don't** use red alone to mean anything; color never carries a message by itself.
- **Don't** add resting shadows or new fields of color beyond the lapis rail, spine and primary.
- **Don't** use Cinzel Decorative beyond a single heading initial, or Courier Prime beyond call
  numbers, step numbers and a code the user types elsewhere.
- **Don't** fix widths to English text, truncate labels, or block wrapping.
- **Don't** build a file-tree-plus-editor arrangement in neutral grey, a busy dashboard, or
  gamification.

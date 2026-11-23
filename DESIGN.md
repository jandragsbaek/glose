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
  body-reading:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
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
  paragraph-number:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: '"tnum"'
  code-block:
    fontFamily: "Fira Code, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
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
  settings-window:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    width: "min(1040px, calc(100vw - 64px))"
    height: "min(720px, calc(100vh - 64px))"
  settings-window-spine:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.on-lapis-mute}"
    width: "220px"
    padding: "26px 10px"
  settings-section-current:
    backgroundColor: "{colors.lapis-raised}"
    textColor: "{colors.on-lapis}"
    rounded: "{rounded.base}"
    padding: "9px 12px"
    height: "42px"
  reader-leaf:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-reading}"
    padding: "44px 56px 56px 88px"
    width: "780px"
  passage:
    backgroundColor: "{colors.gold-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
  mark-bar:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.on-lapis}"
    rounded: "{rounded.base}"
    padding: "2px"
  mark-bar-button:
    textColor: "{colors.on-lapis}"
    rounded: "{rounded.label}"
    padding: "0 10px"
    height: "30px"
  apparatus:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "10px 24px 12px 88px"
  reader-notice:
    backgroundColor: "{colors.rubric-wash}"
    textColor: "{colors.ink}"
    padding: "10px 24px 10px 88px"
  margin-quote:
    backgroundColor: "{colors.gold-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "10px 12px"
  kind-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "0 18px"
    height: "40px"
  kind-choice-selected:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.lapis}"
  drop-zone:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "22px 20px"
  drop-zone-over:
    backgroundColor: "{colors.tint}"
---

# Design System: Glose

This file records the visual system as it is built today in `apps/web/src`. It is the current
committed state, not a fixed rule set: Jan designs Glose's UI, and every visual choice
(layout, color, type, window chrome, icons) goes to him. A change he approves updates this file.
Every color comes from a theme: Lapis (the default), Murex and Sepia, each in a light and a dark
variant. The values in this file are Lapis light; see Themes under Colors.

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
rule `jandragsbaek/no-untranslated-ui-text` enforces this), and every layout takes the longer Danish
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
- An Article or a Course lesson is read in Glose, set like a critical edition: Contents at the
  left, each paragraph numbered in the gutter as its Location, the Passages in an apparatus under
  the text, and the work on one Passage in the margin.

## Colors

A cool, bookish palette: one deep lapis field, white paper on a warm near-white ground, and
three small pigments (gold, rubric red, verdigris) each with one job.

### Primary

- **Lapis** (lapis): the rail, the Source spine, the primary button, links and link buttons, focus outlines on
  paper, the caret and native accent color. The one large field of color on any screen, with the
  Settings window's spine as the second while that window is open; the window's 1px border is
  Lapis too. In the
  Sources register it is also the Links toggle, the ring of the current Reading mark, the checked
  segment's label, and the 3px edge on rows that share Links with the chosen Source. In the Probe
  it is the question number and the head of each judgment gloss. Beside the Writing Desk it is the
  trail: the one Lapis line on the Graph, its stop tabs, and the ring around Notes the piece cites;
  while a trail shows, the open Note's other Links turn quiet ink so Lapis means the trail alone.
  In the Reader it is the Mark Bar, the paragraph number where a Passage sits, the ¶ numbers in
  the apparatus, the 1px underline of a Passage taken deeper and "Taken deeper" in the margin. On
  Add Source it is the name of the checked kind, the dot on a value Glose filled in and the same
  dot in the Fill Line, the outline of the chosen catalog record, and the border of a Drop Zone
  while a file is dragged over it. On the Course Shelf it is every added day's spine (Raised Lapis
  once the day is read), the 2px outline and the plus of the next day to add, and the marks of the
  pieces a day has.
  On a Person's Career Line it is the dot of each work (hollow for a talk), the chosen work's
  title, and the 13px ring where a linked Person's Links meet a work; on the Graph a Person is a
  Lapis medallion, a Paper ring inside the disc.
- **Raised Lapis** (lapis-raised): the current rail item, and the section shown on the Settings
  window's spine; primary button hover. Hover on a rail item or a spine section is half a step,
  Lapis and Raised Lapis mixed half and half, so "here" stays the stronger mark.
- **Lapis Rule** (lapis-line): hairlines and outlines on the lapis field (rail divider, the
  language switch border).
- **On-Lapis White** (on-lapis) and **Lapis Mist** (on-lapis-mute): text and icons on lapis;
  white for current and hover, mist for resting rail labels and spine sections.

### Secondary

- **Gilt** (gold): the "you are here" marker. The current rail icon, the current step's 3px
  underline, the 2px underline under the current Reading mark, the two gilt bands on a spine (a
  Source's, and the top and foot of the Settings window's spine), the icon of the section shown
  on that spine, and the focus outline on lapis. Also the triangle of a Check that warns on a Recall slip, beside
  Ink words. In the Reader: the 3px edge of the current section in Contents, the 2px underline
  under the open Passage and under its ¶ number in the apparatus, and the 1px underline (at 70%)
  of a Passage that is only marked. On Add Source, the 3px underline of the checked kind. On the Course Shelf, the
  gilt band at a day spine's head and the 3px bar under the chosen day's spine. Never
  text on paper.
- **Gilt Wash** (gold-wash): text selection, and a Passage, which is a kept selection. The quote
  of the open Passage in the margin and of a Passage taken deeper in the Probe sits on it too.
  Hover on a Passage, and the open Passage, mix it with Gilt (70% Wash, 30% Gilt).

### Tertiary

- **Rubric** (rubric): decorated initials, the pen flourish, AI text (the AI Text component), and
  signals of missing data or error, always paired with an icon and words (on a Recall slip, the
  triangle and words of a Check that fails). In the Probe, at 16% (`rgb(179 38 30 / 16%)`), it
  is the faint highlight under the words of the user's Reasoning a judgment points at.
- **Rubric Wash** (rubric-wash): the background of a stand-alone warning notice and of the
  Reader Foot notice.
- **Rubric Line** (rubric-line): the border of a stand-alone warning notice and of the Reader Foot
  notice.
- **Verdigris** (verdigris): done. The check icon and 3px underline of a finished step, the
  check of a finished sheet and the "Copied" check, a filled (done) Reading mark, and the check
  and "Ready" of a Source ready to cite. In the Probe, the check of a sound Reasoning, a right
  result and a known topic. In the Reader, the 1px underline of a Passage made into a Point, the
  check of "Saved", "Point made" and an understood Passage; on Add lessons, the check of an added
  lesson.

### Neutral

- **Ground** (ground): the page behind panels and the setup body; the group rows of the register;
  the band over the Probe and the user's turns in a transcript; the Settings window's body. In the
  Reader, the band over the desk and the box of code in an Article; the box of code in a Note; on
  Add Source, the Drop Zone.
- **Paper** (paper): panels, the page header, inputs, buttons, call-number labels.
- **Ink** (ink): text, secondary button border, call-number and typed-code border; at 32%
  (`rgb(20 20 20 / 32%)`) the veil behind a sheet and the Settings window.
- **Mute** (mute): secondary text, hints, meta, empty-state copy, field legends, fact labels,
  the Review progress line, rating intervals and key-cap letters.
- **Hairline** (line): panel borders, header rule, row and step dividers, the flourish rule.
- **Strong Hairline** (line-strong): input and choice borders, the segmented control's border and
  dividers, key-cap borders, the ring of a Reading mark not reached yet, the border of a leaf over
  the page (the Versions panel, a sheet), the left rule of a Probe judgment gloss, scrollbar thumb.
  Also the Kind Choice's border and dividers, the catalog results' border, the Drop Zone's border,
  and the left rule of a quote in an Article.
- **Lapis Tint** (tint): secondary button hover, the current step, a selected choice, a hovered or
  checked segment, the register row whose Links are shown, the Settings window's Close on hover,
  the checked or hovered Kind Choice option, the Fill Line, a hovered or chosen catalog record, and
  a Drop Zone while a file is dragged over it.
- **Tray** (tray): a warm well a step darker than Ground, behind the Recall Trays only, so the
  Paper slips in it read as lying in a tray. A neutral, not a field of color.

### Named Rules

**The Rubric Rule.** Rubric red marks the decorated initials, the pen flourish and AI text (on
the Graph, the hollow ring of a Note with AI text, which says it by shape as well).
When red marks an error or missing data, it always comes with a warning icon and words; red
alone never carries a meaning. The Probe's faint highlight under the user's words follows the
same rule: the gloss beside it gives the triangle and the words. The Reader Foot notice too: Rubric
Wash and Rubric Line, a Rubric triangle and Ink words.

**The Gilt Marker Rule.** Gold says "here": the current Section, the section shown on the
Settings window's spine, the current step (in the Step Bar and under a Reading mark), a spine's
bands, focus on lapis. It has one more job: the triangle
icon of a Check that warns on a Recall slip, always beside Ink words ("Could be better · …"). On
the Writing Desk's Format Bar a 2px Gilt underline marks the style the selection already has. Beside
the desk, the open stop of the trail wears it: a ring around its node, a 2px underline under its stop
tab on the Graph, and a 3px underline under its number in the stop strip.
On a Person's Career Line the chosen work wears it: a 3px Gilt underline under its Call
Number and a Gilt ring around its dot.
In the Reader, the current section in Contents wears a 3px Gilt edge (a 2px underline when Contents
is a strip), and the open Passage and its ¶ number in the apparatus a 2px Gilt underline. On Add
Source the checked kind wears a 3px Gilt underline, as the current step does. A marked Passage's
1px underline is Gilt at 70%: the Passage Rule gives it that job.
It is never used for text on paper or for decoration elsewhere.

**The One Field Rule.** Lapis is the only large color field (rail, spine, the primary button).
The Settings window's spine is a second lapis field, and the only one: it shows only while the
window is open, over the veil, and holds navigation as the rail does. The Writing Desk's Format
Bar is lapis as a small tool strip, not a field, and shows only while text is selected. Panels
and the page stay
paper and ground; the one other surface is the neutral Tray well under Recall's slips.

**The Ribbon Edge Rule.** A 3px Lapis edge on the left of a register row says "this Source shares
Links with the one you chose", like a ribbon marker in a book. It is the one place a Lapis side
edge marks rows (the Reader's Contents uses a Gilt side edge, which says "here"), and it never comes alone: the row's Links cell reads "N shared" in Lapis 700, and the
hint above the table repeats the same edge beside a sentence that names the Source.

**The Passage Rule.** A Passage is a kept selection, so it keeps the Gilt Wash of the selection it
came from. A 1px underline at its foot says its work: Gilt (at 70%) marked, Lapis taken deeper,
Verdigris a Point. The open Passage alone wears the 2px Gilt "here" underline. The paragraph
number beside it turns Lapis 700, so the gutter also shows where Passages sit. Gilt Wash marks
only the user's own selections and Passages, never AI text.

### Themes

Every color comes from a theme, and every theme comes in a light and a dark variant. The user
picks the theme and the mode (Light, Dark, or Same as the computer) in Settings, under
Appearance. The default is Lapis, same as the computer. The palette described above is Lapis
light; the other themes keep every job and change the pigments.

- **Lapis** (default): ultramarine binding; the field, the primary button and the marks are all
  Lapis, as described above.
- **Murex**: a Tyrian purple binding; field, primary and marks are purple.
- **Sepia**: a brown leather binding with iron-gall ink. The field and the primary button are
  brown; the marks (links, focus, the current Reading mark, the trail) are a blue-black ink, so
  they never read as Gilt.

**Roles.** The prose above says "Lapis" for three jobs that a theme can split, and the code names
them by role:

- **Field** (`--field`, `--field-raised`, `--field-line`, `--on-field`, `--on-field-mute`): the one
  large color field: the rail, a Source's spine, the Settings window's spine and border, the
  Format Bar and the Mark Bar.
- **Primary** (`--primary`, `--primary-raised`, `--on-primary`): the primary button and the status
  bar's "go" item. In dark it is a step lighter than the field, so it stands on dark Paper.
- **Accent** (`--accent`): Lapis as a mark on Paper: links, focus outlines, the caret, rings,
  edges, underlines, the Graph's trail and lit nodes.

Gilt, Rubric, Verdigris and the neutrals keep their names and jobs in every theme. Three shared
tokens follow the appearance: **Veil** (`--veil`, Ink at 32% in light, black at 58% in dark)
behind a sheet and the Settings window, **Halo** (`--halo`, Accent at 18% in light, 30% in
dark) around a focused input, and **Crease** (`--crease`, Ink at 18% in light, black at 72% in
dark), the deepest shade of the fold between the Writing Desk and the Graph beside it.

**Dark.** The scene is the same desk in the evening: long reading under a lamp. Ground is a
near-black tinted with the theme's hue, Paper one step lighter (a leaf still lifts off the desk),
the Tray well one step darker. Ink is a soft warm white, never pure white. The field keeps its
pigment, deep, so the rail is still the one color field; Accent turns light, so marks read on dark
Paper. Text selection and a Passage keep a dark Gilt Wash under Ink.

| Token            | Lapis Light | Lapis Dark | Murex Light | Murex Dark | Sepia Light | Sepia Dark |
| ---------------- | ----------- | ---------- | ----------- | ---------- | ----------- | ---------- |
| `field`          | `#1e2f7a`   | `#1b2768`  | `#4a1c50`   | `#441a4b`  | `#3b2a1e`   | `#3b2b1f`  |
| `field-raised`   | `#2b3e92`   | `#283686`  | `#5d2a65`   | `#57255f`  | `#4d3828`   | `#4e3929`  |
| `field-line`     | `#3a4c9c`   | `#34439a`  | `#703a79`   | `#6a3273`  | `#604735`   | `#614734`  |
| `on-field`       | `#ffffff`   | `#ffffff`  | `#ffffff`   | `#ffffff`  | `#ffffff`   | `#ffffff`  |
| `on-field-mute`  | `#c3cbec`   | `#b3bce6`  | `#dcc4e0`   | `#dcc0e0`  | `#e0cfbd`   | `#dcc8b2`  |
| `primary`        | `#1e2f7a`   | `#3a52c6`  | `#4a1c50`   | `#8a3d97`  | `#3b2a1e`   | `#8a6040`  |
| `primary-raised` | `#2b3e92`   | `#4660d6`  | `#5d2a65`   | `#9849a6`  | `#4d3828`   | `#986c4b`  |
| `on-primary`     | `#ffffff`   | `#ffffff`  | `#ffffff`   | `#ffffff`  | `#ffffff`   | `#ffffff`  |
| `accent`         | `#1e2f7a`   | `#97a9fa`  | `#5c2463`   | `#dba6e6`  | `#283a57`   | `#a8bde0`  |
| `tint`           | `#eef0f8`   | `#1c2346`  | `#f6eff6`   | `#2b1b30`  | `#eef1f5`   | `#1d2534`  |
| `gold`           | `#c8a040`   | `#d8b55e`  | `#c8a040`   | `#d8b55e`  | `#c8a040`   | `#d8b55e`  |
| `gold-wash`      | `#f6efdc`   | `#3b3220`  | `#f6efdc`   | `#3b3220`  | `#f6efdc`   | `#3b3220`  |
| `rubric`         | `#b3261e`   | `#f2836f`  | `#b3261e`   | `#f2836f`  | `#b3261e`   | `#f2836f`  |
| `rubric-wash`    | `#fbeceb`   | `#2c1715`  | `#fbeceb`   | `#2c1715`  | `#fbeceb`   | `#2c1715`  |
| `rubric-line`    | `#e7c9c6`   | `#5c2d27`  | `#e7c9c6`   | `#5c2d27`  | `#e7c9c6`   | `#5c2d27`  |
| `verdigris`      | `#3e7c5a`   | `#6dc494`  | `#3e7c5a`   | `#6dc494`  | `#3e7c5a`   | `#6dc494`  |
| `ground`         | `#fbfaf7`   | `#0d0f17`  | `#fbf9f9`   | `#110d12`  | `#faf8f4`   | `#100e0b`  |
| `paper`          | `#ffffff`   | `#151824`  | `#ffffff`   | `#1a141c`  | `#ffffff`   | `#1a1712`  |
| `ink`            | `#141414`   | `#e7e5df`  | `#171217`   | `#e9e3e7`  | `#18150f`   | `#ebe5da`  |
| `mute`           | `#5c5f6a`   | `#9c9fb2`  | `#635a66`   | `#a798a9`  | `#635b50`   | `#a99f90`  |
| `line`           | `#dedde3`   | `#252a3c`  | `#e4dde4`   | `#2d2430`  | `#e3ddd3`   | `#2e2920`  |
| `line-strong`    | `#c9c8d1`   | `#363c54`  | `#d0c6d1`   | `#3f3343`  | `#d0c7b9`   | `#40392d`  |
| `tray`           | `#f3f2ee`   | `#090b11`  | `#f4eff0`   | `#0c090d`  | `#f2eee6`   | `#0b0a07`  |

**The Two Leaves Rule.** A theme is complete only with both leaves: every theme defines every
token in light and in dark. `apps/web/src/styles/themes.test.ts` checks that the sets match, and
that the readable pairs hold their contrast in all six (Ink 7:1 on Paper, Ground, Tint, Gilt
Wash and Rubric Wash; Mute, Accent, Rubric and Verdigris 4.5:1; labels on the field and primary
4.5:1 or more; Gilt 3:1 on the field).

**The Token Rule.** A color value lives only in `apps/web/src/styles/themes/`. Every other
stylesheet and component reads a token (`var(--accent)`, or `color-mix()` of tokens for a
tint; mask gradients use `--mask`). The same test fails on a color literal (hex, `%23` hex in a
data URI, a color function or a named color) in any declaration outside the theme files, and on a
`var(--…)` that nothing defines. In TypeScript the lint rule `jandragsbaek/no-raw-color` (the
`theming` preset) does the same. The Graph canvas reads the tokens from the page and redraws when
the theme changes. A panel's `initial="accent"` draws its Initial in Accent, so it follows the
theme.

**The Crossfade.** Changing the theme or the mode crossfades the whole window in 280ms on the
shared ease-out (a view transition); under reduced motion it changes at once. A change of the
computer's own mode does the same while the mode is Same as the computer.

**No flash.** A script in the page head sets the theme before the first paint. On the desktop,
Electron follows the mode (`nativeTheme`), so the title bar matches, and the window opens on the
last Ground color.

## Typography

**Display and UI Font:** Public Sans 400/500/600/700 (with system-ui, sans-serif)
**Initial Font:** Cinzel Decorative 700 (with Cinzel, serif)
**Label Font:** Courier Prime 400/700 (with ui-monospace, monospace)
**Code Font:** Fira Code 400/600 with its ligatures (with ui-monospace, "SF Mono", Menlo,
Consolas, monospace), for code in a Note, an Article or a Course lesson only
**Writing Fonts:** the prose in Write takes the typeface chosen under Settings → Text: Public Sans
(Plain, the default), Source Serif 4 400/700 with italics (Book) or IBM Plex Mono 400/700 with
italics (Typewriter). Nowhere else.

All are self-hosted via @fontsource. **Character:** a plain, civic sans does all the
working text; a typewriter face types the library labels; a decorated capital appears once per
heading like an illuminated initial.

### Hierarchy

- **Display** (700, 30px, 1.2, -0.015em): the largest title. The first-start title ("Set up
  Glose") is one step down, 700 28px at the same line height and tracking, and plain: it has no
  Initial. In the first start the Initials are on each step Panel's heading.
- **Headline** (700, 22px, -0.01em): the page title in the white header, and "Settings" in the
  Settings window's head.
- **Title** (700, 21px, 1.25): the current Source's title on Today.
- **Panel heading** (600, 13px, 1.3, 0.06em tracking, uppercase): every panel's `h2`; its first
  letter is the Initial. Fieldset legends use the same set in Mute. The Review bar title uses
  the same set, with a lapis Initial.
- **Initial** (Cinzel Decorative 700, 2em of the heading, 0.9 line height): the panel heading's
  first letter, in rubric or lapis.
- **Body** (400, 15px, 1.5): all running text; empty states cap at 62ch.
- **Body for writing** (400, 16px, 1.65, max 72ch): the Free text area.
- **Prose in Write** (400, the chosen size: 15, 16, 18, 20 or 22px; line height 1.65 Plain, 1.6
  Book, 1.7 Typewriter): the Writing Desk's text. Its headings (1.375em and 1.125em) and Reference
  numbers (0.75em) scale with it.
- **Body for reading** (400, 17px, 1.7, max 66ch): the text of an Article or Course lesson in the
  Reader. It is one step above writing, for long reading. Its headings: h2 700 22px (-0.01em), h3
  700 18px, h4 700 16px, all 1.3 with balanced wrap, 1.7em above and 0.55em below. Tables in the
  text are 14px/1.45 with tabular numerals and Mute 600 13px heads; captions are Mute 13px; the
  text's own notes are 14px/1.55 under a Hairline.
- **Code in an Article** (Fira Code 400; inline 0.86em on Ground with 2px corners, a block
  13.5px/1.55 on Ground in a Hairline 4px box): code the author wrote. It is part of the text, not
  a label, so it does not take Courier Prime.
- **Code in a Note** (Fira Code 400, 12.5px/1.6, names 600; inline 0.86em on Ground in a Hairline
  2px box): see Code Block.
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
  question numbers (in Lapis); the Location part of a call number is 400 in Mute. A Course lesson's
  call number ends in its week·day (`LIN 2026 1.3`). In the Reader's apparatus, the ¶ number of a
  Passage (Lapis 700 12px/1.4), and in the text a note number (Lapis 700 11px).
- **Paragraph number** (Courier Prime 400, 12px/1.2, tabular, Mute, right-aligned in the 88px
  gutter): "¶ 8" beside each paragraph, list item and quote of the Reader's text. It is the
  paragraph's Location. Where a Passage sits it turns Lapis 700. It is not selectable text.
- **Code** (Courier Prime 700, 28px/36px, 0.14em tracking, tabular): a code the user types
  elsewhere, today the GitHub sign-in code in the Backup sheet; see Typed Code.

### Named Rules

**The One Initial Rule.** Cinzel Decorative appears only as the first letter of a panel heading
or the Review bar title, through `::first-letter`, so the heading text stays
whole for screen readers. Never on data, buttons or body.

**The Typed Label Rule.** Courier Prime is for call numbers, step numbers, the Probe's question
numbers ("Q6"), repository names in the
Repository Rows (a repository is the Vault's shelf mark on GitHub), a code the user types
elsewhere (the GitHub sign-in code), the paragraph numbers that are Locations ("¶ 8", in the
Reader's gutter and apparatus), note numbers in a read text, and a Course lesson's week·day
(in its call number and in the Week · Day field of the lesson table) only. Code in a Note or an
Article is not a label: it takes the Code Font.

## Layout

A two-column frame: the 96px lapis rail, then a scrolling main area. The main area opens with a
white page header (title, a muted sub-line such as the date, actions pushed right; it wraps), and
then the page body (24px top, 32px sides, 40px bottom) on Ground.

The main column ends in the Status Bar, a 28px running foot under the main area only, so the
rail stays a full-height spine.

Working pages use a main column plus a 300 to 380px side column with 20px gaps; panels stack in
each column with 20px gaps. Below 1080px the columns become one, in reading order. Form and
single-topic pages cap at 760px.

The first start has no rail, no page header and no band. It is a grid on Ground, centred up to
1120px (56px 32px 72px padding): a 300px step column (see Setup Steps), 48px of gap, then the step
Panel in the rest. The step column is sticky, 32px from the top, so the steps stay in view while a
long step Panel scrolls. Below 860px the two become one column (28px gap, 32px 20px 48px
padding), and the step list is no longer sticky.

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
200–290px | 1fr`, that sets the leaf between two margins (32px top). The desk is a container
(`container: desk`), so its margins fold by the desk's own width, not the window's: below 1104px of
desk the margins fold under the leaf in reading order (left margin, then right) and the desk pads
24px; below 625px it pads 16px. From a 1200px window the Graph can sit beside the desk (see Graph
Beside the Desk): the window then splits in two equal columns under the bar, each with its own
scroll, and the desk's margins fold under the leaf.

The Reader (the Read step of an Article or Course lesson, at `/sources/<id>`, and with `?text=1`
from a later step) fills the window under the page header. The head carries the title, the author,
the course or site with the lesson's "Week 1 · Day 2" after a Mute "·", and the call number; its
actions are the Lesson Nav. Under it a Ground band (14px 32px, a Hairline below; 10px 24px gaps,
it wraps) holds the Step Bar on Paper (up to 560px; Read · Extraction · Probe, or Read · Probe ·
Extraction) and a Mute 13px line that says how to mark and names the keys ("M marks · D goes
deeper · Esc leaves"). Then the desk: three columns, `190–240px | up to 780px | 300–360px`, 32px
apart, centred, 32px at the sides, each scrolling on its own (thin scrollbars, contained
overscroll): Contents, the leaf column, and the margin. The leaf column ends in the Reader Foot,
which stays under the scrolling leaf. Below 1240px Contents becomes a strip across the top (h2
sections only, one line, scrolling sideways with its last 48px faded out), and the leaf and the
margin (280–340px) share the row. Below 900px the desk is one column that scrolls as a whole (16px
sides), the foot sticks to the bottom of the window, the band pads 12px 16px, and the gutter
narrows to 64px.

Add Source (`/sources/new`) is one column up to 760px for every kind, so switching kinds never
moves the page: the Kind Choice with its one-line hint 8px under it, then, 20px below, one panel
for the kind ("The book", "The article", "The course", "The video"). The panel's first body is the
way in (the catalog search, the Drop Zone, or a Video's YouTube address with Look up); under a Hairline the second holds the data, fields 16px apart;
the Panel Foot ends it. Course lessons puts the course data first and then sets its table across
the panel, just above the foot. Each kind keeps what the user typed while another kind is shown. One Lapis button per
state: for an Article and Course lessons, the way in while it is open, then the foot's submit
(secondary until then); a book has no way in to wait for (the fields work alone), so its Search is
secondary and Add Source is the primary from the start. A control that removes itself hands the
cursor on: Undo to Family name, "Show all" to the chosen record, "Keep" and a read file or folder
to "Choose another" or "Choose other files". A file or folder still being read never overrides a
newer choice (another file, pasted text, "Keep", the article's kind, "Lessons a week"; a DOI in
the file sets the kind to Academic paper only if the user did not touch the kind meanwhile), and Add
waits for it in both kinds while the status line says "Reading the file…" / "Reading the files…"
(a new read clears an old file error first).
After a read the cursor moves on only if it is still at the way in. Add with the chooser open
keeps the current lessons. A dropped folder is read to every depth.

A focus screen (today only Review, at `/review`) fills the window without the rail and the page
header. A 64px bar (12px 32px padding) holds the title left, a centred progress line and the way
out right; the desk below centres one 720px column (68px top, 32px sides, 48px bottom). Below
720px the bar pads 16px, the progress line drops under the title, the desk pads 24px 16px 32px
and button rows stack full width.

There is no Settings page. Settings is the Settings window, laid over whatever page is open
(`?settings=<section>` on any page with the rail); the page under it keeps its layout and its place, and closing
the window leaves the user there.

**The Danish Length Rule.** No layout depends on the length of English text. Heads, rows and
button rows wrap; rail labels hyphenate and break anywhere; nothing truncates a label.
Check every new screen in Danish.

## Elevation & Depth

Flat by default. Depth comes from the step between Ground and Paper and from 1px hairlines.
There are two shadows, both responses to state, and one shade at rest: the Crease.

### Shadow Vocabulary

- **Lapis lift** (`box-shadow: 0 2px 6px rgb(30 47 122 / 22%)`): primary button hover only.
- **Focus halo** (`box-shadow: 0 0 0 3px rgb(30 47 122 / 18%)`): inputs and the textarea on
  keyboard focus, with a lapis border.

Elsewhere, focus is a 2px lapis outline at 2px offset (gold on the rail).

**The Crease.** With the Graph beside the Writing Desk, the two halves meet like the pages of an
open book. The line between them is a Strong Hairline, and each page darkens into it: a gradient of
Crease laid over the fold (96px wide, `pointer-events: none`, it does not scroll), the desk's side
over 48px and the Graph's over 20px, so the Note text 24px in stays clean. It is the one resting
shade in Glose, and only here, where the screen is a spread; it is hidden in forced colors. What
sits in the shade keeps its contrast: the desk's scrollbar thumb is Mute, and the Graph canvas's
focus outline sits 4px in.

The Review stack shows depth the same way: the Cards still to come are paper edges under the
leaf, each narrower, with hairline borders and no shadow.

A sheet lifts off the page without a shadow: the page behind it dims under an Ink veil at 32%,
and the leaf takes a Strong Hairline border.

The Settings window lifts the same way, under the same Ink veil at 32%, with no shadow. Its edge
is a 1px Lapis border; on phones it fills the screen and has none.

Recall stacks the same way. The Recall Review leaf has up to three paper edges under it, and
the folded Good pile up to two. The Trays sink one step below Ground (Tray), with a Hairline
border, so their Paper slips lie in them; nothing casts a shadow.

The register's lapis edge is drawn with `box-shadow: inset 3px 0 0` on a row's first cell, so it
needs no border that would shift the columns. It is a mark, not depth. The Reader draws its marks
the same way: a Passage's underline (`inset 0 -1px 0`, `-2px` when open), the Gilt edge of the
current section in Contents (`inset 3px 0 0`), and the checked Kind Choice's Gilt underline
(`inset 0 -3px 0`).

The Mark Bar floats over the text without a shadow: the Lapis strip on Paper is contrast enough.
The apparatus sits under the leaf behind a 2px Ink rule, not a shadow.

### Named Rules

**The Hairline Rule.** Panels separate by a 1px Hairline and a white leaf on Ground. Don't add
resting shadows. The one exception is the Crease between the Writing Desk and the Graph beside it.

## Shapes

Quiet, nearly square corners: 4px on panels, buttons, inputs, choices, notices, the step bar and
rail items, key caps, the Review leaf, a sheet, the Settings window and its spine's sections
(the window is square on phones, where it fills the screen); 2px on call-number labels, the typed code
and skeleton bars; 3px on the spine. Review leaf edges round only their two lower corners (4px). The one curve is the
pen flourish (a 64 by 10px stroked SVG with a center dot) set between two hairlines. The one circle
is the Reading mark (9px, 1.5px ring). The register's lapis edge is a straight 3px band. The one dashed line is the folded Good pile's
1px Strong Hairline border: a leaf that stands for Cards not laid out. In the Reader a Passage
rounds 2px, the Mark Bar 4px with 2px buttons and key caps; the leaf is square with an open lower
edge, where the apparatus meets it. The one heavy line is the apparatus's 2px Ink top rule.

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
- **Panel Foot:** 16px 20px, a Hairline above: the problem line (Rubric, with its icon) and the
  status line, each only when it speaks, then the buttons, the primary first and a quiet Cancel.
  Add Source ends each panel this way.
- **More details:** a fold for the fields a Citation rarely needs, named by them ("Edition and
  translator", "Other authors and date accessed"): a 16px Mute chevron that turns 90° (160ms) and
  the summary in 600 14px, Lapis on hover; the fields open in the same two-column grid 12px below.
  It opens by itself when Glose fills one of its fields.
- **Empty state:** Mute body, max 62ch, saying what comes next and how; a lead line (600, 16px,
  Ink) where the empty state is the main content.

### Inputs / Fields

- **Style:** Paper, 1px Strong Hairline, 4px, 8px 12px padding, Body type. Label 600 14px above,
  "(optional)" in Mute 400 beside it, hint in Meta below. On Add Source, where most fields are
  optional, it is the other way round: the few that must be filled say "required" in Mute 400.
- **Filled in:** a value Glose took from Open Library or a file's frontmatter carries a 6px Lapis
  dot at the input's right end (30px right padding) until the user edits it. The Fill Line above the
  fields is its key; screen readers hear where the value came from. A new file or folder replaces
  only values Glose filled, never what the user typed; Undo puts back only the fields the user has
  not touched since, and stays offered when a chosen book only emptied fields (the line then has
  no dot and says so). The line names its origin: the file, the pasted text, the files, the folder
  name, or both. Empty status and alert lines stay in the accessibility tree, visually hidden.
- **Checking a form:** the browser's own bubbles are off (`noValidate`). A failed submit puts the
  Rubric line under each field that needs a value or a fix, one summary in the Panel Foot, and the
  cursor in the first such field. When the way in is missing (no text, no lesson files), only that
  says so, beside the Drop Zone, and the cursor goes to its button.
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
- **Fill Line:** one line on Lapis Tint (4px, 10px 12px, 14px) at the top of the fields: the
  same 6px Lapis dot, the words ("Filled in from Open Library. Check the marked fields against your
  copy.") and, for a catalog fill, Undo as a link button pushed right. It replaces a notice and the
  per-field "From …" lines.
- **Inside a panel:** the panel is the box; the notice drops its border and fill and keeps icon
  and words (a warning title turns Rubric).
- **Inline warning:** a rubric triangle icon and a sentence, with a link to the fix.

### Navigation (Rail)

- **Style:** Lapis column, 16px 8px padding. The mark is a call-number label ("GLO"). Each item is
  a 32px Lucide icon (1.6 stroke) over its rail label. Today (calendar) and Sources (library) are
  places and sit above a short Lapis Rule; the three Sections (Graph, Writing projects, Recall)
  sit under it.
- **States:** resting Lapis Mist; current fills Raised Lapis with white text and turns its icon
  Gilt; hover is half a step (Lapis and Raised Lapis mixed half and half) with white text. 160ms
  transitions.
- **Foot:** the EN/DA switch (a stacked segmented control, checked segment white with lapis text)
  and Settings. Settings is not a link to a page: it is a button that opens the Settings window
  (`aria-haspopup="dialog"`, `aria-expanded`). While the window is open, Settings wears the current
  state (Raised Lapis, Gilt icon) and is the only lit rail item; the page's own item under the veil
  goes back to rest.

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
Hairline border, no shadow): the heading "Versions of your Vault" with a lapis Initial and the
flourish; a problem as an in-panel warning notice; the Facts (a remote as `github.com/<login>/<repo>`;
a missing one as "Only on this computer." ("Kun på denne computer.") in Mute, followed by a
"Back up to GitHub" link button that opens the Backup sheet); then, under a Hairline, the End the day
form: a field label, the input, a Meta hint, and the primary End the day button with a Mute
status beside it (a Verdigris check after the day is saved). It fades in and rises 4px in
160ms on the shared ease-out; Esc and a click outside close it.

### Settings Window

All settings in one window over the page the user is on, like a small bound volume laid on the
desk. A native `<dialog>` opened with `showModal`, `min(1040px, 100vw - 64px)` by
`min(720px, 100vh - 64px)`, centred, so the page shows 32px around it at the least. The address
holds it: `?settings=<section>` on any page with the rail (not the Review focus screen) opens it at that section (`language`,
`appearance`, `text`, `vault-folder`, `backup`, `chatgpt`, `site`).

- **Window:** Paper, a 1px Lapis border, 4px corners, no shadow. Two columns: the 220px spine, then
  the leaf.
- **Spine:** a Lapis field (76px 10px 26px padding, so its first section lines up with the first
  panel under the head; its own scroll), closed at the top and the foot by
  two 2px Gilt bands, 6px apart (8px and 14px from the end). It lists the seven sections in the
  rail's vocabulary: a 20px Lucide icon (1.6 stroke) and the name in 500 14px/1.3, 12px apart, in
  a 42px row (9px 12px padding, 4px corners, 4px gaps). Names hyphenate and break anywhere.
  Resting sections are Lapis Mist. The section shown fills Raised Lapis with white text, turns its
  icon Gilt and carries `aria-current="page"`; hover is half a step (Lapis and Raised Lapis mixed half and
  half) with white text. Focus is the Gilt outline. 160ms on the shared ease-out.
- **Head:** a 56px Paper band (8px 16px 8px 32px padding, so the close glyph ends on the panels'
  right edge), a Hairline under it. "Settings"
  ("Indstillinger") in the Headline set, then the Close button pushed right: a quiet Ink button
  (10px side padding, 10px gap) with an Esc Key Cap and a 20px X icon (1.8 stroke), named "Close
  Settings" ("Luk Indstillinger"), with `aria-keyshortcuts="Escape"`. Hover fills it Lapis Tint,
  without an underline.
- **Body:** Ground, its own scroll (20px 32px 40px). It shows one section at a time, after T3
  Code's settings pages: its panel as on any page, up to 760px wide, with its own Initial,
  and its title an `h3` under the window's `h2`. The sections: Interface language (choice
  rows), Appearance (the Appearance Panel), Text (the Text Panel), Vault (the path as a Call Number label that
  wraps, and a Meta hint), Backup (the Backup Panel), ChatGPT and Your website. A sheet opened from a panel opens over the window.
- **Spine and pages:** the window opens at the section in the address. A click on a spine section
  puts it in the address (replacing the entry, so Back does not walk the sections) and shows it
  from its top. Each time a section is shown it takes focus, so the first Tab goes to its first
  control. Each section is a `role="group"` named by its title, `tabindex="-1"`, without an
  outline; the spine section points to it with `aria-controls`. The sections not shown stay in the
  page, `hidden`, so what the user did in one stays while the window is open. A sheet opened from
  a panel gives focus back to the button that opened it when it closes.
- **Veil and motion:** the page dims under Ink at 32%, as under a sheet. The window fades in from
  98.5% scale in 160ms on the shared ease-out while the veil fades in. Closing runs a 140ms out
  animation, back to 98.5% and clear with the veil, then the dialog closes. Under reduced motion
  the window closes at once.
- **Leaving:** Esc, the Close button, or a press and release on the veil closes it and takes
  `?settings` out of the address (replacing the history entry), so the user is on the same page.
- **Ways in:** the rail's Settings opens it at Interface language. Every "Open Settings" where the AI
  needs ChatGPT (a button in the info notice and in a Session problem, a link button in the Writing
  Desk's note) opens it at ChatGPT. Each is a button with `aria-haspopup="dialog"`.
- **Narrow:** below 720px the window fills the screen, without border or corners. The spine lies
  across the top as a band: the sections wrap in rows (36px tall, 6px 10px padding), with two Gilt
  bands at the top (6px and 12px down) and one at the foot. The head pads 16px at the left; the body
  pads 16px 16px 32px.

### Appearance Panel

The second panel in Settings ("Udseende"), with a lapis Initial. Two fieldsets, 24px apart, each
under a field legend:

- **Light or dark** ("Lyst eller mørkt"): the Segmented control with three options, each a 16px
  Lucide icon and a label: Light (Sun), Dark (Moon), Same as the computer (Monitor). While the
  mode follows the computer, a Meta hint under it says which it is now ("The computer is dark
  now."); the hint is a polite live region that stays in place and is empty in the other modes.
- **Theme** ("Tema"): one Binding per theme in a grid (184px at the least, 12px gaps), then the
  hint "Every theme comes in a light and a dark version." A Binding is a radio option drawn like
  a Kind Choice option: Paper, a Strong Hairline border, 4px corners; hover borders it Mute; the
  checked one takes an Accent border, the 3px Gilt underline and an Accent name. Its top is a
  92px specimen of the theme itself, its light leaf beside its dark leaf: an 18px spine of the
  field with two Gilt bands, then on each leaf a Paper page rising from Ground with a Rubric
  Cinzel "G", an Ink, a Mute and an Accent line, and a small Primary bar. The specimen sets
  `data-theme` and `data-appearance` on each leaf, so it is drawn by the real tokens. Under it,
  the theme's name in 600 15px.

### Text Panel

The third page in Settings ("Tekst", `?settings=text`, a Lucide Type icon), with a lapis Initial:
how the prose looks in Write, for every piece on this computer.

- **Lead:** "How your words look while you write." in Mute.
- **Sample:** a Ground well (Strong Hairline, 4px) holding a Paper leaf drawn with the chosen
  typeface and size, as wide as its real line (narrower only when the window is): a sample
  sentence in the interface language with a raised Reference number, "Æble, ø og å.", and under a
  Strong Hairline the gloss (Courier number, Ink 600 Note title, Mute call). Under it a ruler as
  wide as the line and its caption in Mute 12px ("Standard: about 70 characters a line"), which
  always names the true count.
- **Scope:** "For every piece on this computer. Preview shows the post as readers will see it."
  in Meta.
- **Typeface:** three radio tiles (184px at the least, 12px gaps): "Ag" at 30px in the face and
  the name in 600 15px (Plain, Book, Typewriter). Checked: Accent border and name, the 3px Gilt
  underline, as a Binding.
- **Text size** beside **Width** (they wrap as wholes): a Segmented control of five steps, each an
  "A" in the face at its size over its number in Mute 12px, named "18 pixels"; the checked step
  takes the Gilt underline. A hint under it names 16 as the standard size. Width is three tiles
  (44px, a 24px page icon whose lines grow with the width, the name in 600 14px); checked is
  Lapis Tint with an Accent border.
- **Focus:** a closing line over a Hairline: "Focus hides everything on the desk but your text."
  and the way in ("The Focus button on the desk, or" and the key cap).

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

**Backup sheet.** Opened from the Backup Panel (Back up to GitHub, Use another git remote) and from the
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

**Remote Vault sheet.** The Backup sheet run the other way, opened from the first start's Vault
step. Titled "Get your Vault from GitHub" ("Hent dit arkiv fra GitHub") with a rubric Initial;
it only chooses, and the setup page copies.

- **Step 1, connect:** the Backup sheet's connect step and code, in this sheet's own words (what
  GitHub's code lets Glose read).
- **Step 2, choose:** "Signed in to GitHub as <login>." with "Use another account", then the
  Repository Rows under the field label "Choose the Vault" and a Meta hint, the latest pushed
  Vault chosen and focused; Use this repository (primary, off while no row is chosen) and Cancel. Loading is the live line; a failed list is an
  in-sheet warning notice with Try again; no repositories is the Mute empty sentence.
- **Another git remote:** the same sheet without steps: a sentence, the Remote address field,
  Use this remote (primary, "Checking…" while git looks) and Cancel; a remote git cannot read
  gets the field error line.

### Repository Rows

The account's private repositories as radio rows in the Choice style: Strong Hairline, 4px, 10px
12px padding, 12px gaps; checked turns Lapis with Lapis Tint, hover darkens the border to Mute.
Each row: the radio, the repository as a typed call-number label (`jandragsbaek/glose-vault`; a long
name wraps inside its label) over a Mute 13px "Updated 12 Nov", and at the right end its states in
fixed places: a Lapis 600 13px "Vault" with a 14px Lucide waypoints icon (the Graph Section's icon)
over a Mute "Yours" or "Shared by <owner>". Vaults come first; the rest fold under a Mute 600 13px
disclosure, "Other repositories (7)", with a hint that one becomes a Vault as it is. Below 520px the
states drop under the name.

### Setup Steps

The step column of the first start, on Ground. From the top: the GLO call-number label; the title
"Set up Glose" (700 28px, 18px below the label, no Initial); the purpose in one 15px/1.5 sentence,
10px below; a Mute 13px line that says how long it is and that Settings can change the language and
look; then the steps, 24px below.

- **List:** an ordered list in a `nav` named "Steps", with a Hairline above and under each row.
  The five steps always show: Language and look, Vault, How Glose works, ChatGPT, Your first book.
- **Row:** three columns (24px, the rest, 16px; 10px apart), 13px 14px 13px 16px padding. The step
  number in Courier Prime 400 14px/1.4 in Mute; the step name in 600 15px; under the name, the
  chosen value in Mute 13px/1.4 that wraps anywhere ("English · Lapis", "Glose, in your home
  folder (nayena)", "Later", "Connected", "Read"), or a short hint before it is chosen ("The folder
  for your work", "Optional"). An empty value takes no room.
- **Current:** Lapis Tint with a 3px Gilt edge on the left (an inset shadow, so the row does not
  move), the number in Accent, and `aria-current="step"`. The current row is not a button.
- **Done:** a 16px Verdigris check in the third column. A step is done when the user went past it;
  the Vault is done when it is made or opened.
- **Open:** a step the user reached before is a button. Hover gives it Lapis Tint in 160ms on the
  shared ease-out; focus is a 2px Accent outline inside the row.
- **Locked and skipped:** a step the user has not reached yet, every step while Glose saves the
  Vault or the book, and a skipped step are plain text, not clickable, with the name in Mute. A hidden line tells a screen reader the state ("After the Vault", "Skipped"). A Vault that
  already holds Sources skips How Glose works (its value is "Skipped") and turns Your first book's
  value into "Your Vault has 12 Sources".
- **Focus:** when a step changes, its Panel heading takes focus.

### Setup Step Panel

One Panel per step, beside the step column, with the panel heading, its Initial and the flourish.
The Initials alternate: rubric (Language and look), lapis (Vault), rubric (How Glose works), lapis
(ChatGPT), rubric (Your first book). The body is a grid with 18px gaps (18px 20px 22px padding);
lead sentences are 15px/1.55 and cap at 62ch.

- **Language and look:** the Interface language as stacked Choice rows under a field legend, with
  a Meta hint, then the Appearance Panel's two fieldsets as they are in Settings (Light or dark,
  Theme with its Bindings). A choice repaints and relabels the page at once.
- **Step foot:** a second panel body under a Hairline (16px 20px 20px padding). Back is a quiet
  button at the left; its words line up with the content edge (the button's own padding sits
  outside it). The actions sit at the right in a wrapping row with 12px gaps, the primary last.
  Language and look has no Back; its Continue still sits at the right. A step with a way out puts
  "Go to Today" there as a quiet button. ChatGPT's own action is "Later" (secondary) until ChatGPT
  is connected, then Continue (primary). Your first book uses the Add Source book panel's foot:
  Back at the left, "Add the book" (primary) pushed right, and "Not now" (quiet) at the right end
  of the lead sentence, its words on the right content edge.
- **Where row (Vault):** under the choices and a Hairline (14px above, 12px gaps): a Meta hint for
  the chosen way ("Glose makes a new folder for your work."), then the Facts row "Where". Its value
  is the folder as a place: an 18px Lucide folder icon in Accent, the folder's name in bold 15px,
  then "in your home folder (nayena)" or "in Documents" in Ink; under it the full path in Public
  Sans 12px/1.4, Mute, wrapping anywhere. With no folder yet it is "No folder chosen yet" in Mute.
  On the desktop, a button with a 16px folder-open icon opens the native folder picker: "Change…"
  (secondary), or "Choose the folder…" (primary) while Open an existing folder has no folder. A
  quiet disclosure, "Type a path instead", holds the Folder path field; it opens by itself if the
  picker fails. In a browser there is no picker, and the field shows at once. A field error sits
  under the button; a storage error is an error Notice. The Meta privacy line ends the body.
- **Vault made:** a sentence, the same place (icon, name, where, path), and a Meta line with the
  count of Sources; Back and Continue (primary, focused).
- **How Glose works:** a lead sentence, then the three Sections as rows between Hairlines (16px 0
  padding; a 28px column and the text, 14px apart). Each row: the rail's 24px Lucide icon in Accent
  (Waypoints, NotebookPen, Layers), the name in 700 16px, what it holds in Body, and what the AI may
  do there in Mute 14px. Graph and Recall then show the real AI mark on a sample line (see AI Text),
  6px below: Graph the paragraph mark ("¶ AI paragraph") on a Note sentence, Recall the whole-Card
  mark ("§ AI-written Card") on a question. Writing projects has no sample, as the AI never writes
  prose there.

### Setup Remote Ledger

In the first start's Vault panel, "Get it from GitHub" is the third choice. Under the choices,
a Hairline, then the Facts ("From": "Not chosen yet" in Mute, or the place, such as
`github.com/jandragsbaek/glose-vault`, with "Yours" or "Shared by <owner>" in Mute 13px), once a
remote is chosen a Meta line that Glose keeps the backup there, an error line (no remote chosen, or
the copy failed), and the buttons, 10px below: Choose on GitHub (primary until a remote is chosen,
then the secondary Choose another) and a quiet Use another git remote. The Where row follows under
its own Hairline, 14px below. The step's submit, "Copy the Vault", is secondary until a remote and
a folder are chosen. While Glose copies, it reads "Copying your Vault…", and the live line "A
large Vault can take a few minutes." with its tick stands beside it at the left. A copy from GitHub
that fails says so in its own words (check the connection, or choose again); the sheet hands focus
back to the button that opened it.

### Typed Code

A code the user types on another site, set like a call-number label at reading size: Paper, 1px
Ink border, 2px corners, 6px 14px padding, Code type (`WDJB-MJHT`). It selects as one unit, and
its accessible name spells it out character by character. It sits in a wrapping row with Copy
code (12px 16px gaps).

### Backup Panel

The third panel in the Settings window, rubric Initial (ChatGPT below it turned lapis to keep the
alternation).
A ledger, not a form; setting up happens in the Backup sheet.

- **Not backed up:** Facts ("Versions: Only on this computer", "Last saved: Today 14:37"), the
  rubric inline warning ("If this computer is lost or breaks, your Vault is lost with it."), then
  Back up to GitHub (primary) and a quiet Use another git remote, 18px below.
- **Backed up:** a sync problem as an in-panel warning notice; Facts ("Backed up to" with
  `github.com/<login>/<repo>` as a link, "Last sync", and "GitHub" with the login and a small
  quiet Disconnect GitHub); then a quiet Stop backing up whose words line up with the fact labels.
- **Stop:** an inline confirm under a Hairline (62ch max): the question, which says where the copy
  stays, then Stop backing up (secondary) and Keep backing up (quiet, focused).

### Call Number (signature)

A typed spine label: Paper, 1px Ink border, 2px corners, Courier Prime 700 12px, no wrapping,
for example `ARE 1958 · p. 79`. A Course lesson adds its week·day after the year (`LIN 2026 1.3`),
so the lessons of one course sort in order; in the Reader its Location is the paragraph
(`LIN 2026 1.3 · ¶ 8`). With a missing year it turns Rubric (border and text), shows a
triangle icon, and ends in `?`; its accessible name says what it is.

### Spine (signature)

A 56 by 136px lapis block with gilt double bands at the top and the call number set vertically
at the foot. It stands beside the current Source and its bibliographic data.

### Reading Start

The first page of a Source that has not started: the Reading Stage's columns, with one panel
(rubric Initial) "Where are you with this book?" ("Hvor er du med denne bog?") in the main column
and the Source's details (lapis Initial) in the side column.

- **Answers:** a Mute 13px hint, then four stacked Choice rows ("I'm reading it now" first) (640px max, 10px gaps, 12px 16px
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
Probe), two for one started with the Probe or a catch-up (Probe, Extraction), three for a book
the user is reading now (Passages, Extraction, Probe; "4 Passages · to p. 87"). An Article or Course
lesson has its own text, so its first step is Read: Read, Extraction, Probe, or Read, Probe,
Extraction. Read's note counts the Passages and the place ("2 Passages · ¶ 8 of 40"). Each step: a Courier
step number, a Label name, a Meta note ("203 words", "0 of 1 point written", "6 questions", or
"with ChatGPT" before a step starts). Current: Lapis Tint with a 3px Gilt underline and
`aria-current`. Done: a 3px Verdigris underline and a Verdigris check.

### Reader (signature: The Critical Edition)

The Read step of an Article or Course lesson, set like a scholarly edition. See Layout for the
band and the three columns.

- **Leaf:** one Paper sheet (44px 56px 56px 88px padding, Hairline border, the lower edge open to
  the Reader Foot; 32px 24px 40px 64px below 900px), 24px below the band. The text is Body for
  reading at 66ch. The 88px left padding is the gutter for the paragraph numbers. The text's own
  title is not repeated under the page head. A quote in the text has a 1px Strong Hairline rule on
  the left (18px padding); a rule in the text is a Hairline; an image Glose did not copy is a Mute
  13px line with a 16px icon. The text carries the `lang` of the text.
- **Paragraph numbers:** each paragraph, list item and quote is a Location and shows "¶ 8" in the
  gutter (the Paragraph number set), set back to the left past list and quote indents so the
  numbers stand in one column.
- **Back:** read again from a later step, the leaf ends in "Back to the step" (secondary, with a
  left arrow) under a Hairline, 48px below the text.

### Passage (signature)

Words the reader marked in the text: a kept selection, on the Passage Rule. A `mark` in Gilt Wash
with 2px corners and a 1px underline at its foot (Gilt at 70% marked, Lapis taken deeper,
Verdigris a Point). It is a button (`role="button"`, `aria-pressed`), named as a Passage that Enter
opens; a click, Enter or Space opens it in the margin. Hover and the open Passage mix the wash with
30% Gilt; the open one also takes the 2px Gilt underline. Focus is the 2px Lapis outline at 1px
offset. 160ms on the shared ease-out. A Passage stays inside one paragraph: a selection that runs
on is cut at the paragraph's end and the Reader Foot says so ("A Passage stays inside one
paragraph, so only the words in ¶ 8 will be marked.").

### Mark Bar

Over a selection in the text, a small Lapis strip, as the Format Bar is on the desk (2px padding,
4px corners, centred on the selection, 8px above it). Two buttons divided by a Lapis Rule: "Mark
Passage" and "Mark and go deeper", each On-Lapis White 600 13px, 30px tall (10px sides, 2px
corners) and ending in its key in a small cap (18px, a 45% white border, 2px corners, Lapis Mist
600 11px): M and D, named in `aria-keyshortcuts`. Hover is half a step to Raised Lapis; focus is a
Gilt outline inside the button. While Glose marks, the first reads "Marking…" and both are off. It
flips under the selection (12px below) when the selection is in the first line after a heading or
less than 64px from the top of the scroll, so it never covers the heading or leaves the view. It
fades in from 4px off in 140ms; under reduced motion it shows at once. It takes no focus from the
text.

### Reader Foot

The foot of the leaf column, under the scrolling leaf: the notice above the Apparatus.

- **Notice:** one line on the Rubric Rule: Rubric Wash, a 1px Rubric Line, a 16px Rubric triangle
  and Ink 13px words (10px 24px 10px 88px, so the words start on the text's edge), with
  `role="status"`. It says why a selection was not marked as chosen (outside the running text, cut
  at the paragraph's end, overlapping a Passage, the AI still working) or that the reader's words
  were not saved, then an "Open it" link button that opens them again. It is empty, and hidden,
  when there is nothing to say.

### Apparatus (signature)

"Passages in view": the Passages in the paragraphs on screen, under the text like an edition's
critical notes. Paper, a Hairline border with a 2px Ink rule on top (10px 24px 12px 88px). The
title is Mute 600 12px, 0.06em tracking, uppercase. Each row (6px, a Hairline above, 14px) is a
grid of the ¶ number (Call set in Lapis 700), the Passage's words in one line cut with an ellipsis,
its state in Mute 13px ("Marked", "Your words", "Taken deeper · Q3", "Understood", "Point made"),
and a small Open (`aria-pressed`). The open Passage's ¶ number takes a 2px Gilt underline. Three
rows show; past that, a "Show 4 more Passages" link button (13px, `aria-expanded`) opens the rest
and "Show fewer" closes them. With no Passage in view, the apparatus is not there.

### Contents

The left column (28px top): "Contents" in the panel-heading set with a lapis Initial over a
Hairline, then the headings (h2 and h3) as rows (8px 0 8px 12px, a Hairline under each, Ink
14px/1.35; an h3 24px in and 13px). A heading that is the text's own title reads "Opening". A
section with Passages ends in a Mute 12px tabular count ("2 Passages"). The section the reader is
in turns 600 and wears a 3px Gilt edge on its left, with `aria-current="location"`, and stays in
view in the list. Hover underlines the name (3px offset). A click scrolls the text to the heading,
smoothly. The foot is Mute 13px tabular: paragraphs and words, then "about 6 minutes to read".
Below 1240px it is the strip in Layout: no title and no foot, the current section with a 2px Gilt
underline.

### Reader Margin

The right column (24px top): one Panel at a time.

- **Reading notes** (rubric Initial): the reader's Free text, written while reading. A Meta hint,
  then a textarea (at least 200px; 15px/1.6, 10px 12px), the Save Line, and under a Hairline a Mute
  13px line that counts the Passages or says how to mark one.
- **The open Passage** (lapis Initial): titled "Passage · ¶ 8", with a 30px close button (a 16px X,
  Mute; hover adds a Strong Hairline and turns it Ink) on the right of the head. Then the Passage's
  words on Gilt Wash (4px, 10px 12px, 15px/1.55) with the call number and the Location under them
  (`LIN 2026 1.3 · ¶ 8`); "Your words" (a field label, a Meta hint that they are kept as a footnote
  under the Passage, a textarea at least 112px) with the Save Line; then the work: "Point made:
  <title>" in 600 with a Verdigris check and a Mute line, or Go deeper (primary, with a D key cap)
  and Make a Point (secondary) under a Meta hint. Make a Point opens a one-field form in place ("The
  Point, as a full sentence", Save the Point and a quiet Cancel). When another Passage's question
  is still open, a Mute 13px line says so with an "Open that Passage" link button.
- **Taken deeper:** the Taken Deeper group under the work, when the Passage has been questioned.
- **Foot:** "Remove the mark", a Mute 13px link button pushed right, alone in the last group. It
  asks first, in place: "Remove the mark and your words on it?" in 600, Remove (secondary) and
  Keep it (quiet).
- **Save Line:** under each textarea, Mute 12px, `role="status"`: "Saving…", then a 14px Verdigris
  check and "Saved". A failed save turns the line Rubric with a triangle, the words "Not saved.
  Glose could not write the file." and a "Try again" link button; the words stay in the field, and
  the Reader Foot keeps the way back to them if the Passage closes.

### Taken Deeper

The Probe on one Passage, in the margin under the open Passage, so the reader is questioned on it
without leaving the text. "Taken deeper" in Lapis 600 12px, 0.06em tracking, uppercase, then the
turns 14px apart in the Probe Transcript's sets (the question at 15px, the user's answer, the
Judgment Gloss 10px under it, taught text under the AI Text mark), and the answer form under a
Hairline (14px above and inside): "Your Reasoning · Q3" and its textarea, "Your answer" and its
field, Send (primary, with its key cap) and the quiet "I don't know, teach me". While the AI works,
a Mute 13px live line with the moving Lapis tick ("The AI reads the Passage…"); when the Passage is
understood, a Verdigris check and that sentence in 13px.

In the Probe, a Passage taken deeper while reading comes back as the user's turn ("You went deeper
on ¶ 8 while reading:") over its words on Gilt Wash (4px, 8px 12px), a link to that paragraph in the
text; its close is a 600 line ("¶ 8 understood."). The Probe of the whole text then starts from the
empty-state lead and a primary "Start the Probe of the whole text", 28px below.

### Done Reading

The way on, at the foot of the text like a colophon: 56px under the last paragraph, a Hairline,
28px, up to 66ch. "Done reading" in the panel-heading set with a rubric Initial, beside a Mute 13px
tabular summary ("6 Passages · 2 taken deeper · 1 Point"). Then "What next?" (600 15px) over two
stacked Choice rows in the Reading Start's form (a 600 label over a Mute hint): "Make Points from
the text" (Extraction first) and "Question me first" (the Probe first). One primary button that
names the step ("Continue to Extraction", "Start the Probe", with a right arrow), 18px below. A
failed step shows an error notice above the button.

### Lesson Nav

The page head's actions on a Course lesson: the lesson before as a quiet button with a left arrow
and the lesson after as a secondary button with a right arrow, each named by its week and day
("Week 1 · Day 3"; screen readers hear "Next lesson: Week 1 · Day 3") with the lesson's title as its
tooltip. 8px apart; it wraps. The first lesson has only the next; the last only the one before.

### Passages (signature: Edition with a Desk)

A book's Passages page (`/sources/<Source>` at the Passages step, or `?passages=1` from any step),
set like the Reader because the user's Passages are the only text of the book Glose holds. Jan
chose it on the impeccable decision page as the join of "The Book's Own Edition" and "The Slip
Drawer".

- **Frame:** the Reader's band (Step Bar, then the keys "Ctrl+Enter keeps · X chooses · W writes a
  Note" in Mute 13px) and its three columns: Pages, the leaf column and the margin.
- **Pages:** the Contents set (lapis Initial, "Pages"), one row per band of 20 pages ("pp. 40–59")
  with its tabular count; Passages without a page number last. A row is a button that scrolls the
  leaf to its first Passage and takes the Gilt "here" edge. Under the rows, an "Unused only"
  checkbox in Mute 13px.
- **Leaf:** the Reader's Paper leaf with its 88px gutter. Each Passage: its Location in the gutter
  (Call set, Lapis 700), a small checkbox just left of the words, the words at 17px/1.7 as a
  Passage mark (Gilt Wash, 1px Gilt underline at 70%; Verdigris once a Note cites it; the 2px Gilt
  underline while chosen), the user's words on it in Mute 14px, and what it became in 600 13px:
  a Verdigris check and "In 1 Note:" with the Notes as Verdigris links, or "On the desk · [1]" in
  Accent. A Passage without a Location adds a Rubric triangle and "No page: cannot be cited" in Ink.
  Edit and Delete (quiet, small) show on hover and focus; Delete is off while a Note cites it.
  Each Passage is focusable; X chooses it, W opens the desk.
- **Chosen line:** while Passages are chosen, a Tint strip over the capture line says "from 2
  Passages, in your words" beside Write a Note (primary, small, with its W key cap).
- **Capture line:** the leaf column's foot, as the Apparatus is in the Reader: Paper, a Hairline
  border with a 2px Ink rule on top. "Next Passage" in the apparatus title set, then a grid: the
  page (76px, Courier 700, right-aligned; under it Mute 11px "as before" or "Last time: p. 87"),
  the words box (15px/1.5, 56–160px), Keep (primary, with its key cap), and under them the user's
  words as a borderless line field and a Mute 12px status line (draft saved, the paste offers, the
  same-words warning with a Rubric triangle).
- **Margin:** the Reader's reading notes panel, titled Free text, ending in "Write Notes as you go.
  When you finish the book, Extraction starts with the Passages you have not used."
- **Desk:** W folds Pages into a 40px vertical strip ("PAGES", Mute 600 12px) and the margin opens
  into a panel at least 520px wide (lapis Initial, "Write a Note", Meta "from 2 Passages, in your
  words"). In it: the chosen Passages numbered on Gilt Wash (Courier [1] and Location in Lapis), the
  title as the borderless title field, "In your words" over a blank 16px/1.65 field at least 200px
  tall, the Note's page, and the word count; beside them (under them when the panel is under 600px,
  a container query) "Ask the AI for a draft", or the AI's draft under the AI Text mark ("¶ AI
  paragraph · not in your Note yet") with "Take it in". Taken in, the field wears the AI Text mark
  until "I rewrote it". Under a Hairline, Find Links and the proposed Links (as in Extraction); under
  another, Save Note (primary) and Cancel (quiet), which asks "Discard what you wrote?" first.
- **Below 1240px** the desk takes half the row and the strip goes; **below 900px** one column, as
  the Reader.

### Watch (signature: The Cue Sheet)

The Watch step of a Video (at `/sources/<id>` while it is the step, with `?watch=1` or `?t=<s>`
from a later step): the video as a plate, its timestamps under it like a film's cue sheet, and the
watch notes in the margin. Mode: Operate while watching, Read when going back.

- **Layout:** the Page head (title; the speaker, the channel or event after a Mute "·", the call
  number; "Open on YouTube" as a quiet action with an external-link icon, at the second the video
  is at). Under it the Reader's Ground band: the Step Bar (Watch · Extraction · Probe; Watch's note
  counts timestamps and words) and a Mute 13px line that names the keys ("Ctrl+Enter stamps the
  time · Ctrl+Shift+Enter plays or pauses · Alt+Enter plays from the timestamp before the
  cursor", ⌘ on a Mac). Then two columns, `up to 880px |
  320–400px`, 32px apart, centred, 32px at the sides, each scrolling on its own (24px top). Below
  1080px they stack, the notes under the cues, and the page scrolls as one.
- **Plate:** a Paper sheet with a Hairline border and 12px padding around a 16:9 frame (2px
  corners) that holds YouTube's player. Until the player is ready the frame is Tray with a Mute
  13px "Loading the video" in its middle. When the video cannot play (no internet, the owner
  refuses other sites, a removed video), the frame says why in Ink 14px under a 20px Rubric
  triangle, with "Open on YouTube" (secondary) under it.
- **Cues:** 28px under the plate, "Timestamps" in the panel-heading set with a lapis Initial over
  a Hairline, then one row per timestamp in the order of the video: a button (8px 0 8px 12px, a
  Hairline under it) of the time in the Call set in Lapis 700 (72px column) and the words after it
  in Ink 14px, one line, cut with an ellipsis; a stamp with no words yet says "no words yet" in
  Mute italic. The moment the video is at turns 600 and wears the 3px Gilt edge, with
  `aria-current="time"`. Hover underlines the words; a click plays from there. Empty, one Mute
  13px line says how to stamp.
- **Done watching:** the Done Reading colophon, 48px under the cues: the title with a rubric
  Initial beside a Mute tabular count ("4 timestamps · 130 words"), a Mute 14px line on what
  Extraction does with the times, and one primary "Continue to Extraction" (or "Skip to
  Extraction" with no notes) with a right arrow. From a later step it is "Back to the step".
- **Watch notes:** the margin Panel (rubric Initial, the word count as meta): a Meta hint that
  they are the Free text, then the notes field: a CodeMirror field in the Input's dress (Strong
  Hairline, 4px, Paper, 15px/1.6, 10px 12px; focus is the Lapis border and halo) that fits the
  window and scrolls inside, so the Stamp button stays in view. A timestamp in it is drawn as its
  time: Courier 700 12px Lapis on Lapis Tint, 2px corners, one unit for the cursor; hover
  underlines it; a click plays from there. The Save Line follows. Under a Hairline: the Stamp
  button (secondary, "Stamp 12:34" with the live time and a Ctrl+↵ key cap; off until the player is
  ready) and a Meta hint on how to play from a timestamp (a click, or Alt+Enter after it).
- **Elsewhere:** a Note with a timestamp shows it on its call number (`SIN 2009 · 4:10`) and, in
  the Graph's side panel, a 13px Lapis link with a 14px play icon, "Watch from 4:10". On a later
  step the Free text panel is the watch notes without the player; a timestamp there opens the
  Watch view at its time.

### Kind Choice

The first question on Add Source: four joined segments in one Paper box with a Strong Hairline
border and dividers (4px, 40px tall, 0 18px): Book, Article, Course lessons, Video, each name 600
14px.
The question "What are you adding?" is the group's accessible name, not shown. Under it, 8px down,
one Mute 14px line says what Glose does with the checked kind ("You read it elsewhere. Glose keeps
your Free text and Notes."), and the group names it as its description. Hover fills a segment
Lapis Tint; checked fills it Lapis Tint, turns the name Lapis and adds a 3px Gilt underline inside
its foot; keyboard focus draws the 2px Lapis outline inside. 160ms on the shared ease-out. The
segments wrap in a narrow window. The kind lives in the address (`?kind=article|lesson|video`;
Book is the default). While any kind saves, the choice is locked, so one save cannot meet another.

### Catalog Results

The Open Library records under the book search, as one joined list in a Hairline box (4px): a row
per record (10px 12px, 14px), the call number in its own column, then the title in 600 and author,
first publication and edition in Mute 13px, which wrap under the title. Hover fills it Lapis Tint;
the chosen record keeps the Tint and a 1px Lapis outline inside. Once a record is chosen, the list
folds to that row and a link button under it, "Show all 7 results"; a new search opens it again.

### Drop Zone

Where a file or a folder is chosen or dropped: a Ground box with a Strong Hairline border (4px, 22px
20px, 10px gaps). A wrapping row of buttons (10px gaps): for an Article, "Choose a Markdown file"
(primary, with a file icon) and a quiet "Paste the text instead"; for Course lessons, "Choose the
course folder" (primary, with a folder icon) and a quiet "Choose lesson files". Under them a
Mute 13px hint says what happens to the files. While a file is dragged over it, the border turns
Lapis and the fill Lapis Tint (160ms). A chosen file replaces it with a row: a 24px Lapis file
icon, the name in 600 (it wraps anywhere) over Mute 13px tabular counts ("12 paragraphs · 2,300
words"), and "Choose another"; read lesson files give the same row with a folder icon, the folder's
name over the count, and "Choose other files". Pasting opens a 220px textarea (14px) in its place,
with "Use this text" (primary) and a quiet "Choose a file instead". The cursor follows: into the
textarea, onto "Choose another", back onto the choose button.

### Lesson Table

On Add Source for Course lessons, the files read from the folder, across "The course" panel (rubric
Initial) under the course data, just above the foot, set like the register's table: 14px tabular,
cells 6px 12px (20px at the panel edges), a Hairline under each, Mute 600 13px heads, Words aligned
right. Columns: "Week · Day" as a 64px field in Courier Prime 700 ("1.3"), the title as a field
(at least 14em) with its file name in Mute 12px under it (its folder path when two files share a
name, chosen or dropped; the fields' accessible names use the same path), words, and the state (empty while a
lesson is new). Fields in the table
are 5px 8px at 14px.

- **State marks:** a 15px icon and Mute 13px words, in a fixed cell (empty while new): a Mute
  circle-alert and "Already in your Vault"; a Verdigris check and "Added"; a Rubric circle-alert and
  "Not added" in Rubric; a lesson whose Source file name is taken says, in Rubric, "A Source has
  this file name. Change the title.", its title field points to it, the cursor goes to the first
  such title, and the lesson waits out of the retry while the file name it would get, by the
  server's own rule, is still the one that was taken (its title, week·day, or the course's family
  name or year must change it). A failed Add puts the cursor on what blocks this attempt, never on
  a lesson that waits. The State column keeps a 13em width, so
  a long message never moves the title field.
- **Locked rows:** an added lesson reads as text: its fields lose border and fill and turn Mute, so
  the row cannot be edited and does not look like a form.
- **Clash:** two lessons with the same week and day turn their Week · Day fields Rubric, and at once
  a Rubric line with its icon under the table names the clashing parts (a malformed one too); the
  fields point to it.
- **Lessons a week:** only when a file's name gives no week and day, one line under the table: the
  label, a 72px field and its Mute hint, 12px apart. A value that is not a whole number turns the
  hint into its Rubric error ("Enter a whole number of 1 or more.") and changes nothing; Add
  stops there with the cursor in that field while a lesson takes its week·day from it.
- The course data comes first in the panel, under the chosen row, with its own Fill Line: the
  course name, then "Teacher or provider" (600 14px) over the family and given name, then year and
  address. A course name taken from the folder says so ("From the folder name"); a year Glose
  could not read is this year, unmarked, with the hint "This year, as a guess. Change it for an
  older course." Once a lesson is added, the course data and "Choose other files" lock, so a
  retry cannot split the course or drop the result. When adding ends, the cursor goes to "Open
  the course", or to the retry button when a lesson was not added. While the lessons are added, every control in the panel is locked, Cancel and the done
  links too;
  the status counts from 1 ("Adding lesson 1 of 20…"), and the summary counts every added lesson,
  retries included. The Panel
  Foot: "Add 20 lessons" (primary; "Adding lesson 3 of 20…" while it works), then "Open the course" (the
  Course Shelf) and "See them in Sources" when done.

### Course Shelf (signature)

The page of one Course (`/courses/<course name>`, the chosen day as `?day=3.3`): each week a shelf
of day spines, and the chosen day's leaf beside it. Mode: Operate.

- **Layout:** the Page head (the course name; then a Lapis 600 "Sources" link back, the teacher,
  the course's Call Number and a Mute count "13 days in · 0 read"; when a day other than the next
  is chosen, "Add Week 3 · Day 4" as the primary action). Under it two columns, `1fr | 340–420px`,
  20px apart; below 1080px the leaf goes under the shelf.
- **The weeks:** a Panel (rubric Initial, Meta "3 weeks · 5 days a week") with a Mute 13px hint,
  then one row per week: an 88px label (the week in 600, "3 of 5" in Mute 13px tabular) and the
  shelf, a row of days 14px apart standing on a 3px Strong Hairline board. A Hairline divides the
  weeks. A week holds five days, or more when a lesson has a higher day; the weeks run to the next
  day to add.
- **Day spine:** a 44 by 120px button, 2px corners. An added day is Lapis with a gilt double band
  at its head and its call number on a Paper label set vertically (Courier Prime 700 12px); a
  read day is Raised Lapis and its name ends ", read". A day not added is a dashed Strong
  Hairline outline with a Mute 20px plus; the next day to add has a 2px Lapis outline on Lapis Tint
  and a Lapis plus. Hover lifts a spine 3px (160ms, none with reduced motion); a file dragged over
  an empty day gives it the next day's look. The chosen day has a 3px Gilt bar 7px under it and
  `aria-current`. Under each added spine two 14px marks, a text and a video icon, Lapis when the
  day has that piece and Strong Hairline when not; under every spine "Day 3" in Mute 12px (Ink 700
  when chosen).
- **Drop on a day:** a Markdown file dropped on an empty spine chooses that day and fills its
  text. Any other file chooses the day and says in the leaf that the shelf takes the .md file and
  the video file goes under The video.
- **Unplaced lessons:** lessons with no week and day, or a second lesson on one day, list under a
  Hairline as Lapis links ("Lessons without a week and day").

### Career Line (signature: a Person's page)

The page of one Person (`/people/<Person>`, the chosen work as `?work=<Source>`). Mode: Operate.
The rail lights Graph.

- **Layout:** the Page head (the name; then a Lapis 600 "Graph" link back, "Person", the life
  years and a Mute count "2 Sources · 10 Notes · 1 Person"; "Edit in the Graph" and the primary
  "Add a Source"). Under it the working columns: main, and a 300–380px side column.
- **Works and talks:** a Panel (Accent Initial, Meta "by year of first publication"). Each work is a
  button over its year: Call Number with its Reading marks beside it, title (600 14px) and a Mute
  13px line ("Book · 9 Notes"), centred, or aligned to the end near either end of the line. Works too close for one row
  stack upward in rows 78px apart. The rule is a Strong Hairline with a 11px dot per work: Lapis
  for a book or text, hollow (2px Accent on Paper) for a talk; the years are Courier Prime 12px
  Mute under 5px ticks. The chosen work has `aria-pressed`, a Gilt underline under its Call
  Number, its title in Accent, and a Gilt ring around its dot (Paper 2px, Gilt 2px). Hover is
  Lapis Tint.
- **Lanes:** one per linked Person under the rule: their name (600 13px) and call numbers (Courier
  Prime 12px Mute), over a Hairline track. A 13px Accent ring sits where their Links meet a work,
  with the words in Accent 600 13px on Paper ("Flow · 17 Links"); with none, Mute "no shared Links
  yet". A legend under a Hairline names the marks shown.
- **From <work>:** a Panel (rubric Initial, Meta "Open the Source" in Accent 600) of the work's
  Notes: title (with the AI ring when it holds AI text), Growth in Mute 13px, and the Call Number
  with the Location when the Note has one, divided by Hairlines.
- **Side column:** In your words (the body as Note text, AI text marked), People (each name in
  Accent 600 and the sentence that links them in Mute 13px), and the Properties table straight in
  the column.
- **On the Graph:** a Person is a Lapis medallion (a Paper ring at 58% of the radius), between a
  Note and a Source in size, its name always shown. With AI text it is the hollow Rubric ring with
  a Rubric medallion ring inside, so it still reads as a Person. A Source whose author has no Person shows,
  under a Hairline, a Mute 13px line and "Make a Person note for <name>" (secondary button with a
  person icon).

### Day Leaf

The Panel beside the shelf for the chosen day, headed by the day ("Week 3 · Day 3", lapis Initial).

- **A day not added** (Meta "Not added yet"): a Mute hint that teacher, year and course address
  come from the course; a status line for what just happened ("Week 3 · Day 3 is added.", or why a
  file moved the leaf to another day); "The text" (600 15px) over a Drop Zone ("Choose the Markdown
  file", primary with a file icon, and a quiet "Paste the text instead"), which turns into the
  chosen-file row (name, "10 paragraphs · 267 words", "Choose another") and the required Title
  field. Under a Hairline, "The video" with "optional": the Video address field (Glose adds
  `https://` when it is missing) and the Video file row (a Lapis film icon, the file name or "No
  file" in Mute, "Choose a video file" small, "Remove the file" quiet) with its hint. The Panel
  Foot: "Add Week 3 · Day 3" (primary) and "Add, then Week 3 · Day 4" (secondary), the status
  counting the copy of a video file ("Copying the video file… 40%").
- **An added day** (Meta its Call Number): the title as an Ink 700 16px link, the Reading marks
  and the step, and a primary "Read the day" ("Continue" once started) with a right arrow. Under a
  Hairline, "The video" with "Change the video" (small) at the right; under it the saved file in a
  Paper plate (8px, Hairline, a 16:9 native player) and "Open the video" (secondary, external-link
  icon), or Mute "No video yet." "Change the video" opens the same fields with "Save the video" and
  a quiet Cancel, the cursor in the address.

### Courses

On Sources, a Panel "Courses" (lapis Initial, Meta "1 course") between the desk and the register,
only when a course exists: each course as the 56px Spine (course call number), its name as an Ink
700 16px link, the teacher, a Mute line "13 days · 0 read · next: Week 3 · Day 4" and a small
"Open the course". A lesson's page head links its course name (Lapis 600) to the course at its day.

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

### Properties

Every frontmatter field of the Note or Source open in the Graph's side panel, as Obsidian shows
them. It sits under the title and the Source line, above the Note's buttons.

- **Box:** a Hairline box (4px) that folds. The summary "Properties" in 600 13px with a 16px Mute
  chevron that turns -90° when folded (160ms), Lapis on hover; a Hairline under it while open.
- **Rows:** a grid of the name column (at least 88px, 36%) and the value, 36px tall at least, a
  Hairline under each. The name in Mute 13px after a 15px Mute Lucide icon for its type: align-left
  text, list, hash number, square-check yes or no, calendar date, braces for a value Glose cannot
  show, sprout for `growth`, lock for a field Glose keeps and link for `source`.
- **Values:** 14px Ink with tabular numerals, set as fields that read as text: no border at rest,
  Lapis Tint on hover, and on focus Paper with the Lapis border and the focus halo. They line up
  with the text of the locked values. Text wraps and grows with its words. Dates use the native
  date field, numbers the native number field, yes or no a 16px Lapis checkbox. `growth` is a
  compact Select (13px, 2px 28px 2px 8px). `source` is a Lapis 600 link with a 1px underline at
  3px offset. A value Glose cannot show is Mute 13px.
- **Lists:** each item a token, Strong Hairline 1px, 3px corners, 13px/22px, with a 12px × at its
  end; after them a borderless "Add…" field that suggests the Vault's items for that name.
- **Remove:** a 26px Mute × at the row's right end, shown on row hover or focus; Lapis Tint on
  hover.
- **Add property:** a full-width quiet row (Mute 600 13px, 15px plus icon, Ink on hover). Open, a
  form 12px 10px: Name and Type side by side (Text Field and Select at 14px), then Value, with
  "Separate the items with commas." under a list; the field error line under them, and a small
  secondary Add and a quiet small Cancel. Escape closes it and focus returns to Add property.
- **Error:** a failed save puts the field error line under the box: "Glose could not save
  “tags”. The file is as it was. Try again."

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

### Code Block

Fenced code in a Note, wherever Note text shows (the Graph's side panel, the Rewrite Desk, the
Graph beside the Writing Desk, Make Cards).

- **Box:** Ground, a Hairline border, 4px corners; the code 14px 14px 12px in, Fira Code 400
  12.5px/1.6 with its ligatures, tab size 4. Long lines scroll sideways inside the box; the box is
  a focusable region named "Python code" ("Python-kode"), so the keyboard can scroll it.
- **Colors:** only the theme's pigments. Keywords, types and tags Accent; strings Verdigris;
  comments Mute; function names and decorators 600 Ink; the rest Ink. The grammar is Shiki's; the
  code shows plain at once and takes its colors when its language has loaded.
- **Tab:** on the box's top edge, 10px from the right, half Paper and half Ground so it sits on the
  line like a label: the language's name (Mute 600 11px, 0.06em, uppercase) and a 24px Copy button
  (Paper, Strong Hairline, 4px, 15px Lucide copy icon). Copy shows on hover of the box and on
  focus; after a copy it shows a Verdigris check for 2s. Without a language only Copy shows.
- **Space:** 18px above the box, so the tab clears the text or the AI gloss above it.
- **Inline code:** Fira Code 0.86em on Ground, Hairline border, 2px corners, 1px 4px padding.

### AI Mark on the Graph (signature: Unwritten Ring)

The AI Text mark carried onto the Graph canvas, where a node has no room for a gloss.

- **Node:** a Note with AI text (or only an AI title) is drawn hollow: Rubric Wash inside a Rubric
  ring, 1.75px at rest and 2.5px while it is the hovered or selected node, never more than 60% of the
  radius,
  laid inside the node so it keeps its size. Every other node keeps its fill (Mute, Lapis when lit).
  Faded nodes fade the ring with them; the selected node's Gilt ring sits outside it as usual.
- **Key:** at the stage's foot right (12px in), a toggle set like the desk bar's Graph toggle:
  Paper, Strong Hairline, 4px, 600 13px, 36px tall, a 10px drawn ring (1.75px Rubric round Rubric
  Wash)
  before "9 Notes hold AI text". Hover fills Lapis Tint; pressed, Lapis Tint with a Lapis border and
  label, `aria-pressed`. Pressed, every node without AI text fades as Find fades non-matches (a
  match stays at 60% or more while another node is hovered or selected), and
  their labels follow Find's rule (names show while 40 or fewer nodes match). Find and the key
  narrow together: Find's count and Enter use the Notes that pass both. The key's accessible name
  adds its action ("…, Show only the Notes with AI text"), and its cell is a status, so the count
  and the done line are heard when they change. With no AI text left the key is a Mute 13px line
  on a 90% Ground band with a 15px Verdigris check: "Every Note is in your words". Labels keep
  clear of it.
- **To rewrite:** with no node selected, the side panel's first panel (rubric Initial, the count as
  Meta): a Mute 13px line that names the ring and says double-click opens one, then every Note with
  AI text as a row of Call Number
  and title link, ordered by Source then title. The Sources panel follows with a lapis Initial. With
  none left the panel goes and Sources takes the rubric Initial again.
- **Links:** in the side panel's Links list, a Note with AI text ends in a 9px ring 8px after its
  name; screen readers hear "(holds AI text)".
- **Beside the desk:** the Graph Beside the Desk legend gains "AI text" with the ring while the
  Graph holds any.
- The canvas's accessible name adds the count: "9 Notes hold AI text."

### Rewrite Desk (signature)

A Note opened over the Graph's canvas to edit, with the AI's words beside the user's, like a gloss
in the margin of a page. The side panel stays beside it and keeps reading other nodes; for the Note
on the desk it shows only the title, the Source and the Links.

- **Way in:** in the Note panel's button row, under the title and Source and above the text (18px
  under it), "Rewrite in your words" (primary) while the Note holds AI text, else "Edit"
  (secondary), before Make Cards. Double-clicking a Note on the canvas, or Enter on the canvas with
  a Note selected, opens the desk too; closing it then returns focus to the canvas.
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

### New Note Leaf (signature: The Commonplace Leaf)

A new Note written from blank, set like a commonplace book: the user's entry on top, the quoted
authorities numbered under it. The leaf lies over the left of the Graph's canvas, so the Graph
stays in view beside it.

- **Way in:** New Note (primary, with its N key cap) after Find in the Graph's page head; N on the
  canvas opens it too. An empty Graph's page head has New Note as well. Closing it returns focus to the button.
- **Leaf:** a panel over the canvas cell's left, `min(720px, 64%)` wide, 16px from the cell's
  edges, its own scroll; the canvas is not inert. Lapis Initial, "New Note", Meta "A Note in your
  Graph, in your words". The zoom controls move to the canvas's top right while it is open.
- **Top (18px 28px 0):** the title as the borderless 21px title field (it grows to its
  placeholder, so long Danish words wrap). Under it "Rests on" (Mute 600 13px), the kept page's
  Call Number, and a select of the kept pages with "No Source yet" last. Without a kept page:
  a Rubric triangle and "No Source yet" (600 13px) and a Mute hint.
- **Text (20px 28px 24px):** "In your words" label and a 16px/1.65 field, at least 200px, growing
  with its text.
- **Kept quotes:** Hairline above (14px 28px 16px), Mute 600 13px head with the count. Each row:
  a 28px typed number tab (Strong Hairline, 2px corners, Lapis 700 12px Courier) that cites the
  quote where the cursor was; the quote in curly quotes with a Mute 13px "page title · ¶ 8"; at
  the right a Verdigris check with "Word for word", or "Cites quote 1" once the text cites it
  (the tab's border turns Lapis). Without kept pages, a Mute hint says how quotes arrive.
- **Links:** the same band, a checkbox per Note the AI proposed, its name 600 and its reason Mute
  13px under it.
- **Foot:** sticky, as the rewrite desk's: Save Note (primary), Cancel (quiet), and pushed right a
  Mute tabular line "1 kept page becomes a Source when you save." Cancel with words becomes the
  rewrite desk's inline "Discard what you wrote?". Errors stand in a field error line across the
  foot.
- **On the canvas:** the new Note is a Paper node in a dashed Lapis ring, with the Gilt selected
  ring, labelled with its title (or "New Note"). Dashed lines run edge to edge to the Notes the AI
  proposed: Lapis when checked, Strong Hairline when not. The canvas frames the new Note and those
  Notes in the part of the cell the leaf leaves free.
- **Below 1080px** the leaf takes the canvas's place in the flow, as the rewrite desk does.

### Research (side panel)

The side panel while the New Note Leaf is open: Rubric Initial, "Research", Meta "with the AI".

- **Before a Session:** a Mute hint, then "Ask the AI to" with four Start Choice rows (600 label,
  Mute hint under it): Learn this, Back my idea, Check this claim, Bridge two Notes. Bridge adds
  two Note fields that complete from the Graph. "Your question" field with a hint, then Find
  sources (primary). Without ChatGPT, the Needs-ChatGPT notice instead of the form.
- **With a Session:** the Session transcript (the user's ask as a Ground box: "You asked: Check
  this claim" and the question), the tool trail ("Searched the web · read 2 web pages · searched
  your Graph"), the found pages, the AI's few sentences; a folded "Search again" with the same
  form; the message box, its placeholder "Ask about these pages, or paste a page's address".
- **Found page slip:** Paper, Hairline, 4px corners, 10px 12px 12px. Head: the Call Number the
  page would get, then the title (600 15px) as a link out with a small external icon. A Mute 13px
  line: author · site · year · kind. One quote beside a 2px Strong Hairline rule with its Lapis
  Courier ¶; "and 1 more quote from this page" and the AI's why in Mute 13px. Foot: the stance
  (600 13px) and, pushed right, Keep (small secondary) and Drop (small quiet). Kept: a 3px
  Verdigris left edge and a Verdigris check "Kept" with Remove. Dropped: Mute, quote and why
  folded, "Keep after all". A page that is a Source already shows a Verdigris "You have this
  Source".
- **Web search off:** an info Notice in the transcript says so and asks for a page's address.

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
- **Choice options:** under a choice question, "Choose one" or "Choose all that apply" in Mute
  13px, then the options 8px apart as Choice rows (Strong Hairline, 4px, 9px 14px, Paper, Body
  400 15px): a native radio or checkbox, the letter in a small typed tab (Strong Hairline, 2px
  corners, Lapis 700 12px, 22px), the option. Checked turns the row Lapis with Lapis Tint; focus
  is the 2px Lapis outline around the row. Answered, the inputs go: the right options end in a
  Verdigris check with "Right answer" (600 13px), the user's choice keeps the Ground of their turns
  and ends in "Your choice · right" (check) or "Your choice · not right" (Rubric triangle, Rubric
  words) with "Tests: …" in Mute 13px under it.
- **Hint:** the AI Text mark for paragraphs (2px Rubric rule, ¶ gloss "Hint · Q6"), after a Mute
  13px italic line "You asked for a hint."
- **Topics planned:** one Mute 13px line, the label in the Part set, the topics joined by " · ".
- **Judged again:** a Mute 600 13px line where it happened ("The AI judged Q2 again.") with the
  gloss beside it headed "Judged again"; the answer keeps its first gloss.
- **The user's message** names the question it is about: "You · Q6".

### Judgment Gloss (signature)

The AI's judgment of one answer, in the margin beside it: the Reasoning and the result judged
apart. A note with a 1px Strong Hairline on its left (16px padding), headed "Judged" in Lapis 600
12px, 0.06em tracking, uppercase, then two verdicts 10px apart. Each verdict is a 16px icon and a
600 14px/1.45 name ("Reasoning: sound", "Result: partly right") over the reason in Mute 13px.
Sound and right take a Verdigris check; partly sound, flawed, partly right and wrong take a
Rubric triangle and a Rubric name; no Reasoning takes a Mute dash. A right guess, or a right
choice with no Reasoning, adds a third verdict with a Mute dash: "Right, not confirmed yet" and why
("You were guessing, so it is not counted as known yet."). Under the verdicts, "Question
this judgment" (a 13px 600 link button) turns the answer box to a message about that judgment. The words of the Reasoning the
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
- **How sure** sits under the Reasoning: "How sure are you? (optional)" in 600 13px, then three
  28px segments (Strong Hairline, 4px, 600 13px): Sure, Not sure, Guessing. The checked one turns
  Lapis on Lapis Tint; choosing it again clears it.
- **Choice question:** the right column shows "Your choice" and the letters read back in 600
  ("A, C"), or a Mute "Choose an option in the question above."; Send stays off until one is
  checked. The Reasoning's placeholder asks "why this one?".
- **Help:** "Give me a hint" and "I don't know, teach me" are quiet buttons (30px) stacked under
  Send, their words on the column's edge.
- **Talk:** "Write to the AI instead", a 13px 600 link button at the right of the Reasoning label,
  turns the box to "Message to the AI · about Q6" with a hint and one textarea, and "Back to your
  answer" in the same place; at the right the plan line, then Send level with the textarea's foot. Both drafts are kept, and the cursor moves with the switch. With
  no open question the box is the message box, with "Ask for the next question". While talking,
  the options above are off. While the Probe waits for the whole text (after Go deeper), the box
  shows only when "Question this judgment" opens it, with "Close the message" in place of "Back to
  your answer".
- A send that fails shows an error notice under the answer field. The box goes when the Probe is
  finished.

### What the Probe Found

The close of the transcript, 40px below the last turn, on the same leaf (up to 1016px, centred).
The heading is a panel heading with a rubric Initial over the flourish rule. Then the topics by
state, each in the verdict set: Known and Known after help with a Verdigris check; Taught, not
confirmed yet and Still open with a Rubric triangle; Asked, no answer yet and Not asked yet with a
Mute dash; Right, not confirmed yet (a guess, or a choice with no Reasoning) takes a Mute dash
too. The
topics follow in Mute 13px, joined by " · ". A Meta line says where the record is kept ("The
Probe is kept in Probes/<Source>.md in your Vault."), then the way on: a primary button
("Continue to Extraction", or "Done: <title> is read") with a Mute status beside it. An empty
Probe says "The Probe ended before any answer."

The tally in the band above says the same in one Mute 13px line with tabular numerals ("2 known ·
1 known after help · 1 taught, not confirmed yet"; with a plan it opens "3 of 6 topics asked"),
with `role="status"`. Before the first question, the leaf holds a 680px start: the empty-state lead line, a Mute body that follows the
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

One Paper leaf in the middle (44px 56px 64px padding, Hairline border, lower edge open), each
Reference's gloss in the right margin beside its line, and the AI review's flags in the left.

- **Bar:** two groups that wrap as wholes. The first: "Writing projects /" in Mute 600 13px, the
  title in 600 15px (it wraps; never cut), the Settings Slip chip. The second, pushed right: the
  save state in Mute 13px, Write | Preview as a Segmented control, then the Graph toggle (from a 1200px window; see Graph
  Beside the Desk), then in Write "Cite a Note"
  (secondary with a Key Cap, ⌘K or Ctrl+K) and "Ask the AI to check" (quiet); in Preview the post's
  path in Courier 12px Mute and "Write to site" (primary; "Choose your site" until a site folder is
  set). When the two do not fit on one row, the second drops under the first as one row. A
  one-line note under the bar reports the AI review or the Publication.
- **Leaf:** the title as a borderless 700 30px field over a Strong Hairline (Lapis on focus,
  Rubric with the field error when taken), a meta line in Mute 13px with the type, words and
  References on the left and the format keys on the right ("Format: ⌘B bold · ⌘I italic · ⌥⌘2
  heading"; Ctrl+B, Ctrl+I, Ctrl+Shift+2 off the Mac), then the prose in CodeMirror in the Prose in
  Write set (16px/1.65 Public Sans unless Settings → Text says otherwise) with no chrome; Gilt Wash selection, Lapis caret, spellcheck on, `lang` from the piece.
- **Formatting in Write:** the text shows as it will read. `## ` is a heading (700 22px/1.3, 18px
  above), `### ` a subheading (700 18px), `**bold**` 700, `*italic*` italic; one parser serves
  Write and Preview. The marks are hidden and come back in Strong Hairline grey on the line or span
  the caret is in. ⌘B and ⌘I work on the words chosen, not on
  the marks: the style comes on, or off when every chosen word has it, only for those words, and
  Glose writes the marks again so other styles stay whole (`**one** two **three**` after taking
  bold off "two"). Each paragraph is styled apart, and a heading's `##` stays outside. Keys: ⌘B, ⌘I, ⌥⌘2, ⌥⌘3 and ⌥⌘0 for plain text (Ctrl+B, Ctrl+I, Ctrl+Shift+2,
  3, 0 off the Mac, since Ctrl+Alt is AltGr on Danish keyboards). Making a line a heading sets
  blank lines around it.
- **Format Bar:** over a selection, a small Lapis strip (2px padding, 4px corners): H2, H3, Bold,
  Italic as 28px icon buttons in Lapis Mist, a Lapis Rule, then "Cite" in On-Lapis White. Hover is
  half a step to Raised Lapis; a style the selection has is Raised Lapis with a 2px Gilt
  underline (gilt marks "here"). It sits 4px off the selection and stays inside the text column:
  above when the gap to the text line above (as wrapped on screen) has room and the desk bar does
  not cover it, else under when the gap below has room, else above. Each button names its key in
  its tooltip and `aria-keyshortcuts`. ⌘K cites from anywhere on the desk in Write.
- **References in the text:** a Reference is its number, raised, Courier 700 12px Lapis (Rubric
  when a check flags it); it is one atom, deleted whole. Two side by side read "⁶,⁷". A space typed
  before it is not shown in Write nor printed in Preview or the post. A click on the number, or ⌘K
  with the caret just before it, opens the Cite Slip to change or remove it; ⌘K just after it
  cites anew. A new
  Reference sets against the word before it ("obvious⁶"), after end punctuation ("word.⁶").
- **Right margin (glosses):** per Reference, beside its line: a Hairline above (Lapis while its
  Cite Slip is open), the number in Courier, the Note title in Ink 600 as a button that opens the
  Cite Slip, and under it one wrapping row: the Call Number with the page, then any problem in
  Rubric 600 13px with its triangle ("No page"), then the fix as a link button ("Add the page"
  opens the Cite Slip on its Page field; "Choose a Note", "Open the Source", "Show the Note").
  Glosses never overlap; a later one moves down 12px past the one above.
- **Left margin (the AI's flags):** after an AI review only: right-aligned beside the line, "No
  Reference" in Rubric uppercase 12px with a triangle, the reason in Mute, and "Find a Note"; and
  Notes for a passage under the AI Text mark (a 2px Rubric rule on the margin side and a ¶ gloss),
  each with "Cite".
- **Widths:** measured on the desk, not the window (the desk watches its own width, so the Graph
  beside the desk folds the margins too), against the leaf's real width: 680px for Standard at
  16px, wider for a larger or wider text (the line is set in em, plus 112px of padding). From 424px
  more than the leaf (1104px of desk at 680) the five tracks hold both margins. From 184px more
  (864px at 680) the leaf keeps the glosses beside it (200 to 260px) and the AI's flags fold under
  the leaf. Below that both margins fold under the leaf, which keeps its measure (the line plus
  64px). The desk writes its choice as `data-fold`, and the glosses' placement reads the CSS's
  choice, so the two never disagree. In Preview the leaf keeps 680px.
- **Focus:** "Focus" (a Maximize icon and its key cap, ⇧⌘F or Ctrl+Shift+F, hidden below a
  1400px window as the Graph's is) sits before Pencil in Write. In Focus the rail, the status bar,
  the desk bar, the line under it and both margins step aside, the Pencil's marks go quiet, and the
  leaf lies on the Ground with no border at its chosen width, 56px from the top; its meta line
  keeps its place, unseen. Reference numbers stay, Rubric when flagged, and open the Cite Slip on
  a click. A foot fixed 24px from the right and 16px from the bottom holds the save state and the
  words in Mute 13px tabular ("Saved · 166 words") and "Leave Focus" as a small secondary button
  with its Esc key cap. Esc leaves once no slip takes it; Preview and ⌘G end Focus (⌘G with the
  Graph beside the desk). The line the writer was at stays in place both ways.
- **Preview:** the leaf shows the post as readers will see it, in its Reference form: raised
  numbers and a numbered note list under a Hairline (footnotes), the short Citation in brackets and
  a list of Sources (links + list), or notes under each paragraph (side notes). A flagged
  Reference's number is Rubric; the note text stays as the site will print it, and the problem
  with its fix is in "Before you publish". A space before a Reference is not printed. The left margin becomes "Before you publish" (Verdigris
  check lines and Rubric problem lines, each with its fix); the right margin "Questions from the
  AI", each question beside a Strong Hairline under a Mute "AI · About …" line.

### Tries Slip

Words of a Writing project that keep the writer's other Tries. The marks are the writer's own, so
they stay neutral; Rubric appears only for the AI's words.

- **In the text:** words with Tries wear a 2px dotted Mute underline (5px offset). Hover is Lapis
  Tint; the words the slip works on wear the selection's Gilt Wash with a Gilt underline. A word
  the AI suggested keeps a Rubric dotted underline while it shows.
- **Hover label:** over the words, a Paper label with a Strong Hairline (2px corners) lists the
  other Tries in Ink 13px, then "← → flips it · Ctrl+Shift+A shows all" in Mute 12px. It takes no
  pointer events, so it never covers the line above.
- **Slip:** under the line the words end on, beside them, 360px (narrower in a narrow column),
  Paper, 1px Lapis border, 4px corners, no shadow, as the Cite Slip. A head with the word count in
  the uppercase 12px set and "N tries" in Mute; the Tries as rows (number, text 15px, "first" or
  "AI word" on the right; the one that shows is Lapis Tint with a 2px Lapis inner edge; a × on
  hover removes one); the field "Write another word"; the AI's words under the AI Text mark (¶
  "Words from the AI", each row "Try it" in Rubric); and a Ground foot with "Ask the AI for words"
  (small secondary) over the keys in Mute 13px. Notes such as "Connect ChatGPT …" sit plain under
  the field, never under the AI mark.
- **Refused flip:** a Try that would change the bold or italic around its words is not put in; a
  plain Mute note under the field says "This Try would break the bold or italic around it. Change
  the marks first." A refused flip from the arrow keys gives the keys back to the caret and the
  live line reads the same note.
- **Format Bar:** "Tries" follows "Cite", in On-Lapis White; it is dimmed while the selection
  cannot be a Try (across paragraphs, or over a Reference).

### Pencil

Code's marks on words the writer may want to look at again, in Write only. The marks are
graphite (Mute mixed 82% with Paper), so they read as the writer's own pencil, never as AI text
(Rubric) or as Tries (the dotted Mute underline).

- **In the text:** a habit or a mechanics mark is a 1.5px solid graphite underline, 4px off; a
  cliché sits between two graphite corner brackets (1.5px, at its top left and bottom right),
  drawn as widgets of no width so the text never moves; the words that echo the word at the caret
  in its paragraph are Lapis Tint with a 1.5px Lapis underline inside. A paragraph the writer is
  typing in shows no marks until the caret leaves it.
- **Button:** "Pencil" as a secondary button in the desk bar before "Cite a Note", with the count
  of marks in view in Mute 400 13px tabular; "off" when every group is off. Open, it is Lapis Tint
  with a Lapis border and label, as the pressed Graph toggle.
- **Groups slip:** under the button, right-aligned, 360px, Paper, Strong Hairline, 4px corners, no
  shadow: a head with "Pencil" in the uppercase 12px set and its lead in Mute 12px, then one row
  per group (name 600 14px, what it marks in Mute 13px, a checkbox on the right; Lapis Tint on
  hover), and a Mute 13px note on when marks show. Click outside or Esc closes it.
- **Mark slip:** under the words, 340px, Paper, 1px Lapis border, 4px corners, no shadow, as the
  Cite Slip: the rule in the uppercase 12px set with "Pencil · your judgement" in Mute 12px, why
  it may be weak in Ink 14px, the words quoted in Mute 13px over a Hairline, and a Ground foot with
  "Try other words" (small secondary with its Key Cap; not on a mechanics mark), "Keep it here"
  and "Pencil settings…" as link buttons. Opened from the keys, it takes focus on its first
  button; Esc returns to the text.

### Cite Slip

Citing happens in a slip under the line being written, not in a sheet, so the sentence stays in
view. `[[`, ⌘K, "Cite a Note" or the Format Bar's "Cite" open it at the caret; a Reference's
number or gloss opens it to change that Reference. Paper, 1px Lapis border, 4px corners, no
shadow, up to 600px wide inside the leaf; the leaf grows under it so it never hangs off the page.

- **Find:** a 44px borderless field with a search icon ("Find a Note, a Source or an author"),
  a Hairline under it. It searches the Note title, the Source's author and title, then the Note's
  text.
- **Matches:** a listbox up to 264px tall. Each row: the title in 600 14px, the Call Number with
  the Note's page on the right, and one line in Mute 13px: the sentence of the Note that matched
  (else its first). The chosen row is Lapis Tint with a 2px Lapis inner edge. Before anything is
  typed, the Reference being changed comes first; Notes already cited in the piece rank before
  others of the same match. ↑ ↓ move, Enter cites, a double click cites. A single click cites at
  once when citing anew and the Note has its own page or Page is filled; otherwise (no page yet,
  or changing a Reference) it chooses the row and moves to Page, and Save commits. Choosing
  another Note while changing a Reference clears the old page.
- **Foot** (Ground, a Hairline above): "Page" and a 72px field, a hint (the Note's own page; "The
  Note has no page. Add it here." in Ink; for a Source, that it has no page of its own), "Remove"
  (quiet) when changing, and Cite or Save (primary with an ↵ Key Cap). Esc closes and returns to
  the text; `[[` then Esc gives back the two brackets; a click outside drops them, closes the slip
  and leaves focus where the click went.

### Graph Beside the Desk (signature: Trail of Slips)

The Graph laid beside the Writing Desk, to read Notes and follow their Links while writing. It reads;
it never writes or cites (citing stays in the Cite Slip). From a 1200px window only.

- **Toggle:** "Graph" in the desk bar after Write | Preview, in both modes: a secondary button with a
  16px Lucide waypoints icon and a ⌘G (Ctrl+G) Key Cap (the cap hides under 1400px so the bar keeps
  one row). Pressed, it is Lapis Tint with a Lapis border and label, `aria-pressed` and
  `aria-controls`. It is off until the Graph has loaded. Each piece remembers whether its panel is
  open (a setting of this computer, not of the file). ⌘G works anywhere on the desk except in the Cite
  Slip and dialogs.
- **Split:** the desk and the panel are two equal columns under the bar, each scrolling on its own,
  meeting at the Crease (see Elevation & Depth): a Strong Hairline, each page shaded into it like
  the fold of an open book. Opening or closing keeps the line the writer was at (the caret if in view,
  else the top line) at the same height; closing from inside the panel returns focus to the text
  (Write) or the toggle (Preview).
- **Stage:** the top 40% of the panel (at least 200px; 34% and 170px under an 800px-tall window) on
  Ground, a Hairline under it. The Graph canvas as on the Graph page, with three marks: Notes the
  piece cites wear a 1.5px Lapis ring; the open Note a 2.5px Gilt ring; the trail is one 3px Lapis
  line through its stops, each with a typed number tab (Paper, 1px Lapis, Courier 700 11px Lapis)
  12px above its node, the open one with a 2px Gilt underline. Tabs that would meet rise above each
  other. While cited or trail marks show, all Links are quieter (55%) and the open Note's Links are
  ink, not Lapis. Labels keep clear of each other, of the tabs, the open Note's ring and the controls
  laid over the canvas (open Note first, then the trail, then cited Notes); the open Note's label goes
  above its tab when the space below is taken.
- **Framing:** the panel opens on the Notes the piece cites. A Note opened from the reader frames
  itself with up to two stops before it; reopening a stop pans only when it is near the edge. The fit
  control (and the 0 key) frames the trail and cited Notes ("Show your trail and the Notes this piece
  cites"). Framing keeps clear of the Find field above and the controls at the left, and its padding
  scales with the stage.
- **Find:** the Graph's find field at the stage's top left (280px), its count on a Ground chip. Up
  to 8 matches drop under it as a Paper list (Strong Hairline, 4px): title and Call Number per row,
  "N more. Type more of the name." under them, "No Note or Source has this in its name." when none.
  The first row is Lapis Tint with a 2px Lapis inner edge while the field has focus (Enter opens it);
  ↓ enters the list, ↑ ↓ move, Esc clears. The list scrolls inside the stage and fades at its foot.
- **Legend:** at the stage's foot right, Mute 12px on a 90% Ground band: "Cited in this piece", "Open"
  and "Your trail", each only while that mark is on screen, with its mark drawn beside it, and "AI
  text" with the hollow ring while the Graph holds any (see AI Mark on the Graph).
- **Head:** "Your trail" in the panel-heading set with a lapis Initial, the count in Mute 13px
  ("4 stops"), and a quiet "Clear the trail" pushed right.
- **Stop strip:** every stop as a one-line slip (number tab, title 600 14px, Call Number), 6px apart,
  in a strip up to about three and a half slips tall (`min(170px, 22vh)`) that scrolls on its own and
  fades at its scrolling edges. The open stop is Lapis Tint with a Lapis border, its number with the
  3px Gilt underline and `aria-current="step"`; the others are buttons that open their Note again in
  place. The trail lasts while the piece is open and is not saved.
- **Reader:** the open Note under the strip, in its own scroll (18px 24px 32px): the Call Number with
  page and the Source as a Lapis link, the title (700 18px; the AI Text title mark when the AI wrote
  it), "Reference 2 in this piece" in Lapis 600 13px when cited, the Note text with its Links as
  inline Lapis links that open in the trail, then its Links as rows with Call Numbers. The heading
  takes focus when the reader or Find opened the Note (the 2px Lapis outline, 4px off, fitted to the
  title).
- **Empty:** before the first Note, the reader holds the lead "Read your Notes beside the text", a
  Mute sentence on how the trail works, and "Cited in this piece": the cited Notes as rows with their
  Call Numbers and "Reference 1 in this piece".

### Settings Slip

The chip in the desk bar ("Blog post · Footnotes": Lapis 600 13px, Strong Hairline, 4px) opens a
420px Paper slip under it (Strong Hairline, no shadow): the type as choice rows that say what each
ends as, "References appear as" as a Segmented control with a sample sentence and its note on
Ground, a hint that the text stays the same, and the language of the text as a Select. A click
outside or Esc closes it.

### Writing Sheets

Two sheets on the Sheet pattern. **Your Bridgetown site:** a sentence, the Site folder field with
its hint and the field error line, "Use this folder" (primary) and Cancel. **Replace the post in
your site?:** what is lost, "Replace it" (secondary) and "Keep it" (quiet, focused).

### Key Cap

A small hairline box that names the key doing the same as the button it sits in: Paper, 1px
Strong Hairline with a 2px bottom border, 4px corners, 22px tall (22px minimum width, 6px side
padding), Mute 600 12px. On a primary button it turns transparent with a 45% white border and
white text. It is hidden from screen readers; the button carries `aria-keyshortcuts`. Every button
on the Review screen that a key presses has one (Stop, Show answer, each rating, Back), and so
does the Settings window's Close (Esc).

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
- **Do** keep a Passage inside one paragraph, so its Location is one exact "¶ 8"; cut a selection
  that runs on, and say so in the Reader Foot.
- **Do** say a Passage's work with its 1px underline (Gilt marked, Lapis taken deeper, Verdigris a
  Point) and keep the 2px Gilt underline for the open Passage only.
- **Do** number every paragraph, list item and quote of a read text in the gutter, in Courier, as
  its Location.
- **Do** keep the reader's words where they are when a save fails, and give the way back to them.

### Don't:

- **Don't** decorate data, Note text, inputs or buttons (no initials, flourishes or gilt there).
- **Don't** use red alone to mean anything; color never carries a message by itself.
- **Don't** add resting shadows (the Crease beside the Writing Desk is the one resting shade) or
  new fields of color beyond the lapis rail, spine, primary and the Settings window's spine.
- **Don't** use Cinzel Decorative beyond a single heading initial, or Courier Prime beyond call
  numbers, step numbers, question numbers, repository names, a code the user types elsewhere,
  paragraph and note numbers, a lesson's week·day, and a timestamp in a Video.
- **Don't** set code in a Note or an Article in Courier Prime; it is text, in Fira Code.
- **Don't** give code colors of its own: it takes Accent, Verdigris, Mute and weight from the
  theme, and never Rubric or Gilt.
- **Don't** mark AI text with Gilt Wash; Gilt Wash is the reader's own selection and Passages.
- **Don't** cover the heading or the line the reader is selecting with the Mark Bar; flip it below.
- **Don't** fix widths to English text, truncate labels, or block wrapping.
- **Don't** build a file-tree-plus-editor arrangement in neutral grey, a busy dashboard, or
  gamification.

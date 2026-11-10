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

AI text is to carry rubric marks (a red pilcrow and margin glosses) by direction. No AI text
exists in the build yet, so that treatment has no component here; design it with Jan when
Notes arrive.

**Key Characteristics:**

- Lapis rail (96px) of large Section icons with labels under them; gold marks the current one.
- White panels with hairline borders; each heading opens with a rubric or lapis Cinzel initial,
  alternating down a column, above a hairline with a rubric pen flourish in its middle.
- Call numbers as typed white spine labels in Courier Prime with a 1px ink border.
- Flat surfaces; depth comes from hairlines and the ground/paper step, not shadows.
- Red is a signal with fixed jobs, never a decoration of data.

## Colors

A cool, bookish palette: one deep lapis field, white paper on a warm near-white ground, and
three small pigments (gold, rubric red, verdigris) each with one job.

### Primary

- **Lapis** (lapis): the rail, the Source spine, the primary button, links, focus outlines on
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

- **Rubric** (rubric): decorated initials, the pen flourish, AI text (by direction), and
  signals of missing data or error, always paired with an icon and words.
- **Rubric Wash** (rubric-wash): the background of a stand-alone warning notice.
- **Rubric Line** (rubric-line): the border of a stand-alone warning notice.
- **Verdigris** (verdigris): done. The check icon and 3px underline of a finished step.

### Neutral

- **Ground** (ground): the page behind panels and the setup body.
- **Paper** (paper): panels, the page header, inputs, buttons, call-number labels.
- **Ink** (ink): text, secondary button border, call-number border.
- **Mute** (mute): secondary text, hints, meta, empty-state copy, field legends.
- **Hairline** (line): panel borders, header rule, row and step dividers, the flourish rule.
- **Strong Hairline** (line-strong): input and choice borders, scrollbar thumb.
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
  letter is the Initial. Fieldset legends use the same set in Mute.
- **Initial** (Cinzel Decorative 700, 2em of the heading, 0.9 line height): the panel heading's
  first letter, in rubric or lapis.
- **Body** (400, 15px, 1.5): all running text; empty states cap at 62ch.
- **Body for writing** (400, 16px, 1.65, max 72ch): the Free text area.
- **Label** (600, 14px): buttons, field labels, step names, row titles.
- **Meta** (400, 13px, tabular numerals): hints, step notes, panel meta, status lines.
- **Rail label** (500, 12px, 1.25): Section names under rail icons; they wrap and hyphenate.
- **Call** (Courier Prime 700, 12px/18px, tabular): call numbers and step numbers; the Location
  part of a call number is 400 in Mute.

### Named Rules

**The One Initial Rule.** Cinzel Decorative appears only as the first letter of a panel heading
or the setup title, through `::first-letter`, so the heading text stays whole for screen
readers. Never on data, buttons or body.

**The Typed Label Rule.** Courier Prime is for call numbers and step numbers only.

## Layout

A two-column frame: the 96px lapis rail, then a scrolling main area. The main area opens with a
white page header (title, a muted sub-line such as the date, actions pushed right; it wraps), and
then the page body (24px top, 32px sides, 40px bottom) on Ground.

Working pages use a main column plus a 300 to 380px side column with 20px gaps; panels stack in
each column with 20px gaps. Below 1080px the columns become one, in reading order. Form and
single-topic pages cap at 760px. First start keeps a bare lapis band at rail width with the
setup body at 48px top.

Spacing steps through 4, 6, 8, 12, 16, 20, 24 and 32px; panel bodies pad 16px 20px 20px and
heads pad 14px 20px. Forms use a two-column field grid (16px row, 20px column gaps) with wide
fields spanning both.

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

### Named Rules

**The Hairline Rule.** Panels separate by a 1px Hairline and a white leaf on Ground. Don't add
resting shadows.

## Shapes

Quiet, nearly square corners: 4px on panels, buttons, inputs, choices, notices, the step bar and
rail items; 2px on call-number labels and skeleton bars; 3px on the spine. The one curve is the
pen flourish (a 64 by 10px stroked SVG with a center dot) set between two hairlines.

## Components

### Buttons

Firm and plain, ink-outlined.

- **Shape:** gently squared (4px), 36px minimum height, 16px side padding, 8px gap to an icon.
- **Primary:** Lapis fill and border, white label, for the next step forward (Add Source, Continue, Start, Skip).
- **Hover / Focus:** primary moves to Raised Lapis with the lapis lift; secondary fills with
  Lapis Tint. 160ms on the shared ease-out. Focus is the 2px lapis outline.
- **Secondary:** Paper with a 1px Ink border and Ink label (Open, Cancel, Save, Retry).
- **Disabled:** 55% opacity, no shadow, not-allowed cursor.

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

### Loading

Skeleton bars (14px, 2px corners) shimmer Tint to Ground over 1.4s inside a panel, with a hidden
"Loading" label. Reduced motion stops all animation and transitions.

## Do's and Don'ts

### Do:

- **Do** put ornament (initials, flourish, gilt) on headings and chrome only.
- **Do** alternate panel initials rubric and lapis down each column.
- **Do** pair every red error or missing-data signal with a warning icon and words.
- **Do** use Gilt only to mark the current place (Section, step) and focus on lapis.
- **Do** give every Source its call number label wherever it is listed.
- **Do** take every string from the EN/DA catalogs and check the layout in Danish.
- **Do** keep Lapis buttons for the next step forward (Add Source, Continue, Start); other actions are ink-outlined secondary.
- **Do** use tabular numerals for counts, years and call numbers.

### Don't:

- **Don't** decorate data, Note text, inputs or buttons (no initials, flourishes or gilt there).
- **Don't** use red alone to mean anything; color never carries a message by itself.
- **Don't** add resting shadows or new fields of color beyond the lapis rail, spine and primary.
- **Don't** use Cinzel Decorative beyond a single heading initial, or Courier Prime beyond call
  and step numbers.
- **Don't** fix widths to English text, truncate labels, or block wrapping.
- **Don't** build a file-tree-plus-editor arrangement in neutral grey, a busy dashboard, or
  gamification.

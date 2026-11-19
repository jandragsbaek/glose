---
version: 1
slug: "src-components-settingswindow-tsx"
primary_target: "src/components/SettingsWindow.tsx"
related_targets:
  ["src/components/Backup.tsx", "src/components/StatusBar.tsx", "src/components/Rail.tsx"]
---

# Settings window and the Backup sheet

Mode: Operate. The Settings window (interface language, Vault, Backup, ChatGPT, your
website) that floats over any page, and the Backup sheet, which Settings and the status bar's
Versions panel both open.

## Audience and job

Jan (English, Windows) and a Danish university student on macOS who does not use git. Once:
put the Vault's Versions somewhere safe, for free, without learning git. Later: see at a glance
that the backup works, and where it is.

## Confirmed decisions

- GitHub is the suggested path: a free private repository that Glose makes; the user only signs
  in with a code on github.com. Another git remote by URL is the quiet second path.
- Chosen on the decision page (November 2026): "Ledger and sheet" over "The ladder" and "Choose,
  then the step bar".
- Glose never pushes the Vault to a public repository.
- Settings is a floating window, not a page (Jan, November 2026, after T3 Code's settings
  window). Chosen on the decision page: "The spine window" over "The turned-out leaf" and "The
  bound window".

## Backup sheet direction contract (November 2026)

THESIS: Backup is a fact about the Vault, not a wizard on the page. Settings states where the
Versions are; the setup happens once, in a sheet, and leaves. It refuses an always-open
multi-step form in Settings.

OWN-WORLD: The incumbent world unchanged: Paper panel on Ground, Cinzel initial and flourish,
facts as a two-column list (Mute labels, Ink values), a rubric triangle with words, one Lapis
primary. The sheet is a Paper leaf (Strong Hairline, 4px) over a dimmed page, with the panel
head and flourish. The GitHub code is a large typed label in Courier Prime.

STORY: The user reads "Only on this computer" and what that risks, presses Back up to GitHub,
types a code on GitHub, keeps the suggested name, and sees "Backed up to github.com/…" with the
last sync.

FIRST VIEWPORT: Backup panel third on the 760px Settings column: facts, the inline warning, then
Back up to GitHub (primary) and a quiet Use another git remote. The open sheet centres over it:
heading, Step 1 of 2, one sentence, the code row (code, Copy code), the waiting line with the
lapis tick that says Glose continues by itself, and the foot: Open GitHub again, Cancel pushed
right. Open GitHub again moved from the code row to the foot in the build: three controls beside
a 28px code do not fit the 560px sheet, and the Danish labels wrapped it onto a second line.

FORM: Ledger and sheet, third of three structures on the decision page, chosen by Jan.
seed: none (no roll: an extension of an existing surface; the three structures were authored for the decision page)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Direction contract

THESIS: Settings is a small bound volume laid over the page you were on, not a page you leave
for. It refuses a full-page settings route and T3's neutral grey sidebar.

OWN-WORLD: A Paper window with a 1px Lapis border and 4px corners, no shadow, over the Ink veil.
A Lapis spine on its left with two gilt bands, the rail's own item vocabulary (Mist at rest,
Raised Lapis and a gilt icon for the section in view). A Paper head; the panels unchanged on
Ground.

STORY: The user presses Settings on the rail (or Open Settings where the AI needs ChatGPT), the
window opens at that section over the page, they change one thing, and Esc, the close button or
a click on the veil puts them back where they were.

FIRST VIEWPORT: Centred 1040 x 720 at most (32px clear of the window edges). Left a 220px spine:
gilt band, the five sections (20px icon and label), gilt band at the foot. Right: a 56px Paper
head with "Settings" (22px 700), an Esc key cap and the close button; under it all five panels
in one 760px column that scrolls inside the window; the spine marks the panel in view. Below
720px it fills the window and the spine becomes a band of sections over the leaf.

FORM: The spine window, second dealt structure of three on the decision page, chosen by Jan.
seed:bc5d18c7632d2395

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

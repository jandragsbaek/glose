---
version: 1
slug: "src-routes-settings-tsx"
primary_target: "src/routes/settings.tsx"
related_targets: ["src/components/Backup.tsx", "src/components/StatusBar.tsx"]
---

# Settings and the Backup sheet

Mode: Operate. Settings (interface language, Graph folder, Backup, ChatGPT) and the Backup sheet,
which Settings and the status bar's Versions panel both open.

## Audience and job

Jan (English, Windows) and a Danish university student on macOS who does not use git. Once:
put the Graph's Versions somewhere safe, for free, without learning git. Later: see at a glance
that the backup works, and where it is.

## Confirmed decisions

- GitHub is the suggested path: a free private repository that Glose makes; the user only signs
  in with a code on github.com. Another git remote by URL is the quiet second path.
- Chosen on the decision page (November 2026): "Ledger and sheet" over "The ladder" and "Choose,
  then the step bar".
- Glose never pushes the Graph to a public repository.

## Direction contract

THESIS: Backup is a fact about the Graph, not a wizard on the page. Settings states where the
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

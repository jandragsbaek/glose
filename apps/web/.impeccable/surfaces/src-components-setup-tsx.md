---
version: 1
slug: "src-components-setup-tsx"
primary_target: "src/components/Setup.tsx"
related_targets: ["src/components/RemoteVaultSheet.tsx", "src/routes/__root.tsx"]
---

# First open (Setup wizard)

Mode: Operate. The first screen a new install shows, before a Vault exists, and the steps after
it until the user reaches real work.

## Audience and job

A stranger who has never seen Glose (public release), and the first two users: Jan (English,
Windows) and his girlfriend (Danish, macOS) who gets the shared Vault from GitHub. Job: choose
the interface language, make or open the Vault, learn what each Section is and what the AI may do
there, optionally connect ChatGPT, and start on the book they read now.

## Confirmed decisions (Jan, November 2026)

- Scope: language, Appearance, Vault, a short Section intro, optional ChatGPT, optional first
  book. No sample Vault.
- Chosen on the decision page: "Steps on a leaf" (dealt position 2 of 3; council favourite).
- Council (Claude Opus, GPT Sol, Muse Wonder Full) rules: language first and live; the Vault is
  the only required step and commits when it succeeds; the AI rules come before the ChatGPT
  question; ChatGPT and the first book have an equal way out; a Vault that already holds Sources
  skips the intro and first book; it ends in real work; native folder picker on the desktop; no
  sheet on a sheet; keep the "nothing leaves your computer" line and the GitHub ledger.

## Direction contract

THESIS: First open is a short, visible list of steps beside one leaf of work, so the user always
sees where they are, what they chose, and what is left. It refuses the one long form of settings
and the tour that teaches before the user has a desk.

OWN-WORLD: Lapis/Gilt/Rubric as in DESIGN.md. Left: the GLO call label, "Set up Glose", the
one-line purpose, and an ordered step list on Ground with Hairline rows; the current step on
Lapis Tint with a 3px Gilt edge, a done step with a Verdigris check and its chosen value. Right:
one Panel with its Cinzel initial and flourish, Back quiet at left, primary Continue at right.

STORY: The user reads what Glose is in one line, picks a language (the page switches at once) and
a binding (the page repaints), makes or opens the Vault, sees the three Sections with their AI
rules shown as the real AI mark, chooses ChatGPT or Later, and adds the book they read now, which
opens at its Reading Start.

FIRST VIEWPORT: 1120px centred: a 300px step column and the step Panel. Step 1 Panel: Interface
language choices, the three bindings as the Settings specimens, Light/Dark/Same as the computer,
Continue. No Back on step 1.

FORM: Steps on a leaf, position 4 on Claude's ordered list, dealt as position 2 of 3.
seed:a11a545fca07f883

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open

- Electron's folder picker is checked on a Mac node (lab-mac-01) or left marked unverified.

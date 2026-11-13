---
version: 1
slug: "apps-web-src-components-statusbar-tsx"
primary_target: "apps/web/src/components/StatusBar.tsx"
related_targets: ["apps/web/src/state/updates.ts"]
---

# The status bar's Updates button

Mode: Operate. One small button in the status bar that keeps the installed app up to date
from the nightly releases on GitHub. Glose checks every hour and when the user asks; the user
downloads, then restarts to install (as in T3 Code).

## Audience and job

Jan (Windows, and an Omarchy laptop with the AppImage) and a Danish student on macOS, where
updates stay off until the app is signed. Job: notice a new version without being pulled out of
reading or writing, take it in two clicks when it suits them, and check now on request.

## Confirmed decisions

- Chosen on the decision page (November 2026): "One button" over "Folio and leaf" and "Running
  line".
- The item exists only in the desktop app, and only where it can update itself. Off (in a
  browser, run from the repository, unsigned macOS, Linux without the AppImage) shows nothing.

## Direction contract

THESIS: The button is always the next step: check, download, restart. It refuses a panel or a
banner for something that needs one click; the versions and the last check live in its tooltip.

OWN-WORLD: The status bar's own grammar: Mute 13px, 16px Lucide icons at 1.6 stroke, a 22px item
with 4px corners and Lapis Tint on hover. Lapis 600 marks a step the user can take; the ready
state is a filled Lapis chip, the bar's only fill, because restarting is the step forward. A
problem is a Rubric triangle with words. The tooltip is an Ink leaf with Paper text.

STORY: The user sees "Update" turn Lapis, clicks, watches the ring fill, then clicks
"Restart to update" when the page is done; Glose closes and opens on the new version.

FIRST VIEWPORT: Right end of the bar, before Versions: a refresh icon at rest; "Checking…"; a Lapis
download icon and "Update"; a Lapis progress ring and "42%"; the Lapis chip "Restart to update";
a Rubric triangle and the problem in words. Hover or focus opens the tooltip above the item's
right end: one 600 line on what is true, then which version is running and when Glose last
checked.

FORM: One button, second of three structures on the decision page, chosen by Jan.
seed: none (no roll: an extension of an existing surface; the three structures were authored for the decision page)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

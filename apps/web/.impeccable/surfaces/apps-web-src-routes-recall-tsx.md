---
version: 1
slug: "apps-web-src-routes-recall-tsx"
primary_target: "apps/web/src/routes/recall.tsx"
related_targets: ["apps/web/src/components/Review.tsx", "apps/web/src/components/CardItem.tsx"]
---

# Recall (Section page)

Scope: the Recall page at `/recall`, the Section's way in. Mode: Operate.

Audience and task: the user opens Recall to start today's Review (first job, one click), then
tends the Cards: fix the ones whose Checks fail or warn, rewrite AI text in their own words.
Confirmed by Jan (13 Nov 2026): Review first, then tend; each Card shows its answer, its Grade
and its problem before a click; default order is by what needs work. Jan chose the Trays
structure on the decision page over Margin glosses and Card register.

Constraints: every string in EN and DA, Danish labels longer; thousands of Cards (50 a tray
at a time); AI Checks run only for shown Cards; no gamification.

Unresolved: when each Card comes back (not in the list data); Cards' Note titles in a slip.

## Direction contract

THESIS: Recall is a desk: today's Review leaf lies on top, and under it trays sort the Cards by the work they need. It refuses one long list of fat Cards with every control open, and the filter form above it.

OWN-WORLD: Rubric & Lapis unchanged. Review as a Paper leaf with paper edges under it (the Review screen's stack, seen from Recall). Trays are a darker well than Ground with Hairline borders; Cards in them are Paper slips. Rubric triangle + words for Needs work, gold triangle + ink words for Could be better, the 3px rubric edge + § gloss for AI text.

STORY: The user sees how many Cards wait today and starts the Review. After it, they read down To fix, open a slip, fix it in a sheet; they clear AI text with I rewrote it from the slip. Good Cards stay folded; search reaches every tray.

FIRST VIEWPORT: White page header "Recall" with "240 Cards · 12 with AI text". A centred leaf up to 980px: lapis "Review" heading, "3 Cards to review today" 24px/700, Mute counts, Start Review right; up to three paper edges. 28px below, a find field, then three trays (1fr 1fr 300px, 20px gaps): To fix, AI text to rewrite, Good (folded to its count).

FORM: dealt structure 7 of 7, trays on the desk. seed:953990af9e60c7b7. Signature interaction: I rewrote it lifts the slip out of its tray the way a rated leaf leaves the Review; reduced motion moves it at once.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

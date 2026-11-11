---
version: 1
slug: "apps-web-src-routes-review-tsx"
primary_target: "apps/web/src/routes/review.tsx"
related_targets: ["apps/web/src/components/Review.tsx", "apps/web/src/routes/recall.tsx"]
---

# Review (focus screen)

Scope: the full-window Review screen at `/review`, opened from Recall's "Start Review". Mode: Operate.

Audience and task: the user answers due Cards, one at a time, daily, in a few minutes. Confirmed by Jan (Nov 2026): a Start button opens its own screen with no rail and no page header; only quiet progress and Stop (Esc) stay beside the Card; the keyboard drives it and each button shows its key. The rating is two steps (Did you recall it? Forgot / Recalled; then How did it go? With effort / Normal / At once, with Back).

Constraints: every string in EN and DA; Danish labels are longer; no gamification (no streaks, scores, confetti).

Unresolved: the Source's call number on the leaf (the Review data does not carry the Source yet); a leech or "this Card needs work" path from the leaf.

## Direction contract

THESIS: A Review is one white leaf on the desk and nothing else. It refuses the flashcard app's dashboard (decks, streaks, sidebars) and a Card shown inline in a list.

OWN-WORLD: Rubric & Lapis unchanged. Ground fills the window; one Paper leaf with a Hairline border; the rubric pen flourish between question and answer; a lapis Cinzel initial on the title; lapis for the forward choice, ink-outlined secondary buttons; key caps as small hairline boxes. No rail.

STORY: The user reads one question, recalls, shows the answer, says honestly whether they recalled it and how. The stack under the leaf thins. At the end the desk is empty and says so.

FIRST VIEWPORT: A 64px bar: "Review" left, "12 left · 3 new · 1 learning · 8 due" centred, Stop with Esc right. A centred 720px leaf from about 130px: state line, question 28px/700, flourish, answer 21px, "From <Note>". Under the leaf up to five offset leaf edges, set by the count left. Below: the step's question and its buttons with key caps.

FORM: dealt structure 7 of 7, the stack of leaves. seed:0afcbbf6e33812d4. Signature interaction: a rating lifts the top leaf away and the next rises from the stack, one edge fewer; reduced motion swaps at once.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

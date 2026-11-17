---
target: writer module (Writing desk)
total_score: 20
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 4
target_identity: "file:/Users/dragsbaek/.t3/worktrees/glose/t3-0be04999-f13f66b2e736445f/apps/web/src/components/WritingDesk.tsx"
target_fingerprint: "sha256:3e02c954518efb4677b38c975165e9feae7907a275aab80932b9fac3d0b8d2df"
target_path: /Users/dragsbaek/.t3/worktrees/glose/t3-0be04999-f13f66b2e736445f/apps/web/src/components/WritingDesk.tsx
timestamp: 2026-11-17T09-18-16Z
slug: apps-web-src-components-writingdesk-tsx
---

Method: dual-agent (A: a9fda6c40fc47297e · B: a0b8a5ce3ff02bb3a)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                            |
| --------- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 2         | Caret never reveals a Reference token (atomic range); glosses drift from their lines                 |
| 2         | Match System / Real World       | 3         | Manuscript metaphor works; raw `##` breaks it                                                        |
| 3         | User Control and Freedom        | 1         | A cited Reference can't be edited (change Note/page) except delete and re-cite; `[[` always hijacked |
| 4         | Consistency and Standards       | 2         | Write shows raw Markdown, Proof renders it; two save indicators; reference spacing inconsistent      |
| 5         | Error Prevention                | 2         | Citing a Note without page creates a NO PAGE flag immediately                                        |
| 6         | Recognition Rather Than Recall  | 1         | Formatting needs Markdown recall; cite rows show title only; flags say "Reference 3"                 |
| 7         | Flexibility and Efficiency      | 2         | ⌘K and `[[` good; no Mod-B/I, heading keys, arrow keys into results, find                            |
| 8         | Aesthetic and Minimalist Design | 2         | Right margin louder than the prose; full Chicago citation repeated 4x                                |
| 9         | Error Recovery                  | 3         | Flags have icon+words+fix, but "Add the page" drops into raw `{p. }`                                 |
| 10        | Help and Documentation          | 2         | Only the placeholder teaches `[[`; no formatting help                                                |
| **Total** |                                 | **20/40** | **Acceptable (bottom of band)**                                                                      |

## Priority Issues

- [P1] No formatting in Write mode (raw ##, *, **; no Mod-B/I/heading keys).
- [P1] A Reference cannot be edited after it is cited (atomicRanges hides the token; no edit popover).
- [P1] Citing is a modal detour that ends in an error (sheet hides the sentence, 90px radio rows, title-only, no arrow keys, empty page field -> NO PAGE).
- [P1] Margins drift and shout (full citations in Write, gloss 5 ~150px off its line, flags name "Reference N").
- [P2] No spellcheck, no lang on the editor.
- [P2] 1100px breaks the desk (bar wraps, prose >100ch, all flags stacked under the leaf).

## Detector

CLI: 0 findings on 8 files. Overlay: 2 low "straggler" findings in .gloss__note (false positive, data-driven). Measured: title input and prose have no focus indicator; left-margin flags precede title/prose in tab order; "Add the page" targets 18px tall.

---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets:
  ["src/routes/__root.tsx", "src/components/Setup.tsx", "src/components/RemoteGraphSheet.tsx"]
---

# App frame, Today and Reading Stage

Mode: Operate. The desktop app's working screens: the frame (rail of Sections), Today (the
opening view), the first-start setup, Add Source, and the Reading Stage for one Source.

## Audience and job

Jan (English) and his girlfriend (Danish, literature student), at a desk, in long reading and
writing stretches and short daily Reviews. On opening: know the next step in seconds and continue
it in one click; see what is incomplete (missing Location, AI text, overdue Cards).

## Confirmed decisions

- Opens straight to Today; no login. First start runs a short setup: language, Graph folder,
  ChatGPT (skippable; the connection does not exist yet, and the step says so).
- Rail: large Section icons with a label under each (Lucide icons, standard set).
- Rubric red marks AI text (the gloss) and initials only. Errors and missing data use red only
  together with a warning icon and words.
- Call number: three letters of the author's family name + first-publication year, then the
  Location: `ARE 1958 · p. 79` (Danish `s. 79`).
- Every string goes through the EN/DA catalogs. Layouts take Danish lengths.
- Dark theme later. Anti-goals: Obsidian/Notion clone, gamification, busy dashboard.

## Direction contract

THESIS: Every Source, Note and Reference wears a call number that leads back to the page, and the
app is embellished the way old books are, at the edges, never in the text. It refuses the
category's file-tree-plus-editor arrangement in neutral grey.

OWN-WORLD: Lapis rail #1E2F7A with gold #C8A040 current marker; near-white ground #FBFAF7, white
panels with hairline #DEDDE3, ink #141414. White call-number labels with a 1px ink border, typed
in Courier Prime. Panel titles open with a Cinzel Decorative initial alternating rubric red
#B3261E and lapis, a small red pen flourish under the header. Red ¶ and margin glosses for AI
text. Verdigris #3E7C5A for done. Public Sans for everything else.

STORY: The user sees what is in progress, what is due and what is unfinished; continues the
Source in progress; adds a Source with complete bibliographic data, writes Free text, and sees
honestly that Extraction and Probe wait for a ChatGPT connection.

FIRST VIEWPORT: 96px lapis rail left (GLO label, Today, Graph, Writing projects, Recall, each a
32px icon over its label; EN/DA and Settings at the foot). White header: page title, date, primary
Add Source (search is deferred: see Open). Left column: Source in progress panel (spine block with vertical call number,
title, publication line, three-step bar, primary Continue), then Notes near current work. Right
380px column: Recall, Writing project, AI text to rewrite. Empty states teach the next action.

FORM: Call Numbers (grounded pick, position 1 of 7) with the Rubric & Lapis variant chosen in a
second round. seed:b779763ece4a3484

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open

- Header search is deferred until there are Notes to search. Sources alone are few, and Today
  already lists every Source in progress. Decided in the full-send build; open for Jan to confirm
  or reverse.

- Real Notes, Cards and Writing projects do not exist yet; their panels show empty states.
- Final faces and the icon set may change when Jan reviews the built app.

## Extraction (November 2026)

Confirmed with Jan from mock v2 (`.impeccable/mocks/extraction/extraction-v2.html`, not in git):
the core points are the page and the Session sits in a full-height margin column; Points first,
the user's own words after; one AI mark for the group of proposed Points; one primary button in
sight (Save Note, Send); written Points one line each; what the AI read and thought folds into
one quiet line each. AI text is always marked, a Point's title included. Below 1080px the margin
moves under the points (Claude's call, delegated by Jan). Anti-goals: a chat page with a list
beside it, cards in cards, a red rule per row.

## First start from a remote (November 2026)

Confirmed with Jan on the decision page ("Ledger and sheet", position 2 of 7 on Claude's list, dealt
by the roll; seed:a4e2028568ad63a2; sketch `.impeccable/mocks/decision/sheet.html`, not in git) over
"The Graphs found" (a two-column Graph step) and "Setup in steps" (a step-bar wizard). Asked first:
GitHub and any git remote; pick from a list; own and shared Graphs.

- THESIS: the Backup sheet run the other way. The setup page stays one calm column; the Graph step
  keeps a short ledger of where the copy comes from, and choosing happens once, in a sheet.
- FIRST VIEWPORT: the Graph folder panel with three choices; "Get it from GitHub" shows a Hairline,
  "From: Not chosen yet", primary Choose on GitHub and quiet Use another git remote, then the folder
  field. The sheet: step 2 of 2 lists repositories as Choice rows, typed name label, Graph mark and
  Yours or Shared by at the row's right end, others folded.
- Built with two sheet steps (connect, choose), not three: the folder stays in the panel, where the
  other two choices already ask for it (Claude's call).
- Unverified live: the list against real GitHub (checked against a local fake of its API) and
  Electron.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

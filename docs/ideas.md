# Ideas

Working notes from early conversations. Nothing here is final.

## Users

- Two users now: Jan (primary language English, Windows) and his girlfriend (primary language
  Danish, macOS).
- A public release may come later. The app must be clear to other readers and students too.

## Running locally

- Glose runs locally on the user's own computer. There is no Glose account and no login screen.
  The app opens straight into the user's work.
- Connecting a ChatGPT subscription (see "AI provider") is not a login to Glose.

## Interface language

- The interface ships in English and Danish. The user selects the language.
- Every user-facing string is translated, from the first feature on. No string is hard-coded.
- Notes, Cards and Writing projects can be in any language, independent of the interface
  language.
- The lint rule `glose/no-untranslated-ui-text` rejects JSX text and user-facing attributes
  (`aria-label`, `title`, `placeholder`, `alt`, `label`) that bypass the catalogs in
  `apps/web/src/i18n`.
- Danish interface terms, first version (to be reviewed by a Danish user): Kilde (Source), Note,
  Graf (Graph), Link, Kort (Card), Genkaldelse (Recall), Skriveprojekt (Writing project), Fri
  tekst (Free text), Udtræk (Extraction), Sondering (Probe), Læsning (the Reading Stage),
  AI-tekst (AI text), Kildehenvisning (Citation), Kortudtræk (Card Extraction), Foreslået kort
  (Proposed Card), Tjek (Check), Vurdering (Grade), Gennemgang (Review), Glemt / Husket
  (Forgot / Recalled), and Med besvær, Normalt, Med det samme (With effort, Normal, At once).

## First start

- A short setup: interface language, Graph folder, and an optional ChatGPT connection (it can
  also be made later in Settings).
- The Graph folder works like an Obsidian vault. The setup either starts a new Graph (suggested:
  `Glose` in the home folder; the folder must be missing or empty) or opens a folder that exists.
  An existing Graph opens with its own settings; any other folder (Markdown from another editor,
  say) becomes a Graph as it is.
- Graph settings travel with the folder, in a hidden `.glose/settings.json`. Moving the folder or
  sharing it through Dropbox or git takes the settings along. No Graph settings exist yet; the file
  marks the folder as a Graph.
- Computer settings stay outside the Graph, in a `settings.json` in the OS's app data folder: the
  path of the open Graph folder and the interface language. The language is per computer so that
  two people who share one Graph each read the interface in their own language.
  `GLOSE_DATA_DIR` overrides the folder.
- Not built yet: noticing a Graph folder that moved or went missing, a native folder picker, and
  switching between Graphs.

## Shape

The app has three sections with different rules for the AI.

| Section              | What it holds                                                               | May the AI write text?                                              |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Graph**            | Notes and rich notes (authors and so on), all interlinked.                  | Yes. AI text is marked so the human rewrites it later.              |
| **Writing projects** | Prose texts. Each writing project is isolated and is not part of the graph. | No. The AI only references and suggests. It never writes the prose. |
| **Recall**           | Quiz cards made from notes, scheduled by spaced repetition.                 | Yes. AI-written cards are marked, the same as notes.                |

The core loop depends on the stage the user is in. Stages known so far:

1. **Reading** (graph) — add a book (a source) and turn it into notes.
2. **Writing** (writing projects) — to be described.
3. More stages to come (recall).

## Sources

- Every note in the graph must have a source.
- Most sources are books. YouTube videos and other kinds of sources also count.
- A writing project can read from the graph and use notes as references. The link is one-way: the graph does not contain the writing project.
- Because every note has a source, a reference from a writing project can be followed back to the original source.

## Writing projects

- There is one type of writing project. Practice writing and university assignments use the same thing.
- A writing project holds one or more files. Files can be re-ordered and joined together.
- A writing project ends in a Publication: a PDF, or a post published to a blog or website.
- Jan's use: practise writing and publish to his own website/blog.
- Girlfriend's use: university assignments, most likely as PDF.
- Writing practice has no curriculum and no set exercises. Jan writes about whatever inspires him that day. The practice is the writing itself, with the AI suggesting and referencing.

## Recall

- A separate section that quizzes the user on cards.
- Scheduling follows the modern Anki approach (FSRS): the user's answers decide how long until a card comes back.
- A review does not lean on the AI. The FSRS algorithm, the same one Anki uses, does the scheduling.
- Cards can be extracted from notes.
- Cards are editable.
- A card shows whether it is AI-written or human-written, the same as notes.

Decided, the Card file (November 2026):

- One file per Card, `Cards/<question>.md` in a `Cards` folder of the Graph folder. The file
  name is the question, made file-safe; a name that is taken (in any case) gets ` 2`, ` 3`. A
  question with nothing a file name may hold is named by its id. Editing the question does not
  rename the file.
- Frontmatter `glose: card`, `id`, `from` and, while it is AI text, `ai: true`. Then the
  question, a `---` line, and the answer:

  ```md
  ---
  glose: card
  id: c-3f9a2c1d
  from: "[[Attention residue lowers performance after switching]]"
  ai: true
  ---

  What does attention residue do?

  ---

  It lowers performance on the next task after a switch.
  ```

- `from` is a wikilink to the file the Card is made from (a Note, a Rich note, or a Source), so
  Obsidian links the Card to it. The Graph view does not show Cards: Glose reads only the top of
  the Graph folder as the Graph.
- `id` stays for the life of the Card, so Reviews keep pointing at it when the file is renamed.
  A Card written by hand without an `id` gets one when Glose next writes it.
- Glose keeps every other frontmatter field (tags, comments) when it edits a Card.
- The AI mark on a Card is `ai: true`. Keeping a proposed Card, edited or not, saves it with the
  mark. The user clears it with "I rewrote it" when the Card is in their own words.
- Glose reads the `Cards` folder once and then only the files whose modification time or size
  changed, so thousands of Cards stay quick. The index lives in memory and is rebuilt from the
  files.

Decided, Card Extraction (November 2026):

- An agentic Session of kind `card-extraction` on one Note (the Session's `subject`; Session
  files from before keep working: `sourceId` reads as `subject`). One Session per Note;
  reopening the Note continues it.
- The user starts it from the whole Note or from a passage they select in it, and can send more
  passages later. The page is `/notes/<Note>/cards`; the Graph's Note panel links to it.
- The agent has `read_note` (any Note by name: text, Source, Links), `list_cards` (the Cards
  already made from this Note) and `propose_cards`. Proposed Cards appear in the Session; the
  user keeps, edits or drops each one. Only kept Cards become files. The next turn tells the AI
  what was kept, changed and dropped.
- The AI must make every Card answerable from the Note or the passage, and may not add facts.
- The user can also write a Card in their own words on the same page; it has no AI mark.
- Recall lists every Card (50 at a time, with search and an AI-text filter) to read, edit, clear
  the AI mark, or delete.

Decided, Card Checks (November 2026):

- Every Card and every open Proposed Card is checked automatically against what research says a
  good Card is. Each Check passes, warns or fails; the Grade is poor with a failed Check, fix
  with a warning, else good. Glose only shows them: the user fixes the Card, and the AI never
  changes it on its own. Recall filters by Grade.
- Rule Checks run in code, at once and offline, also while the user writes a Card:
  - `has-answer`: the Card has an answer.
  - `recall`: no yes/no, true/false or either/or question, and no yes/no answer. Recall beats
    recognition (the testing effect: Roediger & Karpicke 2006), and a yes or a no can be guessed.
  - `not-broad`: no essay prompt ("Explain…", "Describe…", "Forklar…").
  - `concise`: question and answer each at most 30 words (warn), 60 (fail). Wozniak's minimum
    information principle.
  - `no-list`: no list to recite (Wozniak: avoid sets and enumerations).
  - `no-giveaway`: the question does not hold most of the answer's words (Matuschak: effortful).
  - `distinct`: no near-identical question among the Cards from the same Note (Wozniak: combat
    interference).
    English and Danish words are known; Cards in other languages get the language-free rules.
- AI Checks need the meaning of the words: `one-answer` (one exact answer, the one on the Card),
  `specific` (precise, not broad or vague), `self-contained` (clear without the Note),
  `one-idea` (one fact or idea), `true-to-note` (no wrong or added facts; Cards without a Note
  skip it). After Matuschak's focused, precise and consistent prompts.
- An AI judge that sees the expected answer is poor at "many correct answers possible"
  (Memory Machines' 2025 study of 1,500 rated cards: F1 0.32–0.50 for that fault, while
  "lacks context" reached 0.85). So `one-answer` works blind: a first call sees only the
  questions and the Note and writes every answer a fair grader would accept; the judge then
  compares those with the Card's answer. Ten Cards per pair of calls.
- AI Checks are advice. The same study found AI judges agree with people on about two Cards in
  three; the interface says so.
- AI Checks run on Proposed Cards as soon as the AI proposes them, and on saved Cards when
  Recall or the Note's Card page shows them (the shown page, not all Cards at once). They are
  kept per computer in the app data folder, by a hash of the question, answer, Note text and
  interface language; changed words or a changed Note are checked again. A failed AI Check
  waits ten minutes before it is tried again.
- Not yet: Checks across the set of a Note's Cards (does it cover the Note's main point, is
  there enough "why" and "how"), and lapses from Reviews as evidence of a weak Card.

Decided, Reviews (November 2026):

- FSRS through ts-fsrs 6 (open-spaced-repetition, MIT; healthy: 400k weekly downloads, active
  in November 2026). Glose pins the FSRS-6 model, which Anki 26.09 uses. ts-fsrs 6 defaults to
  FSRS-7, which reached fsrs-rs on 10 November 2026 and is not in Anki yet. The scheduling runs
  on the server only.
- Every Review is appended as one JSON line to `.glose/recall/reviews/<computer id>/<yyyy-mm>.jsonl`
  (month in UTC): `{"card":"c-…","at":"<ISO time>","rating":"good","answerMs":3100}`. The rating
  is `again`, `hard`, `good` or `easy`. Each computer writes only its own folder, so a Graph shared
  through Dropbox or git has no conflicts, and git sees only added lines. A line Glose cannot read
  is skipped, so one cut-off line does not lose the record.
- The computer id is a random id in `computer.json` in the app data folder, made on first use.
- The log is the record. Each Card's FSRS state is replayed from the logs of every computer, in
  time order. Changed: the replayed state is cached in memory only, not in `.glose/recall/`,
  because a cache file in a shared Graph folder would conflict between computers. A new Review
  is applied to the cache at once; a changed log file (a sync) or changed settings replays the
  whole log (50,000 Reviews take about 0.6 s).
- Because the state is replayed, a changed setting applies to past Reviews too, like Anki's
  "Reschedule cards on change".
- Fuzz is on, as in Anki. ts-fsrs seeds it with the Card id and its number of Reviews, so a
  replay gives the same dates.
- A Card written by hand without an `id` gets one before its first Review is kept.

Decided, Recall settings (November 2026):

- They travel with the Graph, in `.glose/settings.json` under `recall`, because the Reviews they
  schedule travel with it too. The file holds only what the user changed; a missing field takes
  its default, so a later Glose can improve a default the user never set. Until the Settings
  panel edits them, they can be changed by hand in that file.
- Defaults are Anki's for a new deck with FSRS on: `desiredRetention` 0.9 (0.7 to 0.99),
  `learningSteps` `["1m", "10m"]`, `relearningSteps` `["10m"]`, `maximumInterval` 36500 days,
  `newCardsPerDay` 20, `maximumReviewsPerDay` 200, `nextDayStartsAt` 4 (local hour), `weights`
  null (FSRS-6's defaults; later, parameters fitted to the user's log). A step is a number and
  `m`, `h` or `d`.
- Fixed for now, as Anki has them: fuzz on, and a learn ahead limit of 20 minutes.

Decided, the Review queue (November 2026):

- Anki's order: due learning steps first, then due Cards past learning (oldest due first, up to
  the daily limit), then new Cards (up to the daily limit). With nothing else due, a learning step
  due within 20 minutes comes early. The daily limits count Reviews since the day started at
  `nextDayStartsAt`, on every computer.
- New Cards start in file name order, since a Card does not record when it was made.
- Recall shows what is due today and a "Start Review" button. A Review has its own screen at
  `/review`, without the rail: one Card (a white leaf) on the desk, with the Cards still to come
  as paper edges under it, a quiet count, and Stop (Esc). The leaf shows the question, then
  "Show answer" opens the answer below the pen flourish. The keyboard drives it, and each button
  shows its key: Space shows the answer; 1 Forgot, 2 Recalled; then 1, 2, 3 for how it went,
  Backspace for Back. The time to answer counts from showing the question to choosing the
  rating. With nothing due, the desk says when a learning step comes back, and asks again then,
  or that the day is done.
- The rating comes in two steps, not Anki's four buttons. People press Hard when they forgot, but
  FSRS reads Hard as a pass ("recalled, with effort"); only Again is a fail, and FSRS cannot
  adapt to that habit. So Recall first asks "Did you recall it?" with Forgot (Again) and Recalled.
  After Recalled it asks "How did it go?" with With effort (Hard), Normal (Good) and At once
  (Easy), and Back. Each button that rates shows when the Card would come back. The log and FSRS
  keep Anki's names: `again`, `hard`, `good`, `easy`. The price is one more click per Review.
- Not yet: undo of the last Review, leeches (Cards forgotten often), fitting
  FSRS parameters to the log, retention numbers, and the order new Cards start in.

## Probe and Review

The Probe and Review are different things with different goals.

|        | Probe                                             | Review                                       |
| ------ | ------------------------------------------------- | -------------------------------------------- |
| Goal   | Gauge comprehension. Clarify and learn concepts.  | Practise active recall. Keep retention high. |
| When   | While adding a source, once.                      | Repeatedly, on a schedule.                   |
| Form   | A conversation that adapts to the user's answers. | Fixed cards.                                 |
| Result | Understanding, and notes.                         | A new interval for each card.                |

## Storage

- Core writing is Markdown: plain files on disk.
- The reason: plain files are extremely easy to store, back up and version with Dropbox or git.
- The files are the truth. Anything else the app keeps (an index, a search database) must be rebuildable from the files.
- References, AI marks and links must therefore be expressed in the Markdown itself, in a form that still reads well in any other editor.
- The folder structure is mostly flat, as Obsidian practice recommends. Structure comes from links, not from folders.
- Notes link to each other with wikilinks (`[[note name]]`).
- The exact layout is not fixed now. It will be worked out along the way.
- First decision, the Source file: `<Family name> <year> <Title>.md` in the Graph folder,
  with YAML frontmatter (`glose: source`, `author-family`, `author-given`, `title`,
  `first-published`, `edition`, `edition-year`, `publisher`, `translator`, `reading-step`) and
  the user's Free text as the body. Empty fields are left out. Glose reads any Markdown file
  with `glose: source` as a Source, so a Source can be written or fixed by hand.
- File names drop characters Windows forbids, and two names that differ only in case count as
  the same file.
- Add Source can search a Catalog, an outside book database, and fill the form from a chosen
  book. The first Catalog is Open Library (open data, no key; Google Books refuses calls without
  one). One result per work, with the edition Open Library matches best; editions in the interface
  language come first, and an ISBN finds the exact edition. The work gives the year of first
  publication; the edition gives the title as printed, the publisher and the edition year. Edition
  and translator stay for the user. Each result leads with the call number it would get and names
  its edition; an ISBN search is the way to the user's exact copy. Choosing a result fills only
  empty fields and fields an earlier choice filled, never what the user typed, and can be undone.
  Filled fields are marked until the user edits them, and the user is told to check them against
  their copy: Open Library's data has errors. The search runs on the server, which names
  Glose and a contact address in its `User-Agent`, as Open Library asks.
- A Source's call number (`ARE 1958`) is the first three letters of the family name and the
  year of first publication. It is shown, not stored.
- First form of a Note file, used by the demo Graph and read by the Graph view (nothing writes
  Notes yet): `<Note title>.md` in the Graph folder, with frontmatter `glose: note` and
  `source: "[[<Source file name>]]"`, then the Note text with wikilinks. The `source` field is
  itself a wikilink, so Obsidian links a Note to its Source too. AI text in it carries the AI mark
  (see "AI-written text in the graph").
- Any other Markdown file in the Graph folder is a Note without a Source. Links follow Obsidian:
  `[[name]]`, `[[name|shown words]]`, `[[name#heading]]` and embeds count, names match without
  regard to case, a wikilink inside code is not a Link, and a wikilink to a missing file draws no
  Link.

## Graph view

- The Graph Section draws every file as a node and every Link as a line, like Obsidian's graph
  view and learnharness's knowledge graph: a force layout on one canvas, zoom to the pointer by
  wheel or pinch, pan by dragging the background, and drag a node to pull on its Links.
- A Source is a larger lapis node that wears its call number; Notes are smaller. A node grows
  with its number of Links. Note names fade in as the user zooms in.
- Hover or select a node and its neighbourhood stays bright while the rest fades. The selected
  node is in the address (`/graph?node=…`), so Back returns to the Note read before.
- A side panel reads the selected node: its text with working wikilinks, its Source, and its
  Links. Without a selection it lists the Sources. Search fades everything except matching names.
- Double-clicking a Source opens its Reading Stage. A Note has no page of its own yet.
- `pnpm dev:demo` opens Glose on the demo Graph (`demo/Graph`): ten Sources, two of them Danish,
  with 104 linked Notes of clearly sample content. It runs on a copy in the temp folder with its
  own computer settings, so the user's Graph and settings stay untouched.

## References in writing

Correct references are a key part of the writing section. The tool will be used for university work, where references must be correct.

- The reference system is not known yet, so the tool must not be built around one style. The style is a setting of the writing project and can change without rewriting the text.
- A reference in the prose points to a note or a source, not to typed-out citation text. The tool builds the citation, footnote and bibliography from the source data.
- This puts a demand on sources: each one needs complete data (author, title, year, edition, publisher, translator and so on), and a reference needs an exact location such as a page number.
- The tool should warn when a reference cannot be made correct, for example when a source lacks a year or a quote lacks a page number.
- Quotes must match the source word for word.
- Helping with references is inside the AI's permitted role in writing: it references, it does not write the prose.

## AI-written text in the graph

- The AI may write notes and drafts of rich notes such as author notes.
- Every piece of AI-written text is clearly marked in the Markdown itself.
- The goal is that the human eventually rewrites all of it. The marks make the remaining work visible.

Decided, the AI mark (November 2026): the AI may write a few paragraphs, a whole Part (a
heading and its text, up to the next heading) or a whole Note, and the mark says which.

- AI paragraphs are an Obsidian callout of type `ai`. Obsidian shows it as a marked box; any
  other editor shows a quote. The callout runs to the next blank line; paragraphs inside it are
  separated by `>` lines. A callout title, if any, is AI text too.
- A whole AI-written Part keeps its heading as a real heading, and directly under it one callout
  of type `ai-part` holds all of the Part's text. The heading stays outside the callout because
  Obsidian cannot link to a heading inside one (`[[Note#Heading]]`) or show it in the Outline.
  The heading counts as AI text.
- A whole AI-written Note has `ai: true` and no callout. This also covers a file marked by hand.
- Any file with AI text has `ai: true` in its frontmatter, so Obsidian search, Dataview and other
  tools find it without reading callouts.

  ```md
  ---
  glose: note
  source: "[[Newport 2016 Deep Work]]"
  ai: true
  ---

  ## The finding

  > [!ai-part]
  > Newport draws on research by Sophie Leroy: ...
  >
  > This is why multitasking feels productive but is not. ...

  ## How it connects

  My own paragraph.

  > [!ai]
  > One paragraph the AI wrote.
  ```

- Either mark counts. If the two drift apart after a hand edit, the file still shows as holding
  AI text: Glose never hides AI text because one mark is missing.
- To rewrite AI text, the user replaces the callout with their own words. When no callout is
  left, the user removes `ai: true` (Glose does not edit Notes yet).
- In the app, AI text keeps ink colour. A rubric rule is beside it and a rubric gloss above it
  says how much the AI wrote: "¶ AI paragraph(s)", "§ AI-written Part" or "§ AI-written Note"
  (Danish "AI-afsnit", "AI-skrevet del", "AI-skrevet note"). A Part or a Note has a heavier rule
  that covers the heading too. See DESIGN.md. Today lists every Note with AI text and opens it in
  the Graph.
- Cards use `ai: true` as their mark (see "Recall").

## Stage 1: Reading

Trigger: the user is reading, or has finished, a book and adds it as a source.

### Steps

1. **Free text.** The user writes freely about the book. This step is optional; the user says when they are done or skips it.
2. **Extraction.** The AI helps the user pull out the core beliefs and points of the book.
3. **Probe.** Like learnharness, the AI questions the user to find what they already know, what they do not know, and what still must be learned.

### Result

A set of notes. Each note should be traceable to the user's free text or to the book itself.

### Notes

- Format: Markdown files, Obsidian-like.
- Default size: Zettelkasten. Small, one idea each, heavily interlinked.
- Richer notes are allowed where the subject needs it. An author note, for example, can be long and hold images.

### AI provider

ChatGPT first. Both users already have access to it.

- Each user signs in with their own ChatGPT subscription. No API key.
- learnharness already does this ("Sign in with ChatGPT", an OAuth sign-in whose callback is on the user's own machine), so there is a working example to study.
- The experience is agentic, like learnharness: the AI runs a session, asks questions, reads the graph and acts through tools, instead of answering one prompt at a time.
- The AI rules of each section can be enforced by the tools the agent gets there. In a writing project the agent has no tool that writes prose.

Decided, first version (November 2026):

- Glose uses OpenAI's documented "Sign in with ChatGPT" for open-source and locally hosted apps
  (https://developers.openai.com/siwc/token-sharing-open-source), not the Codex CLI's client ID.
  The first sign-in registers Glose as the user's own client (`dynamic_agent_client`, name hint
  "Glose"); later sign-ins reuse the issued client ID. Each computer has its own opaque host ID.
- The browser returns to a loopback callback on `127.0.0.1:1455` for the first sign-in, and any
  free port after that. The server opens the system browser itself; the app also shows the link.
- Inference goes to the public Responses API (`api.openai.com/v1/responses`) with `store: false`
  and `stream: true`. The full model input is sent each time, so nothing is kept at OpenAI.
  Glose's tools reach the model in one namespace, `glose`, as this route requires.
- The model is the first one OpenAI lists for the account. A model picker can come later.
- The ChatGPT credentials are per computer, in `chatgpt.json` beside the computer settings, readable
  by the owner only. They never go into the Graph folder, which may be shared.
- Following OpenAI's guidelines: the button reads "Continue with ChatGPT", a one-time notice says
  "You're using your ChatGPT plan", and "Using ChatGPT plan" with a "Manage usage" link to
  ChatGPT's usage page sits next to the Session's message box. The ChatGPT logo is not used yet.
- First Session kind: Extraction. The agent has two read-only tools, `read_source` (bibliographic
  data and Free text) and `list_sources`. It cannot write Notes, because the Note format and the
  AI mark are not decided. One Extraction Session per Source; reopening the Source continues it.
- A Session is kept in the Graph folder as `.glose/sessions/<id>.json`: what the user saw, and the
  exact model input that the next turn continues from.
- Developing on a headless node: the callback reaches the computer that runs the browser, so
  forward the port first (`ssh -L 1455:127.0.0.1:1455 <node>`), or sign in on a computer with a
  browser.

## Reasoning as part of the answer

Taken from learnharness: the user thinks out loud, by typing or by dictation, and the reasoning is recorded and transcribed.

- The reasoning is part of the answer. The AI judges both the reasoning and the end result.
- Sometimes the reasoning is right and the end result is wrong, or the other way round. A right/wrong mark alone hides this.
- The reasoning shows where the misunderstanding is, so the AI can address that exact point.
- It belongs to the Probe. Recall stays quick questions and does not require it.

## Everything is kept

- All sessions are recorded and kept: Probe conversations, transcribed reasoning, and answers.
- Kept reasoning is the user's own words, so it can be raw material for notes.
- Kept records show progress over time.

## Technical direction

- glose is a full Electron desktop app.
- It uses mostly the same mechanisms as [T3 Code](https://github.com/pingdotgg/t3code) (MIT), in the way the Chalk project already does: shared Effect Schema contracts, an Effect server with typed RPC, and a React client that reads server data through Effect atoms.
- New compared to Chalk: the Electron shell. T3 Code's `apps/desktop` is the model for it.
- The app updates itself, so a new version reaches both users without manual installs. T3 Code does this with `electron-builder` and `electron-updater`.
- The Markdown files stay the truth. A database, if there is one, is only an index that can be rebuilt.
- Release platforms: macOS and Windows. One user is on macOS, and Jan uses glose on Windows.
- One design language on both platforms. Details that belong to the OS (window controls, menu
  bar, keyboard shortcuts) follow each OS.
- Development happens on Linux and macOS nodes, load-balanced through T3. The app must therefore also run on Linux for development, including in a plain browser without Electron on headless nodes.
- File names must be safe on all three systems: no characters that Windows forbids, and no two notes whose names differ only in upper and lower case.
- The macOS app is signed and notarized, because self-update on macOS needs it. This needs an Apple Developer account, which Jan plans to get anyway for other macOS apps.

## Relation to learnharness

- glose copies no code from learnharness. At most it is inspired by its ideas.
- learnharness is AGPL-3.0. Because no code is copied, that licence does not bind glose, and the licence of glose is a free choice.

## Open questions

- Which licence does glose use? OpenAI documents "Sign in with ChatGPT" plan usage for open-source
  and locally hosted apps; Glose is locally hosted, and a public release may need it open source.
- Is the Windows build signed, or is the one-time SmartScreen warning acceptable?

- Is a note that the AI arranges from the user's own transcript marked as AI text or as human text?

- What is the source of a note that holds the user's own idea, or that combines several notes?
- Is the exact location (page number, timestamp) required on every note, or only when the note is cited?
- Are session records kept as transcripts only, or with the audio?
- Does each user have a separate graph and separate records?
- Which reference system does the university require?
- How do references appear in a blog post: links, footnotes, or nothing?
- How does the tool check that a quote matches the source when it does not have the full text of the book?
- Which suggestions may the AI make in a writing project: other words, weak sentences, questions, a review at the end?
- When a note changes, what happens to the cards made from it?
- Does the Probe hand anything to recall (for example, suggested cards), or are cards only made from notes?
- How does publishing to a blog work: export a file, or push directly to the site?
- Does the AI see the book text, or only the user's free text plus what the model already knows?
- What happens to the "unknown" items found by the Probe? Do they become cards?
- What exactly are the richer note types (author, work, period, concept)?

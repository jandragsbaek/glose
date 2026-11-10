# Ideas

Working notes from early conversations. Nothing here is final.

## Shape

The app has three sections with different rules for the AI.

| Section              | What it holds                                                       | May the AI write text?                                              |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Graph**            | Notes and rich notes (authors and so on), all interlinked.          | Yes. AI text is marked so the human rewrites it later.              |
| **Writing projects** | Prose texts. Each project is isolated and is not part of the graph. | No. The AI only references and suggests. It never writes the prose. |
| **Recall**           | Quiz cards made from notes, scheduled by spaced repetition.         | Yes. AI-written cards are marked, the same as notes.                |

The core loop depends on the stage the user is in. Stages known so far:

1. **Reading** (graph) — add a book (a core reference) and turn it into notes.
2. **Writing** (writing projects) — to be described.
3. More stages to come (recall).

## Sources

- Every note in the graph must have a source.
- Most sources are books. YouTube videos and other kinds of sources also count.
- A writing project can read from the graph and use notes as references. The link is one-way: the graph does not contain the project.
- Because every note has a source, a reference from a writing project can be followed back to the original source.

## Writing projects

- There is one type of project. Practice writing and university assignments use the same thing.
- A project holds one or more files. Files can be re-ordered and joined together.
- A project ends in a Publication: a PDF, or a post published to a blog or website.
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

## References in writing

Correct references are a key part of the writing section. The tool will be used for university work, where references must be correct.

- The reference system is not known yet, so the tool must not be built around one style. The style is a setting of the project and can change without rewriting the text.
- A reference in the prose points to a note or a source, not to typed-out citation text. The tool builds the citation, footnote and bibliography from the source data.
- This puts a demand on sources: each one needs complete data (author, title, year, edition, publisher, translator and so on), and a reference needs an exact location such as a page number.
- The tool should warn when a reference cannot be made correct, for example when a source lacks a year or a quote lacks a page number.
- Quotes must match the source word for word.
- Helping with references is inside the AI's permitted role in writing: it references, it does not write the prose.

## AI-written text in the graph

- The AI may write notes and drafts of rich notes such as author notes.
- Every piece of AI-written text is clearly marked in the Markdown itself.
- The goal is that the human eventually rewrites all of it. The marks make the remaining work visible.

## Stage 1: Reading

Trigger: the user is reading, or has finished, a book and adds it as a core reference.

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
- Development happens on Linux and macOS nodes, load-balanced through T3. The app must therefore also run on Linux for development, including in a plain browser without Electron on headless nodes.
- File names must be safe on all three systems: no characters that Windows forbids, and no two notes whose names differ only in upper and lower case.
- The macOS app is signed and notarized, because self-update on macOS needs it. This needs an Apple Developer account, which Jan plans to get anyway for other macOS apps.

## Relation to learnharness

- glose copies no code from learnharness. At most it is inspired by its ideas.
- learnharness is AGPL-3.0. Because no code is copied, that licence does not bind glose, and the licence of glose is a free choice.

## Open questions

- Which licence does glose use?
- Is the Windows build signed, or is the one-time SmartScreen warning acceptable?

- Is a note that the AI arranges from the user's own transcript marked as AI text or as human text?

- How is AI text marked: per note, per block, or inline?
- What is the source of a note that holds the user's own idea, or that combines several notes?
- Is the exact location (page number, timestamp) required on every note, or only when the note is cited?
- Are session records kept as transcripts only, or with the audio?
- Does each user have a separate graph and separate records?
- Are cards and their review history also plain files? Review history changes daily, which is noisy in git.
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

# Glose

A desktop app for learning from what you read and for writing your own prose. This glossary is
its ubiquitous language: use these terms in code, tests, issues, PRs and commits.

## Language

**Vault**:
The folder that holds the user's **Graph**, **Sources**, **Cards**, **Writing projects** and
**Sessions**, with its own settings. The user starts a new **Vault**, opens one, or copies one
from GitHub.
_Avoid_: Graph folder, graph (for the folder), project, workspace, library

**Graph**:
All **Notes** and the **Links** between them, in a **Vault**. Also the **Section** that draws them.
_Avoid_: vault (for the Notes and Links), library, knowledge base, collection, zettelkasten

**Section**:
One of the three top parts of the app: the **Graph**, **Writing projects** and **Recall**. Each
has its own rules for what the AI may write.
_Avoid_: area, tab, module, mode, workspace

**Stage**:
A part of the user's work with the app, such as Reading or Writing. The core loop depends on it.
_Avoid_: phase, mode, step

**Session**:
One run of the AI agent with the user, in any **Section**. It is recorded and kept.
_Avoid_: chat, conversation, thread, run

**Note**:
A Markdown file in the **Graph** that has a **Source**. By default it holds one idea.
_Avoid_: zettel, page, document, entry

**Growth**:
How far a **Note** has grown in the user's own words: Seed, Sprout, Sapling or Tree. Glose
suggests the next step from what it sees in the **Graph**; only the user sets it.
_Avoid_: maturity, status, level, stage (that is a **Stage**)

**Tend**:
To read a **Note** again and decide that it still stands. The day is kept with the **Note**.
_Avoid_: review (that is a **Review** of a **Card**), revisit, refresh

**Part**:
A heading in a **Note** and its text, up to the next heading.
_Avoid_: section (that is a **Section** of the app), chapter, block

**Rich note**:
A **Note** about one subject, such as an author or a work, that may be long and hold images.

**Person**:
A **Rich note** about one person (`glose: person`). It has no single **Source**: the person's
**Sources** are the ones whose author has their name. Its page sets them out by year, with the
**Notes** from each and the other **People** it links with. Plural: People.
_Avoid_: author (as the term), contact, profile, speaker (as the term)

**Link**:
A wikilink (`[[note name]]`) from one **Note** to another. **Links**, not folders, give the
**Graph** its structure.
_Avoid_: edge, connection, relation, backlink

**Source**:
The book, video or other work that a **Note** comes from, with its bibliographic data.
_Avoid_: core reference, reference, book (as the general term), material

**Article**:
A **Source** that brings its own text, read in Glose: an academic paper, a web essay, or a
magazine or newspaper piece, imported as Markdown.
_Avoid_: paper (alone), post, document

**Course lesson**:
A **Source** that is one lesson of a course, imported as Markdown with the course's other lessons.
It brings its own text, read in Glose; the course is where it appeared, as a journal is for a paper.
_Avoid_: module, unit, chapter, lecture

**Course**:
The **Course lessons** that share a course name. Its page shows them as a shelf of weeks and days.
_Avoid_: class, program, module

**Lesson video**:
The video of a **Course lesson**: a link to where it plays and, if the user saved it, a file in
`Course videos`. It is part of the lesson, not a **Video** **Source**.
_Avoid_: clip, recording, attachment

**Video**:
A **Source** that is a talk or another video on YouTube, watched in Glose. It brings no text; its
**Free text** is written while watching, with timestamps, and a timestamp is its **Location**.
_Avoid_: clip, recording, talk (as the term), media

**Passage**:
Words of a **Source** that the user keeps: marked while reading an **Article** or a **Course
lesson**, or copied from their own copy of a book, where each **Passage** is a file of its own with
its **Location**. The user's own words on it are kept with it. A **Passage** holds the author's
words, a **Note** the user's; a **Note** cites the **Passages** it rests on. A **Passage** can be
taken deeper in the **Probe**, or become a **Point**.
_Avoid_: highlight, mark (that is the **AI mark** or a Reading mark), annotation, excerpt, quote

**Catalog**:
An outside book database that Glose searches to fill in the bibliographic data of a new
**Source**. The user checks what it gives against their own copy.
_Avoid_: book database, registry, library

**Free text**:
What the user writes freely, in their own words, about a **Source** at the start of the Reading
**Stage**.
_Avoid_: summary, journal, brain dump, freewrite, reflection

**Extraction**:
Turning a **Source** into **Notes**, or a **Note** into **Cards**. Extraction from a **Source** is
a step of the Reading **Stage**, where the AI helps the user.
_Avoid_: assisted extraction, distillation, summarising, note-taking

**Point**:
One core claim of a **Source** in **Extraction**, said as a full sentence. The AI proposes
**Points**, or the user adds one; a kept **Point** becomes a **Note** whose title is the claim.
_Avoid_: key point, takeaway, insight, idea (alone), claim (as the term), candidate

**Probe**:
A **Session** in the Reading **Stage**, once per **Source**, in which the AI adapts its questions
to find what the user knows and does not know.
_Avoid_: reading quiz, quiz, measure, test, exam, assessment

**Reasoning**:
The user's own words, typed or transcribed, that show how they reached an answer in a **Probe**.
On an open question it shares one box with the answer it ends on.
_Avoid_: explanation, thinking, working, rationale, chain of thought

**Writing project**:
A set of prose files that the user writes, outside the **Graph**, that ends in one
**Publication**. The AI never writes its prose.
_Avoid_: project (alone), document, draft, essay, assignment, manuscript

**Blog post**:
A type of **Writing project** whose **Publication** is a post on the user's own website.
_Avoid_: article, entry, post (alone)

**University assignment**:
A type of **Writing project** for a course, whose **Publication** is a PDF with a bibliography.
_Avoid_: assignment (alone), paper, essay

**Recall**:
The **Section** of **Cards** that spaced repetition (FSRS) schedules.
_Avoid_: drill, flashcards

**Card**:
One question and its answer in **Recall**, usually made from a **Note**.
_Avoid_: flashcard, item, question, prompt

**Proposed Card**:
A **Card** the AI suggests during **Extraction** from a **Note**. It becomes a **Card** only when
the user keeps it, edited or not.
_Avoid_: draft, suggestion, candidate

**Check**:
One test of a **Card** or **Proposed Card** against what research says a good Card is, such as
"one exact answer". Code runs the rule Checks at once; the AI runs the AI Checks, which are advice.
Each passes, warns or fails.
_Avoid_: rating, lint, validation, quality check

**Grade**:
One word for all the **Checks** of a **Card**: good, fix (a **Check** warns) or poor (a **Check**
fails).
_Avoid_: rating, mark (that is the **AI mark**), quality

**Review**:
One answer to one due **Card**. It sets when the **Card** comes back.
_Avoid_: recall quiz, drill

**AI text**:
Text in a **Note** or a **Card** that the AI wrote and the user has not yet rewritten, and a
**Try** the AI suggested in a **Writing project** until the user edits it.
_Avoid_: generated text, draft, suggestion, AI content

**AI mark**:
The marker in the Markdown that flags **AI text**: on a paragraph, on a whole **Part**, or on the
whole file.

**Publication**:
The finished form of a **Writing project**, such as a PDF or a blog post.
_Avoid_: output, export, build, artifact, render, deliverable

**Reference**:
A pointer in the prose of a **Writing project** to a **Note** or a **Source**, with a
**Location**.
_Avoid_: cite, link

**Location**:
The exact place in a **Source**, such as a page, a timestamp, or a paragraph number (¶ 8) in an
**Article** or a **Course lesson**.
_Avoid_: locator, pinpoint, position, page (as the general term)

**Citation**:
The text the tool builds from a **Reference** in the style the **Writing project** uses.

**Try**:
One of the ways the user tried a word or a few words in a **Writing project**. The text holds the
**Try** that shows; the others wait at the end of the file.
_Avoid_: alternative, variant, version, suggestion

## Relationships

- A **Vault** holds one **Graph**; moving, sharing or backing up the folder takes all of it along
- Every **Note** has a **Source**; **Links** join **Notes** into the **Graph**
- A **Note** with **AI text** stays a Seed; a **Note** in the user's words can grow, and a Tree
  has been tended
- A book read now keeps **Passages** after each sitting, and the user writes **Notes** from them
  as they go; **Extraction** later starts with the **Passages** no **Note** cites
- A **Source** is a book (read elsewhere), an **Article**, a **Course lesson** or a **Video**; an
  **Article** and a **Course lesson** bring their text, so the Reading **Stage** starts by reading it
  in Glose and marking **Passages**; a **Video** starts by watching it in Glose and writing the
  **Free text** beside it
- A **Course** is its **Course lessons**; each lesson may have one **Lesson video**, read and
  questioned with its text in one Reading **Stage** and one **Probe**
- A **Point** from words of a **Video**'s **Free text** takes the timestamp before those words as
  its **Location**
- A new **Source** can be filled in from a **Catalog**; the **Source** file, not the **Catalog**,
  is the truth
- A **Probe** is a **Session**; the user's **Reasoning** in it is kept
- A **Writing project** reads from the **Graph** but is not part of it; both live in the **Vault**
- A **Writing project** is a **Blog post** or a **University assignment**; its type decides how
  **Citations** appear and what the **Publication** is
- A **Reference** points to a **Note** or a **Source** at a **Location**; the tool builds a
  **Citation** from it
- In **Extraction** from a **Source**, the AI proposes **Points**; the user writes each kept **Point**
  as a **Note** in their own words, and its title stays **AI text** when the AI proposed it
- A **Card** is usually made from a **Note** by **Extraction**; each **Review** sets when it comes
  back
- In **Extraction** from a **Note**, the AI makes **Proposed Cards**; a kept one is a **Card** with
  an **AI mark**
- Every **Card** and open **Proposed Card** has **Checks** and a **Grade**; they inform the user and
  never change or block the **Card**
- An **AI mark** flags **AI text** in a **Note** or a **Card**; a whole **Part** and a paragraph wear
  different marks

## Flagged ambiguities

- "section" meant both a top part of the app and a heading with its text in a **Note**. Resolved:
  the app has **Sections**; a **Note** has **Parts**. (Danish "afsnit" means both paragraph and
  section, so the Danish term is "del".)
- "reference" meant both the book a user reads ("core reference") and the pointer in prose.
  Resolved: the book is a **Source**; "reference" is kept for the pointer in prose.
- "article" names a kind of **Source** that the user reads. A **Blog post** is what the user writes,
  and is never called an article.
- "assignment" alone could mean any **Writing project**. Resolved: the type is a **University
  assignment**; a Writing project is never called an assignment.
- "reading quiz" and "recall quiz" shared a word though they have different goals. Resolved: the
  Reading **Stage** conversation is a **Probe**; answering a due **Card** is a **Review**.

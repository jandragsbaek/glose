# Glose

A desktop app for learning from what you read and for writing your own prose. This glossary is
its ubiquitous language: use these terms in code, tests, issues, PRs and commits.

## Language

**Graph**:
All **Notes** and the **Links** between them. Also the **Section** that holds them.
_Avoid_: vault, library, knowledge base, collection, zettelkasten

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

**Rich note**:
A **Note** about one subject, such as an author or a work, that may be long and hold images.

**Link**:
A wikilink (`[[note name]]`) from one **Note** to another. **Links**, not folders, give the
**Graph** its structure.
_Avoid_: edge, connection, relation, backlink

**Source**:
The book, video or other work that a **Note** comes from, with its bibliographic data.
_Avoid_: core reference, reference, book (as the general term), material

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

**Probe**:
A **Session** in the Reading **Stage**, once per **Source**, in which the AI adapts its questions
to find what the user knows and does not know.
_Avoid_: reading quiz, quiz, measure, test, exam, assessment

**Reasoning**:
The user's own words, typed or transcribed, that show how they reached an answer in a **Probe**.
_Avoid_: explanation, thinking, working, rationale, chain of thought

**Writing project**:
A set of prose files that the user writes, outside the **Graph**, that ends in one
**Publication**. The AI never writes its prose.
_Avoid_: project (alone), document, draft, essay, assignment, manuscript

**Recall**:
The **Section** of **Cards** that spaced repetition (FSRS) schedules.
_Avoid_: drill, flashcards

**Card**:
One question and its answer in **Recall**, usually made from a **Note**.
_Avoid_: flashcard, item, question, prompt

**Review**:
One answer to one due **Card**. It sets when the **Card** comes back.
_Avoid_: recall quiz, drill

**AI text**:
Text in a **Note** or a **Card** that the AI wrote and the user has not yet rewritten.
_Avoid_: generated text, draft, suggestion, AI content

**AI mark**:
The marker in the Markdown that flags **AI text**.

**Publication**:
The finished form of a **Writing project**, such as a PDF or a blog post.
_Avoid_: output, export, build, artifact, render, deliverable

**Reference**:
A pointer in the prose of a **Writing project** to a **Note** or a **Source**, with a
**Location**.
_Avoid_: cite, link

**Location**:
The exact place in a **Source**, such as a page or a timestamp.
_Avoid_: locator, pinpoint, position, page (as the general term)

**Citation**:
The text the tool builds from a **Reference** in the style the **Writing project** uses.

## Relationships

- Every **Note** has a **Source**; **Links** join **Notes** into the **Graph**
- A new **Source** can be filled in from a **Catalog**; the **Source** file, not the **Catalog**,
  is the truth
- A **Probe** is a **Session**; the user's **Reasoning** in it is kept
- A **Writing project** reads from the **Graph** but is not part of it
- A **Reference** points to a **Note** or a **Source** at a **Location**; the tool builds a
  **Citation** from it
- A **Card** is usually made from a **Note** by **Extraction**; each **Review** sets when it comes
  back
- An **AI mark** flags **AI text** in a **Note** or a **Card**

## Flagged ambiguities

- "reference" meant both the book a user reads ("core reference") and the pointer in prose.
  Resolved: the book is a **Source**; "reference" is kept for the pointer in prose.
- "reading quiz" and "recall quiz" shared a word though they have different goals. Resolved: the
  Reading **Stage** conversation is a **Probe**; answering a due **Card** is a **Review**.

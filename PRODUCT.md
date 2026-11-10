# Product

<!-- impeccable:product-schema 1 -->

[docs/ideas.md](docs/ideas.md) holds the full product idea and its open questions;
[GLOSSARY.md](GLOSSARY.md) holds the terms. This file is the short product record that design
work starts from.

## Platform

web

An Electron desktop app for macOS and Windows with one design language on both. Details that
belong to the operating system (window controls, menu bar, keyboard shortcuts) follow each OS.
During development the same app runs in a plain browser on Linux and macOS nodes.

## Users

- **Now: two people.** Jan, whose primary language is English, uses Glose on Windows to practise
  writing and to publish to his own website/blog. His girlfriend, whose primary language is
  Danish, uses it on macOS for university study and assignments, most likely published as PDF.
- **Later: possibly the public.** A public release may come. Other readers and students must be
  able to understand Glose without either of its first users explaining it.
- **The job:** read a book (or watch a video), understand it, keep what matters from it, and later
  write original prose that refers back to it correctly.

## Product Purpose

Glose helps a person learn from what they read and write their own prose. A **Source** becomes a
set of small, sourced **Notes** in the **Graph**; **Notes** become **Cards** that **Recall**
schedules; **Writing projects** draw on the **Graph** through exact **References** and end in a
**Publication**.

Success means the user understands and keeps what they read, the **Graph** fills with **Notes**
in the user's own words (fewer **AI marks** over time), and every **Publication** has correct
**Citations**.

## Positioning

- **The user does the thinking.** In a **Writing project** the AI references and suggests; it
  never writes the prose, and the agent has no tool that could.
- **AI text is visible debt.** Where the AI may write (**Notes**, **Cards**), its text carries an
  **AI mark** in the Markdown itself, and the goal is that the user rewrites all of it.
- **Every claim traces to a Source.** Every **Note** has a **Source**, so a **Reference** in prose
  can be followed back to an exact **Location** in the original work. **Citations** are built from
  source data; the citation style is a setting, not text in the prose.
- **Reasoning counts.** In a **Probe**, the user's **Reasoning** is part of the answer, and the AI
  judges it as well as the end result.
- **The files are the truth.** Plain Markdown on disk, readable in any other editor, easy to back
  up with Dropbox or git.

## Operating Context

- Three **Sections** with different AI rules: **Graph**, **Writing projects**, **Recall**.
- The work moves through **Stages**. Reading is defined (**Free text** → **Extraction** →
  **Probe**); Writing is to be described; more will follow.
- A **Probe** happens once per **Source** and adapts to the user's answers. A **Review** happens
  daily on due **Cards** and stays quick.
- Glose runs locally. There is no Glose account and no login screen: the app opens straight
  into the user's work.
- The AI runs agentic **Sessions** (it asks, reads the **Graph**, and acts through tools). Each
  user connects their own ChatGPT subscription for this; it is not a login to Glose. Every
  **Session** is recorded and kept.
- **Reasoning** is typed or dictated, then transcribed.
- Use happens at a desk on a laptop or desktop computer, in long, focused stretches of reading and
  writing, and in short daily **Reviews**.

## Capabilities and Constraints

- **Every string is translated.** The interface ships in English and Danish, and the user
  selects the language. No user-facing string is hard-coded: labels, buttons, messages, errors,
  empty states, menus, dialogs, tooltips, accessible names, dates, numbers and plurals all go
  through translation from the first feature on. Both languages are first-class; neither is a
  late translation of the other.
- **Layouts take both languages.** Danish labels are often longer than English ones (compound
  words). No layout may depend on the length of the English text.
- **Content is in any language.** **Notes**, **Cards** and **Writing projects** may be in English,
  Danish or another language, independent of the interface language. _(Inferred: a **Probe** and
  dictated **Reasoning** must work in both Danish and English. To be confirmed.)_
- File names must be safe on macOS, Windows and Linux.
- Undecided product facts (AI-mark granularity, the reference style, the Writing **Stage**, card
  and note sync, and more) are listed under "Open questions" in docs/ideas.md. Do not design
  them as decided.

## Brand Commitments

- Name: **Glose**.
- `assets/icon.svg` (a white "G" on a pink square) is a placeholder, not a brand asset.
- The interface today is an unstyled placeholder. Jan designs it from the ground up: every visual
  choice (layout, color, type, window chrome, icons) goes to him for a decision.
- Voice: not decided.

## Evidence on Hand

None yet: no real **Notes**, **Sources**, screenshots, users or reviews. Design work must use
clearly labelled sample content and must not invent testimonials, users or usage figures.

## Product Principles

1. **Thinking stays with the user.** The AI questions, references and suggests; the user's own
   words are the goal.
2. **Traceable by default.** Every **Note** has a **Source**; every **Reference** has a
   **Location**; AI text is always marked.
3. **The files are the truth.** Nothing the app shows may exist only inside the app.
4. **Two languages, equal.** Danish and English are both primary from the first string.
5. **Built for two, clear to strangers.** Fit the first two users closely, but never depend on
   knowledge only they have.

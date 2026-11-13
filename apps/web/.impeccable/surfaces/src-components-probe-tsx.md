---
version: 1
slug: "src-components-probe-tsx"
primary_target: "src/components/Probe.tsx"
related_targets: ["src/routes/sources.$sourceId.tsx", "src/components/StepBar.tsx"]
---

# The Probe

Mode: Operate. The third Reading step, at `/sources/<Source>` while the Source's `reading-step` is
`probe`: one adaptive Session per Source in which the AI questions, judges Reasoning and result
apart, teaches a gap, and asks again. It works from all three starts (`reading-start`: `write`,
`probe`, `catch-up`).

Audience and task: a reader at a desk, in one long focused stretch, answering one question at a
time in their own words, typed or with the computer's dictation. Success: they see exactly where
their thinking went wrong, learn that part, and leave with what they know and what is still open,
kept in `Probes/<Source>.md`.

Chosen by Jan with impeccable (Nov 2026), "The Glossed Transcript", over a topic register beside
the Session and a Review-like focus screen with one question leaf.

## Direction contract

THESIS: The conversation is the page, read like a tutor's marked script: your words in the column,
the judgment in the margin beside them. It refuses the chat-bubble thread and the quiz card.

OWN-WORLD: Glose's Call Numbers world unchanged. A Paper leaf under a Ground band with the step
bar; the user's turns on Ground boxes; the judgment gloss as a hairline margin note with a lapis
uppercase head; verdicts as a Verdigris check or a Rubric triangle with words; teaching as the
§ AI-text mark; the offending words of the Reasoning underlined in a faint rubric wash.

STORY: The reader answers, sees Reasoning and result judged apart, reads what the AI taught
about the exact gap, answers again, and finishes with what the Probe found and the way on.

FIRST VIEWPORT: Page head with title, call number, Free text (quiet) and Finish the Probe
(secondary). A Ground band: step bar left, tally right. The transcript centred, 680px column
plus 300px gloss margin. The answer box fixed at the foot: Reasoning left, answer and Send right.

FORM: Glossed transcript, position 6 of 7 on the ordered list (dealt lead). seed:0afa6408cb1dc351

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Transcription: the ChatGPT plan route refuses the transcription API, so dictation is the
  computer's own (macOS dictation, Windows voice typing). An in-app recorder needs another
  transcriber (a local model, or an API key) and Jan's decision.
- The first page of a Source that writes `reading-start` is built in the book-processing thread.

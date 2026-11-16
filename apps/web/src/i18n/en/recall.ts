import {
  ANSWER_WORDS,
  type CheckId,
  type Grade,
  type JudgeState,
  type ProposalState,
  QUESTION_WORDS,
  type Verdict,
} from "@glose/contracts";
import { formatInterval } from "../../domain/interval.ts";
import { numbers, count, clockTime } from "./format.ts";

export const recallMessages = {
  recall: {
    title: "Recall",
    empty:
      "Recall asks you about Cards made from your Notes and schedules each one with FSRS. To make Cards, open a Note in the Graph and choose Make Cards.",
    counts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "Card", "Cards")
        : `${count(cards, "Card", "Cards")} · ${numbers.format(ai)} with AI text`,
    findLabel: "Find Cards",
    matches: (n: number) => `${count(n, "Card matches", "Cards match")}.`,
    clearSearch: "Clear the search",
    shown: (shown: number, total: number) =>
      `Showing ${numbers.format(shown)} of ${count(total, "Card", "Cards")}.`,
    showMore: "Show more",
    nothingFound: "No Card matches.",
    cardCount: (n: number) => count(n, "Card", "Cards"),
    trays: { fix: "To fix", ai: "To rewrite", good: "Good" },
    fixEmptyTitle: "Nothing to fix",
    fixEmpty: "Every Card passes its Checks.",
    aiEmptyTitle: "Nothing to rewrite",
    aiEmpty: "No good Card has AI text left.",
    goodEmpty: "A Card comes here when it passes its Checks and is in your own words.",
    goodFolded: (n: number) => `${count(n, "good Card", "good Cards")} in your own words`,
    goodFoldedBody: "Nothing to do here. Show them to read or edit one.",
    showGood: "Show the good Cards",
    foldGood: "Fold",
    moreFaults: (n: number) => `${numbers.format(n)} more`,
    card: "Card",
    close: "Close",
  },
  review: {
    title: "Review",
    counts: (counts: {
      readonly new: number;
      readonly learning: number;
      readonly review: number;
    }) =>
      `${numbers.format(counts.new)} new · ${numbers.format(counts.learning)} learning · ${numbers.format(counts.review)} due`,
    states: { new: "New Card", learning: "Learning", review: "Due" },
    showAnswer: "Show answer",
    didRecall: "Did you recall it?",
    forgot: "Forgot",
    recalled: "Recalled",
    howWasIt: "How did it go?",
    efforts: { hard: "With effort", good: "Normal", easy: "At once" },
    back: "Back",
    interval: (ms: number) => formatInterval("en", ms),
    start: "Start Review",
    dueToday: (n: number) => `${count(n, "Card", "Cards")} to review today`,
    left: (n: number) => `${numbers.format(n)} left`,
    stop: "Stop",
    keys: { space: "Space", escape: "Esc", backspace: "Backspace" },
    waitTitle: "Nothing to review right now",
    nextAt: (at: number) => `A Card in learning comes back at ${clockTime.format(at)}.`,
    doneTitle: "Done for today",
    doneToday: "You reviewed every Card due today. More come back tomorrow.",
    backToRecall: "Back to Recall",
    failed: "Glose could not keep this Review. Try again.",
  },
  cards: {
    extraction: "Card Extraction",
    title: "Cards",
    start: "Make Cards from the whole Note",
    startPassage: "Make Cards from the passage",
    startHint:
      "The AI reads the Note and proposes Cards. You keep, edit or drop each one. A kept Card is marked as AI text until you rewrite it in your own words.",
    needsChatGpt: "Card Extraction needs ChatGPT",
    needsChatGptBody:
      "Connect your ChatGPT plan in Settings, then come back to this Note. You can still write your own Cards.",
    noteNotFound: "This Note does not exist. Its Markdown file may have been renamed or deleted.",
    backToGraph: "Back to the Graph",
    openInGraph: "Open in the Graph",
    passage: "Passage",
    passageHint:
      "To make Cards from part of the Note, select the text above and choose Use the selected text.",
    useSelection: "Use the selected text",
    noSelection: "Select text in the Note first.",
    clearPassage: "Remove the passage",
    sendPassage: "Make Cards from the passage",
    proposals: "Proposed Cards",
    question: "Question",
    answer: "Answer",
    keep: "Keep",
    edit: "Edit",
    drop: "Drop",
    save: "Save",
    cancel: "Cancel",
    states: {
      open: "Proposed",
      kept: "Kept",
      dropped: "Dropped",
    } satisfies Record<ProposalState, string>,
    keepFailed: "Glose could not save the Card. Try again.",
    fromNote: (n: number) => (n === 0 ? "No Cards from this Note yet." : count(n, "Card", "Cards")),
    write: "Write your own Card",
    writeHint: "A Card in your own words has no AI mark.",
    add: "Add Card",
    saveFailed: "Glose could not save the Card. Try again.",
    from: "From",
    fromNone: "From no Note",
    rewrote: "I rewrote it",
    rewroteHint:
      "Removes the AI mark. Choose this when the question and answer are in your own words.",
    delete: "Delete",
    deleteConfirm: "Delete this Card? Glose removes its file from the Cards folder.",
    file: (file: string) => `Cards/${file}.md`,
  },
  score: {
    label: "Checks",
    grades: {
      good: "Good Card",
      fix: "Could be better",
      poor: "Needs work",
    } satisfies Record<Grade, string>,
    judge: {
      done: "",
      pending: "The AI is checking this Card.",
      off: "Connect ChatGPT in Settings to get the AI Checks too.",
      failed: "The AI could not check this Card. Glose tries again later.",
    } satisfies Record<JudgeState, string>,
    verdicts: {
      pass: "Passes",
      warn: "Warning",
      fail: "Fails",
    } satisfies Record<Verdict, string>,
    passed: (n: number) => `${count(n, "Check", "Checks")} passed`,
    ai: "AI Check",
    aiHint:
      "The AI Checks are advice. In tests, AI judges agree with people on about two Cards in three.",
    rulesWhileTyping: "Checks while you write",
    checks: {
      "has-answer": {
        name: "Has an answer",
        tip: "Write the answer, so that a Review can check what you recall.",
      },
      recall: {
        name: "Asks you to recall, not to choose",
        tip: "You can guess a yes, a no or a choice. Ask what, why or how.",
      },
      "not-broad": {
        name: "Asks for one answer, not an essay",
        tip: "Explain or Describe asks for an essay. Ask for one thing that you can recall.",
      },
      concise: {
        name: "Short",
        tip: `Keep the question under ${QUESTION_WORDS} words and the answer under ${ANSWER_WORDS}. Split a longer Card.`,
      },
      "no-list": {
        name: "No list to recite",
        tip: "A list is hard to recall as one Card. Make one Card for each item, or one for the idea that joins them.",
      },
      "no-giveaway": {
        name: "Does not give the answer away",
        tip: "Most words of the answer are in the question. Ask so that you must recall them.",
      },
      distinct: {
        name: "Cannot be confused with another Card",
        tip: "Another Card from this Note asks almost the same. Make the questions different, or join the Cards.",
      },
      "one-answer": {
        name: "One exact answer",
        tip: "The question must have one correct answer: the answer on this Card.",
      },
      specific: {
        name: "Precise, not broad or vague",
        tip: "Say exactly what to recall.",
      },
      "self-contained": {
        name: "Clear without the Note",
        tip: "Name the subject, so that the Card is clear months from now.",
      },
      "one-idea": {
        name: "One idea",
        tip: "Ask for one fact or one idea. Split the Card.",
      },
      "true-to-note": {
        name: "True to its Note",
        tip: "The answer must be in the Note, with no added facts.",
      },
    } satisfies Record<CheckId, { readonly name: string; readonly tip: string }>,
  },
};

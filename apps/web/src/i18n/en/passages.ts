import { isPageNumber } from "@glose/contracts";

import { count, numbers } from "./format.ts";

export const passageMessages = {
  passages: {
    writeKey: "W",
    openPassage: "Open the book's Passages",
    stepNote: (n: number, last: string | null) =>
      n === 0
        ? "after each sitting"
        : last === null
          ? count(n, "Passage", "Passages")
          : `${count(n, "Passage", "Passages")} · to ${last}`,
    page: (page: string) => (isPageNumber(page) ? `p. ${page}` : page),
    keys: "Ctrl+Enter keeps · X chooses · W writes a Note",
    open: "Passages",
    back: "Back to the step",
    pages: "Pages",
    band: (from: number, to: number) => `pp. ${from}–${to}`,
    otherBand: "No page number",
    unusedOnly: "Unused only",
    empty: "No Passages yet. Copy the words that matter from your copy into the line below.",
    emptyUnused: "Every Passage is in a Note.",
    choose: (page: string) => `Choose the Passage on ${page}`,
    chooseNoPage: "Choose the Passage",
    yourWords: "Your words on it",
    inNotes: (n: number) => (n === 1 ? "In 1 Note:" : `In ${numbers.format(n)} Notes:`),
    onDesk: (n: number) => `On the desk · [${numbers.format(n)}]`,
    noPage: "No page: a Writing project cannot cite it",
    edit: "Edit",
    remove: "Delete",
    removeUsed: "A Note cites it, so it stays.",
    removeAsk: "Delete this Passage?",
    keepIt: "Keep it",
    save: "Save",
    cancel: "Cancel",
    usedBy: (n: number) =>
      `Used in ${count(n, "Note", "Notes")}: saving changes the words in ${n === 1 ? "its footnote" : "their footnotes"} too.`,
    failed: "Glose could not save the Passage. Try again.",
    capture: {
      title: "Next Passage",
      page: "Page",
      pageHint: "A page, a range or an e-reader location",
      carried: "as before",
      lastTime: (page: string) => `Last time: ${page}`,
      words: "The words, from your copy",
      wordsHint: "Copy them exactly: a Writing project quotes them as they stand.",
      yourWords: "Your words on it (optional)",
      keep: "Keep",
      keeping: "Keeping…",
      draft: "Saved as a draft while you type",
      asPage: (location: string) => `Use ${location} as the page`,
      pasteNamed: (location: string) => `The paste names ${location}.`,
      joinLines: "Join the lines",
      broken: "The paste has broken lines.",
      again: (day: string) => `You kept these words already (${day}). Keep them again?`,
    },
    desk: {
      title: "Write a Note",
      meta: (n: number) => `from ${count(n, "Passage", "Passages")}, in your words`,
      close: "Close",
      titleLabel: "The Note's title",
      titlePlaceholder: "What do you take from this, in one sentence?",
      restsOn: "Rests on",
      text: "In your words",
      textPlaceholder: "What do you take from these words, and why does it hold?",
      page: "Page of the Note",
      draft: "not in your Note yet",
      takeIn: "Take it in",
      askDraft: "Ask the AI for a draft",
      drafting: "The AI writes a draft…",
      findLinks: "Find Links",
      finding: "The AI looks for Notes to link…",
      linksRequest:
        "Which Notes in my Graph should this Note link to? Say whether it repeats or pulls against one.",
      linkHand: "Or type [[ in your words to link by hand.",
      needsTitle:
        "Write the title first: the AI drafts from your claim, not from the Passage alone.",
      needsChatGpt: "The AI's draft and Links need ChatGPT. You can write and save without it.",
      save: "Save Note",
      saving: "Saving…",
      next: (page: string) => `Then the desk closes, at ${page}`,
      discard: "Discard what you wrote?",
      discardYes: "Discard",
      discardNo: "Keep writing",
    },
    end: {
      title: "Done reading",
      summary: (passages: number, used: number, words: number) =>
        [
          count(passages, "Passage", "Passages"),
          `${numbers.format(used)} in Notes`,
          words === 0 ? null : `Free text ${count(words, "word", "words")}`,
        ]
          .filter((part) => part !== null)
          .join(" · "),
      hint: (unused: number) =>
        unused === 0
          ? "Extraction proposes the book's core points, then the Probe questions you."
          : `Extraction starts with the ${count(unused, "Passage", "Passages")} you have not used, then the Probe questions you.`,
      go: "Continue to Extraction",
      failed: "Glose could not save the step. Try again.",
    },
    marginRule:
      "Write Notes as you go. When you finish the book, Extraction starts with the Passages you have not used.",
    freeTextHint: "What you think of the book so far, in your own words. This is your Free text.",
  },
};

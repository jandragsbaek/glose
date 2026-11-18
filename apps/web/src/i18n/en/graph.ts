import { numbers, count, list } from "./format.ts";

import type { ArticleType, PageProblem, ResearchAsk, Stance } from "@glose/contracts";

export const graphMessages = {
  graph: {
    title: "Graph",
    empty:
      "The Graph holds your Notes and the Links between them. It stays empty until Extraction makes the first Notes from a Source.",
    counts: (notes: number, sources: number, links: number) =>
      [
        count(notes, "Note", "Notes"),
        count(sources, "Source", "Sources"),
        count(links, "Link", "Links"),
      ].join(" · "),
    canvasLabel: (notes: number, links: number, ai = 0) =>
      `The Graph: ${count(notes, "node", "nodes")} joined by ${count(links, "Link", "Links")}.${ai === 0 ? "" : ` ${count(ai, "Note holds", "Notes hold")} AI text.`} The panel beside it lists the same Sources and Notes.`,
    findLabel: "Find in the Graph",
    findPlaceholder: "Find a Note or Source",
    found: (n: number) => (n === 0 ? "Nothing found" : `${numbers.format(n)} found`),
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Show the whole Graph",
    help: "Scroll or pinch to zoom, and drag the background to move. Drag a node to pull on its Links. Click a node to read it here. Double-click a Note, or select it and press Enter on the Graph, to rewrite or edit it; a Source opens instead.",
    sources: "Sources",
    note: "Note",
    source: "Source",
    close: "Close",
    noSource: "This Note names no Source yet.",
    linkCount: (n: number) => count(n, "Link", "Links"),
    noLinks: "No Links yet.",
    notesFromSource: "Notes from this Source",
    openSource: "Open the Source",
    missingLink: (name: string) => `No file is named ${name} yet.`,
    makeCards: "Make Cards",
    cardCount: (n: number) => (n === 0 ? "No Cards yet" : count(n, "Card", "Cards")),
    rewrite: "Rewrite in your words",
    edit: "Edit",
    toRewrite: "To rewrite",
    toRewriteHelp:
      "These Notes still hold AI text. On the Graph they are hollow rings: double-click one to write it in your words.",
    noteCount: (n: number) => count(n, "Note", "Notes"),
    aiKey: (n: number) => `${count(n, "Note holds", "Notes hold")} AI text`,
    aiKeyHint: "Show only the Notes with AI text",
    aiKeyLabel: (n: number) =>
      `${count(n, "Note holds", "Notes hold")} AI text. Show only the Notes with AI text`,
    allYours: "Every Note is in your words",
    holdsAi: "holds AI text",
  },
  rewrite: {
    titleAi: "Rewrite the Note",
    titleOwn: "Edit the Note",
    aiColumn: "What the AI wrote",
    yourColumn: "In your words",
    titleLabel: "Title",
    titleYours: "The title in your words",
    titlePlaceholder: "The claim in your words, as a full sentence",
    textLabel: "Text",
    yoursLabel: "Your words in place of this AI text",
    yoursPlaceholder:
      "Say it again as you understand it. Leave this empty to keep the AI text, marked.",
    headingLabel: "The Part's heading in your words",
    headingPlaceholder: "Heading",
    correct: "Correct the AI text",
    undoCorrect: "Undo",
    stillMarked: "stays marked",
    replaces: "Yours. It replaces the AI text when you save.",
    page: "Page",
    renames: (notes: number, sources: number, cards: number) => {
      const linking = [
        notes > 0 ? count(notes, "Note", "Notes") : null,
        sources > 0 ? count(sources, "Source", "Sources") : null,
        cards > 0 ? count(cards, "Card", "Cards") : null,
      ].filter((part) => part !== null);
      return linking.length === 0
        ? "A new title renames the Note's file."
        : `A new title renames the Note's file. The links in ${list.format(linking)} follow it.`;
    },
    noTitle: "A Note needs a title.",
    nameTaken: (name: string) =>
      `Your Graph already has a file named “${name}”. Choose another title.`,
    progress: (done: number, total: number) =>
      `${numbers.format(done)} of ${numbers.format(total)} in your words`,
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    discardQuestion: "Discard what you wrote?",
    discard: "Discard",
    keepWriting: "Keep writing",
    saveFailed: "Glose could not save the Note. Try again.",
  },
  newNote: {
    key: "N",
    open: "New Note",
    title: "New Note",
    meta: "A Note in your Graph, in your words",
    titleLabel: "Title",
    titlePlaceholder: "The idea, claim or question, as a full sentence",
    restsOn: "Rests on",
    restsOnLabel: "The Source this Note rests on",
    noSource: "No Source yet",
    noSourceHint:
      "Keep a page from the research to give the Note a Source, or save it without one.",
    textLabel: "In your words",
    textPlaceholder: "Write what you understand. The AI does not write here.",
    quotes: "Kept quotes",
    quotesEmpty:
      "When you keep a page from the research, its quotes come here. Choose a quote's number to cite it where the cursor is.",
    cite: (n: number) => `Cite quote ${numbers.format(n)} where the cursor is`,
    paragraph: (n: number) => `¶ ${numbers.format(n)}`,
    wordForWord: "Word for word",
    wordForWordHint: "Glose found these exact words on the page.",
    citedIn: (n: number) => `Cites quote ${numbers.format(n)}`,
    citesMissing: (cited: ReadonlyArray<number>) =>
      `Your text cites ${cited.length === 1 ? "quote" : "quotes"} ${list.format(cited.map((n) => numbers.format(n)))}, which you no longer keep. Keep the page again, or take the ${cited.length === 1 ? "number" : "numbers"} out of the text.`,
    links: "Links",
    linksHint: "Notes the AI found in your Graph. Checked ones are linked from the Note.",
    becomesSources: (n: number) =>
      n === 0
        ? ""
        : `${count(n, "kept page becomes a Source", "kept pages become Sources")} when you save.`,
    save: "Save Note",
    saving: "Saving…",
    pageProblems: {
      "not-kept":
        "A quote or the Source comes from a page you no longer keep. Keep it again, or remove the quote.",
      unreadable:
        "Glose could not read one of the kept pages again to store it. Try again, or drop that page.",
      "quote-gone":
        "A quote is no longer on its page, so Glose cannot store it. Remove the quote, or drop that page.",
    } satisfies Record<PageProblem, string>,
    draftNode: "New Note",
  },
  research: {
    title: "Research",
    meta: "with the AI",
    intro: "The AI finds web pages and exact quotes, and Notes to link. You write the Note.",
    askLegend: "Ask the AI to",
    asks: {
      learn: "Learn this",
      back: "Back my idea",
      check: "Check this claim",
      bridge: "Bridge two Notes",
    } satisfies Record<ResearchAsk, string>,
    askHints: {
      learn: "Clear, reliable pages that explain the topic.",
      back: "Pages that support your idea, and pages that pull against it.",
      check: "The strongest evidence on both sides of the claim.",
      bridge: "What connects two of your Notes.",
    } satisfies Record<ResearchAsk, string>,
    questionLabel: "Your question",
    questionHint: "Optional. What do you want to find out?",
    bridgeFrom: "First Note",
    bridgeTo: "Second Note",
    bridgePlaceholder: "Name of a Note",
    bridgeMissing: "Choose two Notes from your Graph.",
    needsTitle: "Write a title or a few words first, so the AI knows what to look for.",
    start: "Find sources",
    again: "Search again",
    needsChatGpt: "Research needs ChatGPT",
    needsChatGptBody: "Connect your ChatGPT plan in Settings. You can write the Note without it.",
    startFailed: "Glose could not start the research. Try again.",
    youAsked: (ask: string) => `You asked: ${ask}`,
    stances: {
      supports: "Supports",
      "pulls-against": "Pulls against",
      context: "Context",
    } satisfies Record<Stance, string>,
    kinds: {
      paper: "Academic paper",
      web: "Web essay",
      press: "Magazine or newspaper",
    } satisfies Record<ArticleType, string>,
    keep: "Keep",
    kept: "Kept",
    drop: "Drop",
    dropped: "Dropped",
    keepAgain: "Keep after all",
    unkeep: "Remove",
    moreQuotes: (n: number) => `and ${count(n, "more quote", "more quotes")} from this page`,
    youHave: "You have this Source",
    openPage: "Open the page",
    pagesProposed: (n: number) => `Found ${count(n, "page", "pages")}`,
    linksProposed: (n: number) => `Proposed ${count(n, "Link", "Links")}`,
    webSearchOff:
      "Web search is not available for your ChatGPT account. Paste the address of a page in the message box, and the AI reads it.",
    placeholder: "Ask about these pages, or paste a page's address",
    decideFailed: "Glose could not save your choice. Try again.",
  },
};

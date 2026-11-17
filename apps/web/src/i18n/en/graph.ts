import { numbers, count, list } from "./format.ts";

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
};

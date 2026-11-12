import type {
  ChatGptProblem,
  GraphFolderAction,
  GraphFolderUnavailable,
  CheckId,
  Grade,
  JudgeState,
  PointState,
  ProposalState,
  ReadingStep,
  SessionProblem,
  SessionTool,
  Verdict,
} from "@glose/contracts";
import { ANSWER_WORDS, QUESTION_WORDS } from "@glose/contracts";

import { formatInterval } from "../domain/interval.ts";

const numbers = new Intl.NumberFormat("en");
const plurals = new Intl.PluralRules("en");
const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
const list = new Intl.ListFormat("en", { type: "conjunction" });
const clockTime = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });
const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** The English catalog. Its shape is the type every other catalog must match. */
export const en = {
  app: {
    name: "Glose",
    mark: "GLO",
  },
  nav: {
    label: "Sections",
    today: "Today",
    graph: "Graph",
    writingProjects: "Writing projects",
    recall: "Recall",
    settings: "Settings",
    language: "Interface language",
  },
  languages: {
    en: "English",
    da: "Dansk",
  },
  languageCodes: {
    en: "EN",
    da: "DA",
  },
  common: {
    retry: "Try again",
    optional: "optional",
    loading: "Loading",
  },
  errors: {
    storage: "Glose could not read or write its files.",
    storageRecovery:
      "Check that the Graph folder still exists and that Glose may write to it. Then try again.",
    unexpected: "Something went wrong in Glose. Try again.",
    notFoundTitle: "Page not found",
    notFound: "This page does not exist in Glose.",
    sourceNotFound:
      "This Source does not exist. Its Markdown file may have been renamed or deleted.",
    backToToday: "Back to Today",
  },
  setup: {
    title: "Welcome to Glose",
    intro:
      "Three choices, then Glose opens on Today. Nothing leaves your computer except what you send to ChatGPT later.",
    languageStep: "Language",
    languageHint:
      "The language of the interface. Notes and Writing projects can be in any language. You can change this later in Settings.",
    folderStep: "Graph folder",
    folderHint:
      "Glose keeps every Source and Note as a Markdown file in this folder, and its own settings in a hidden .glose folder inside it. Move the folder, or share it through Dropbox or git, and the Graph goes with it.",
    folderActions: {
      create: "Start a new Graph",
      open: "Open an existing folder",
    } satisfies Record<GraphFolderAction, string>,
    folderActionHints: {
      create: "Glose creates an empty folder at this path.",
      open: "A Graph that you moved or that someone shares with you, or a folder of Markdown files.",
    } satisfies Record<GraphFolderAction, string>,
    folderLabel: "Folder path",
    chatgptStep: "ChatGPT",
    chatgptHint:
      "Optional. You can also connect later in Settings. Without ChatGPT you can still add Sources and write Free text.",
    submit: "Start using Glose",
    folderErrors: {
      "not-absolute": "Write the full path of the folder, starting from the top of the disk.",
      "not-a-folder": "This path is a file, not a folder. Choose a folder.",
      "not-found": "There is no folder at this path. To make one, choose Start a new Graph.",
      "not-empty":
        "This folder already holds files. To use them in Glose, choose Open an existing folder.",
      "not-writable": "Glose cannot write to this folder. Choose a folder that you may write to.",
    } satisfies Record<GraphFolderUnavailable["reason"], string>,
  },
  today: {
    title: "Today",
    date: (date: Date) => longDate.format(date),
    addSource: "Add Source",
    inProgress: "Source in progress",
    continue: {
      "free-text": "Continue Free text",
      extraction: "Continue Extraction",
      probe: "Continue Probe",
      done: "Open Source",
    } satisfies Record<ReadingStep, string>,
    alsoInProgress: "Also in progress",
    open: "Open",
    noSourceTitle: "Add the book you are reading",
    noSourceBody:
      "Every Note starts from a Source. Add one, write freely about it, and Glose helps you turn it into Notes.",
    notesNear: "Notes near current work",
    notesNearEmpty:
      "Notes from the Source in progress, and the Notes they link to, appear here. Notes come from Extraction.",
    recall: "Recall",
    recallEmpty:
      "No Cards yet. Open a Note in the Graph and choose Make Cards. Recall will schedule them for Review.",
    recallCounts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "Card", "Cards")
        : `${count(cards, "Card", "Cards")}, ${numbers.format(ai)} with AI text`,
    openRecall: "Open Recall",
    writingProject: "Writing project",
    writingEmpty: "No Writing projects yet. They come in a later version of Glose.",
    aiText: "Notes with AI text",
    aiTextEmpty:
      "No AI text. When the AI writes a Note, the Note shows here until you rewrite it in your own words.",
    aiTextCount: (n: number) => count(n, "Note", "Notes"),
    aiTextMore: (n: number) => `${count(n, "more Note", "more Notes")} in the Graph.`,
  },
  steps: {
    label: "Reading Stage",
    names: {
      "free-text": "Free text",
      extraction: "Extraction",
      probe: "Probe",
    },
    done: "done",
    current: "current step",
    words: (n: number) => count(n, "word", "words"),
    noFreeText: "skipped",
    withChatGpt: "with ChatGPT",
    later: "comes later",
  },
  source: {
    firstPublished: (year: number) => `first published ${year}`,
    callNumberLabel: (callNumber: string) => `Call number ${callNumber}`,
    page: (page: string) => `p. ${page}`,
    missingTitle: "Missing for a correct Citation",
    missing: {
      firstPublished: "The year of first publication",
      publisher: "The publisher",
    },
    missingInline: {
      firstPublished: "the year of first publication",
      publisher: "the publisher",
    },
    missingLine: (missing: ReadonlyArray<string>) =>
      `Missing for a correct Citation: ${list.format(missing)}.`,
    howToFix: "How to add it",
    missingHowTo:
      "Add it to the Source's Markdown file in the Graph folder. Editing it in Glose comes in a later version.",
    details: "Bibliographic data",
    fields: {
      author: "Author",
      title: "Title",
      firstPublished: "First published",
      edition: "Edition",
      editionYear: "Edition year",
      publisher: "Publisher",
      translator: "Translator",
      file: "File",
    },
    fileName: (id: string) => `${id}.md`,
  },
  addSource: {
    title: "Add Source",
    find: "Find the book",
    findHint:
      "Search Open Library, an open book catalog. Choosing a book fills in the form below. An ISBN finds your exact edition.",
    searchLabel: "Title, author or ISBN",
    search: "Search",
    searching: "Searching Open Library",
    results: "Books in Open Library",
    noResults:
      "Open Library has no book that matches. Try other words, or fill in the form yourself.",
    unavailable:
      "Open Library did not answer. Check the internet connection, or fill in the form yourself.",
    resultEdition: (publisher: string | null, year: number | null) => {
      const parts = [publisher, year].filter((part) => part !== null);
      return parts.length === 0 ? "" : `Edition: ${parts.join(", ")}`;
    },
    partBreak: ". ",
    notYourCopy:
      "Not your copy? Search by the ISBN printed in your book to get that exact edition.",
    filledTitle: (title: string) => `Filled in from Open Library: ${title}`,
    filled:
      "Check the fields marked From Open Library against your copy. The title, publisher and edition year must be those of the book you read.",
    keptTyped: "Fields you typed yourself are kept.",
    undoFill: "Undo",
    fromCatalog: "From Open Library",
    intro:
      "A book you are reading or have read. A Citation needs complete data, so fill in what you have. Glose shows what is missing.",
    author: "Author",
    work: "Work",
    familyName: "Family name",
    givenName: "Given name",
    titleField: "Title",
    firstPublished: "First published",
    firstPublishedHint: "The year the work first came out, for example 1958.",
    edition: "Edition",
    editionHint: "As printed in your copy, for example 2nd.",
    editionYear: "Edition year",
    publisher: "Publisher",
    translator: "Translator",
    yearInvalid: "Write the year as digits, for example 1958.",
    submit: "Add Source",
    cancel: "Cancel",
    nameTaken: (fileName: string) =>
      `The Graph folder already has a file named "${fileName}". Change the title, or open the existing Source.`,
  },
  reading: {
    freeText: "Free text",
    freeTextHint:
      "Write freely about the book in your own words: what stayed with you, what you doubt, what you want to understand. This step is optional.",
    freeTextLabel: "Free text about this Source",
    save: "Save",
    saving: "Saving",
    saved: "Saved",
    unsaved: "Not saved",
    finish: "Finish Free text",
    skip: "Skip Free text",
    finished: "Free text is finished. You can still change it.",
    nextStep: "Next step",
  },
  chatgpt: {
    title: "ChatGPT",
    intro:
      "Extraction and the Probe use your own ChatGPT plan. Glose has no account of its own: ChatGPT asks you to allow Glose to use your plan, and counts the usage there.",
    continue: "Continue with ChatGPT",
    lastAccount: (email: string) => `Last used with ${email}.`,
    otherAccount: "Use another ChatGPT account",
    connecting: "Waiting for ChatGPT",
    connectingHint:
      "Glose opened ChatGPT in your browser. Sign in there and allow Glose to use your plan, then come back here.",
    openAgain: "Open the ChatGPT page again",
    cancel: "Cancel",
    connected: (email: string) => `Connected as ${email}.`,
    usingPlan: "Using ChatGPT plan",
    manageUsage: "Manage usage",
    disconnect: "Disconnect",
    disconnectUnconfirmed:
      "Glose forgot the sign-in, but ChatGPT did not confirm that it ended it. To be sure, disconnect Glose in ChatGPT's settings.",
    planNotAllowedTitle: "Glose may not use your ChatGPT plan",
    planNotAllowed:
      "You signed in, but did not allow Glose to use your ChatGPT plan. The AI cannot work without it.",
    allowPlan: "Allow plan use",
    unknown: "Glose cannot see the ChatGPT connection right now.",
    problems: {
      declined: "You declined in ChatGPT, so Glose is not connected.",
      "port-busy":
        "Another program is signing in to ChatGPT at the same time, perhaps Codex. Finish or close that sign-in, then try again.",
      "timed-out": "The sign-in took too long. Try again.",
      "other-account":
        "The browser signed in to another ChatGPT account. Try again with the same account, or choose Use another ChatGPT account.",
      expired:
        "The ChatGPT sign-in no longer works. It may have expired, or Glose was disconnected in ChatGPT. Sign in again.",
      failed: "The sign-in did not work. Try again.",
    } satisfies Record<ChatGptProblem, string>,
    noticeTitle: "You're using your ChatGPT plan",
    noticeBody:
      "The AI in Glose now uses your ChatGPT plan. You can see and limit its usage in ChatGPT's settings.",
    gotIt: "Got it",
  },
  session: {
    needsChatGpt: "Extraction needs ChatGPT",
    needsChatGptBody: "Connect your ChatGPT plan in Settings, then come back to this Source.",
    openSettings: "Open Settings",
    transcript: "Session",
    you: "You",
    ai: "AI",
    tools: {
      "read-source": "The AI read this Source and your Free text.",
      "list-sources": "The AI looked at the list of your Sources.",
      "read-note": "The AI read a Note.",
      "list-cards": "The AI looked at the Cards this Note already has.",
      "search-graph": "The AI searched your Graph.",
    } satisfies Record<SessionTool, string>,
    /** One line of what the AI read; a Note's name follows `readNote` as a link. */
    trail: {
      readSource: "Read the Source and your Free text",
      listSources: "Looked at your Sources",
      readNote: "Read",
      listCards: "Looked at the Note's Cards",
      searchGraph: (query: string) => `Searched your Graph for “${query}”`,
    },
    /** What the AI read in one turn, in one line. */
    trailSummary: (read: {
      readonly freeText: boolean;
      readonly notes: number;
      readonly searches: number;
      readonly sources: boolean;
      readonly cards: boolean;
    }) => {
      const things = [
        ...(read.freeText ? ["your Free text"] : []),
        ...(read.notes > 0 ? [count(read.notes, "Note", "Notes")] : []),
        ...(read.sources ? ["your Sources"] : []),
        ...(read.cards ? ["the Note's Cards"] : []),
      ];
      const searched =
        read.searches === 0
          ? null
          : read.searches === 1
            ? "searched your Graph"
            : `searched your Graph ${numbers.format(read.searches)} times`;
      const line = [things.length === 0 ? null : `read ${list.format(things)}`, searched]
        .filter((part) => part !== null)
        .join(" · ");
      return line.charAt(0).toUpperCase() + line.slice(1);
    },
    /** What the AI does now, while it works. */
    live: (tool: SessionTool | null, detail: string | undefined) => {
      switch (tool) {
        case "read-source":
          return "Reading your Free text";
        case "list-sources":
          return "Looking at your Sources";
        case "read-note":
          return detail === undefined ? "Reading a Note" : `Reading ${detail}`;
        case "list-cards":
          return "Looking at the Note's Cards";
        case "search-graph":
          return detail === undefined
            ? "Searching your Graph"
            : `Searching your Graph for “${detail}”`;
        case null:
          return "Thinking";
      }
    },
    thought: (ms: number) =>
      ms < 1000 ? "Thought briefly" : `Thought for ${numbers.format(Math.round(ms / 1000))} s`,
    youAbout: (point: number) => `You · about ${numbers.format(point)}`,
    about: "About",
    clearAbout: "Talk about the whole Source",
    placeholder: "Answer, ask, or push back",
    sendKey: { mac: "⌘ ↵", other: "Ctrl ↵" },
    pointsProposed: (n: number) => `Proposed ${count(n, "point", "points")}`,
    pointAdded: "Added a point in your words",
    pointRef: (point: number) => `Point ${numbers.format(point)}`,
    passage: "Passage",
    messageLabel: "Your answer",
    messageHint: "Press Ctrl+Enter or Cmd+Enter to send.",
    send: "Send",
    stop: "Stop",
    retry: "Try again",
    model: (model: string) => `Model ${model}`,
    sendFailed: "Glose could not send your message. Try again.",
    problems: {
      "not-connected": "The ChatGPT connection does not work. Sign in again in Settings.",
      "plan-not-allowed":
        "Glose may not use your ChatGPT plan. Allow it in Settings, then try again.",
      "usage-limit":
        "Usage limit reached. Your ChatGPT plan, or the share you gave Glose, is used up for now. See the limits in ChatGPT's settings.",
      "not-eligible":
        "This ChatGPT account cannot use its plan in other apps. ChatGPT Plus and Pro can.",
      unavailable: "ChatGPT could not be reached. Try again in a moment.",
      failed: "The AI stopped with an error. Try again.",
    } satisfies Record<SessionProblem, string>,
  },
  aiText: {
    paragraphs: (n: number): string => (n === 1 ? "AI paragraph" : "AI paragraphs"),
    part: "AI-written Part",
    note: "AI-written Note",
    card: "AI-written Card",
    title: "AI-written title",
  },
  extraction: {
    title: "Core points",
    count: (n: number) => count(n, "point", "points"),
    stepNote: (written: number, total: number) =>
      total === 0
        ? "with ChatGPT"
        : `${numbers.format(written)} of ${count(total, "point", "points")} written`,
    showFreeText: "Read",
    hideFreeText: "Hide",
    startLead: "Find the core points of this Source",
    startBody:
      "The AI reads your Free text and searches your Graph. It proposes the core points, says where each comes from and how it meets the Notes you have, and asks you about them. You write each point you keep as a Note in your own words.",
    start: "Start Extraction",
    waiting: "The AI is reading. Its points appear here.",
    noPoints: "No open points. Ask the AI for more, or add a point in your own words.",
    proposed: (n: number) => `Proposed by the AI · ${numbers.format(n)}`,
    toWrite: "To write",
    written: "Written",
    dropped: "Dropped",
    fromFreeText: "From your Free text:",
    notInFreeText: "Not in your Free text. Check it against your copy.",
    ownWords: "Your own point",
    repeats: "You have this Note:",
    pullsAgainst: "Pulls against",
    keep: "Keep",
    discuss: "Discuss",
    drop: "Drop",
    write: "Write",
    bringBack: "Bring back",
    titleLabel: "Point, the Note's title",
    textLabel: "The Note, in your own words",
    page: "Page",
    linksHead: "Links from your Graph",
    addLink: "Add",
    linkAdded: "Added",
    undo: "Undo",
    dropLink: "Drop",
    draftKept: "The Note keeps this draft, marked as AI text.",
    draftLeftOut: "The Note leaves this draft out.",
    leaveDraftOut: "Leave the draft out",
    keepDraft: "Keep the draft",
    save: "Save Note",
    askDraft: "Ask for a draft",
    draftRequest: "Please write a draft of this point's Note.",
    proposeMore: "Propose more",
    proposeMoreRequest: "Please propose more core points.",
    addOwn: "Add a point in your words",
    addOwnLabel: "Your point",
    addOwnHint: "One claim, as a full sentence. It becomes the Note's title.",
    add: "Add",
    cancel: "Cancel",
    showDropped: (n: number) => `${numbers.format(n)} dropped`,
    hideDropped: "Hide dropped",
    openInGraph: "Open in Graph",
    links: (n: number) => count(n, "Link", "Links"),
    states: {
      open: "Proposed",
      kept: "Kept",
      written: "Written",
      dropped: "Dropped",
    } satisfies Record<PointState, string>,
    nameTaken: (name: string) =>
      `Your Graph already has a file named “${name}”. Change the title, or open that Note.`,
    saveFailed: "Glose could not save the Note. Try again.",
    actionFailed: "Glose could not save that. Try again.",
  },
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
    canvasLabel: (notes: number, links: number) =>
      `The Graph: ${count(notes, "node", "nodes")} joined by ${count(links, "Link", "Links")}. The panel beside it lists the same Sources and Notes.`,
    findLabel: "Find in the Graph",
    findPlaceholder: "Find a Note or Source",
    found: (n: number) => (n === 0 ? "Nothing found" : `${numbers.format(n)} found`),
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Show the whole Graph",
    help: "Scroll or pinch to zoom, and drag the background to move. Drag a node to pull on its Links. Click a node to read it here; double-click a Source to open it.",
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
  },
  writing: {
    title: "Writing projects",
    empty:
      "A Writing project is prose you write yourself, with References to your Notes. Writing projects come in a later version.",
  },
  recall: {
    title: "Recall",
    empty:
      "Recall asks you about Cards made from your Notes and schedules each one with FSRS. To make Cards, open a Note in the Graph and choose Make Cards.",
    counts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "Card", "Cards")
        : `${count(cards, "Card", "Cards")} · ${numbers.format(ai)} with AI text`,
    findLabel: "Find Cards",
    findPlaceholder: "Find a question, answer or Note",
    onlyAi: "Only Cards with AI text",
    shown: (shown: number, total: number) =>
      `Showing ${numbers.format(shown)} of ${count(total, "Card", "Cards")}.`,
    showMore: "Show more",
    nothingFound: "No Card matches.",
    gradeLabel: "Grade",
    allGrades: "All grades",
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
    // Two steps, because people press Hard when they forgot, and FSRS reads Hard as a pass.
    didRecall: "Did you recall it?",
    forgot: "Forgot",
    recalled: "Recalled",
    howWasIt: "How did it go?",
    efforts: { hard: "With effort", good: "Normal", easy: "At once" },
    back: "Back",
    interval: (ms: number) => formatInterval("en", ms),
    start: "Start Review",
    dueToday: (n: number) => `${count(n, "Card", "Cards")} to review today.`,
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
  settings: {
    title: "Settings",
    language: "Interface language",
    graphFolder: "Graph folder",
    graphFolderHint: "Changing the folder comes in a later version.",
  },
};

export type Messages = typeof en;

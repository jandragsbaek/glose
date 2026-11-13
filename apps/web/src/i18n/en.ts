import type {
  GraphRemoteUnavailableReason,
  ChatGptProblem,
  GitHubProblem,
  GraphFolderAction,
  GraphFolderUnavailable,
  CheckId,
  Grade,
  JudgeState,
  PointState,
  ProposalState,
  ReadingStep,
  RemoteRefusedReason,
  UpdatesProblem,
  SessionProblem,
  SessionTool,
  Verdict,
  VersionsOffReason,
  VersionsProblem,
} from "@glose/contracts";
import { ANSWER_WORDS, QUESTION_WORDS } from "@glose/contracts";

import { nightlyOf } from "../domain/appVersion.ts";
import { formatInterval } from "../domain/interval.ts";
import type { MissingDetail } from "../domain/source.ts";

const numbers = new Intl.NumberFormat("en");
const plurals = new Intl.PluralRules("en");
const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
const list = new Intl.ListFormat("en", { type: "conjunction" });
const clockTime = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
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
    sources: "Sources",
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
      "Three choices, then Glose opens on Today. Nothing leaves your computer except what you keep on GitHub or send to ChatGPT.",
    languageStep: "Language",
    languageHint:
      "The language of the interface. Notes and Writing projects can be in any language. You can change this later in Settings.",
    folderStep: "Graph folder",
    folderHint:
      "Glose keeps every Source and Note as a Markdown file in this folder, and its own settings in a hidden .glose folder inside it. Move the folder, or share it through Dropbox or git, and the Graph goes with it.",
    folderActions: {
      create: "Start a new Graph",
      open: "Open an existing folder",
      clone: "Get it from GitHub",
    } satisfies Record<GraphFolderAction, string>,
    folderActionHints: {
      create: "Glose creates an empty folder at this path.",
      open: "A Graph that you moved or that someone shares with you, or a folder of Markdown files.",
      clone:
        "Glose copies the Graph into a new folder at this path. The folder must be missing or empty.",
    } satisfies Record<GraphFolderAction, string>,
    folderLabel: "Folder path",
    chatgptStep: "ChatGPT",
    chatgptHint:
      "Optional. You can also connect later in Settings. Without ChatGPT you can still add Sources and write Free text.",
    submit: "Start using Glose",
    copying: "Copying your Graph…",
    remote: {
      from: "From",
      notChosen: "Not chosen yet",
      yours: "Yours",
      sharedBy: (owner: string) => `Shared by ${owner}`,
      choose: "Choose on GitHub",
      chooseAgain: "Choose another",
      useRemote: "Use another git remote",
      backupNote: "Glose keeps the Graph backed up there after each save.",
      missing: "Choose where to get your Graph from.",
      title: "Get your Graph from GitHub",
      intro:
        "Glose copies your Graph from a private repository on GitHub, and keeps it backed up there after each save. Connect GitHub to see your repositories.",
      codeIntro: "Type this code on GitHub's page. It lets Glose read your private repositories.",
      chooseGraph: "Choose the Graph",
      listHint: "Private repositories you own or that are shared with you.",
      graph: "Graph",
      updated: (at: Date) => `Updated ${shortDate.format(at)}`,
      others: (count: number) => `Other repositories (${count})`,
      othersHint:
        "No Graph in them yet. If you choose one, Glose makes a Graph of its files as they are.",
      none: "Glose found no private repositories on GitHub. Back the Graph up to GitHub from Settings on the other computer first, or use another account.",
      listFailed: "GitHub did not answer. Try again in a moment.",
      useThis: "Use this repository",
      notEmpty:
        "This folder already holds files. Glose copies a Graph only into a folder that is missing or empty.",
      gitHubFailed:
        "Glose could not copy the repository from GitHub. Check the internet connection and try again, or choose the repository again.",
      copyingNote: "A large Graph can take a few minutes.",
      remoteIntro:
        "Glose copies the Graph from a git remote you already have, with your own git sign-in: an SSH key or a credential helper.",
      errors: {
        "no-git": "Glose needs git to copy a Graph. Install git, then try again.",
        unreachable:
          "Git could not reach that remote, or could not sign in to it. Check the address, and that git on this computer can read it.",
      } satisfies Record<GraphRemoteUnavailableReason, string>,
    },
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
  sources: {
    title: "Sources",
    counts: (all: number, inProgress: number) =>
      inProgress === 0
        ? count(all, "Source", "Sources")
        : `${count(all, "Source", "Sources")} · ${numbers.format(inProgress)} in progress`,
    desk: "On the desk",
    deskCount: (n: number) => `${numbers.format(n)} in progress`,
    deskEmpty: "Nothing on the desk: every Source is read. Add the next one when you start it.",
    state: (step: Exclude<ReadingStep, "done">, words: number, notes: number) =>
      ({
        "free-text": `Free text · ${count(words, "word", "words")}`,
        extraction: `Extraction · ${count(notes, "Note", "Notes")} written`,
        probe: `Probe · ${count(notes, "Note", "Notes")}`,
      })[step],
    register: "The register",
    find: "Find a Source",
    findPlaceholder: "Title, author or call number",
    order: "Order",
    orders: {
      added: "Added",
      call: "Call number",
      author: "Author",
    },
    reading: "Reading",
    readingFilters: {
      all: "Any Reading step",
      "in-progress": "In progress",
      done: "Read",
    },
    citation: "Citation",
    citationFilters: {
      all: "Any Citation data",
      ready: "Ready to cite",
      missing: "Missing data",
    },
    hint: "Choose a count under Links to light up those Sources.",
    hintSelected: (title: string, n: number) =>
      n === 0
        ? `${title} shares no Links with other Sources.`
        : `${count(n, "Source shares", "Sources share")} Links with ${title}.`,
    clearSelection: "Clear",
    columns: {
      call: "Call number",
      title: "Title",
      reading: "Reading",
      notes: "Notes",
      located: "With a Location",
      links: "Links to other Sources",
      citation: "Citation",
    },
    monthGroup: (year: number, month: number, n: number) =>
      `${monthYear.format(new Date(year, month))} · ${numbers.format(n)} added`,
    letterGroup: (letter: string, n: number) => `${letter} · ${count(n, "Source", "Sources")}`,
    steps: {
      "free-text": "In Free text",
      extraction: "In Extraction",
      probe: "In Probe",
      done: "Read",
    } satisfies Record<ReadingStep, string>,
    located: (located: number, notes: number) =>
      `${numbers.format(located)} of ${numbers.format(notes)}`,
    noNotes: "No Notes",
    linkedSources: (n: number) => count(n, "Source", "Sources"),
    standsAlone: "Stands alone",
    shared: (n: number) => `${numbers.format(n)} shared`,
    sharedWith: (n: number, title: string) => `${count(n, "Link", "Links")} shared with ${title}`,
    showLinks: (title: string) => `linked to ${title}`,
    ready: "Ready",
    missing: (missing: ReadonlyArray<MissingDetail>): string =>
      missing.length > 1
        ? "No year or publisher"
        : missing[0] === "firstPublished"
          ? "No year"
          : "No publisher",
    matching: (shown: number, total: number) =>
      `${numbers.format(shown)} of ${count(total, "Source", "Sources")}`,
    nothingFound: "No Source matches.",
    clearFilters: "Clear search and filters",
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
      "The AI reads your Free text and searches your Graph. It proposes the core points, says where each comes from and how it meets the Notes you have, and asks you about them. Each point comes with a draft of its Note, marked as AI text until you rewrite it in your own words.",
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
    draftLabel: "The Note, the AI's draft",
    draftMarked: "marked until you rewrite it",
    rewrote: "I rewrote it",
    rewroteHint:
      "Removes the AI mark, also from text you edited. Choose this when the text is in your own words.",
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
  updates: {
    /** A nightly as "Nightly 13 Nov (42)"; any other version as it is. */
    version: (version: string) => {
      const nightly = nightlyOf(version);
      return nightly === null
        ? version
        : `Nightly ${shortDate.format(nightly.built)} (${numbers.format(nightly.run)})`;
    },
    check: "Check for updates",
    checking: "Checking…",
    upToDate: "Glose is up to date.",
    notChecked: "Not checked yet.",
    checkingLong: "Checking for updates…",
    update: "Update",
    restart: "Restart to update",
    percent: (percent: number) => `${numbers.format(percent)}%`,
    downloading: (version: string, percent: number) =>
      `Downloading ${version}: ${numbers.format(percent)}%`,
    available: (version: string) => `${version} is ready to download.`,
    downloaded: (version: string) => `${version} is downloaded.`,
    restartHint: "Glose closes and opens again with the new version.",
    running: (version: string) => `You have ${version}.`,
    checked: (at: Date, today: boolean) =>
      `Checked ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    everyHour: "Glose checks every hour.",
    problemsShort: {
      "check-failed": "Not checked",
      "download-failed": "Not downloaded",
      "install-failed": "Not installed",
    } satisfies Record<UpdatesProblem, string>,
    problems: {
      "check-failed": "Glose could not reach GitHub. Click to try again.",
      "download-failed": "The download stopped. Click to try again.",
      "install-failed": "The update did not install. Click to try again.",
    } satisfies Record<UpdatesProblem, string>,
  },
  versions: {
    title: "Versions of your Graph",
    off: "No versions",
    offReasons: {
      "no-graph": "Glose keeps versions once you choose a Graph folder.",
      "no-git":
        "Git is not installed on this computer. Install Git and start Glose again to keep versions of your Graph.",
      "other-repository":
        "The Graph folder is inside another git repository. Glose does not make commits there.",
      failed: "Git could not start a repository in the Graph folder.",
    } satisfies Record<VersionsOffReason, string>,
    saved: (at: Date, today: boolean) =>
      `Saved ${today ? clockTime.format(at) : shortDate.format(at)}`,
    notSavedYet: "Not saved yet",
    saving: "Saving…",
    syncing: "Syncing…",
    unsaved: "Changes not saved yet",
    changes: "Changes",
    allSaved: "All saved.",
    pending: "Not saved yet. Glose saves them after 5 minutes without changes.",
    remote: "Remote",
    noRemote: "Only on this computer.",
    sync: "Sync",
    synced: (at: Date, today: boolean) =>
      `Synced ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    notSynced: "Not synced since Glose started.",
    unpushed: (n: number) => `${count(n, "version", "versions")} not pushed yet.`,
    problemsShort: {
      conflict: "Sync conflict",
      "sync-failed": "Not synced",
      "save-failed": "Not saved",
    } satisfies Record<VersionsProblem, string>,
    problems: {
      conflict:
        "The same lines changed on this computer and on the remote. Glose kept all versions and did not sync. Join the changes with git. Then Glose syncs again.",
      "sync-failed": "Glose could not sync with the remote. Glose tries again after the next save.",
      "save-failed": "Git could not save a version. Glose tries again at the next change.",
    } satisfies Record<VersionsProblem, string>,
    endDay: "End the day",
    endDayHint: "Write one line about today. Glose saves it as a version and syncs it.",
    summary: "Today",
    summaryPlaceholder: "Read Arendt, wrote two Notes",
    dayEnded: "The day is saved as a version.",
  },
  backup: {
    title: "Backup",
    versions: "Versions",
    onlyHere: "Only on this computer",
    lastSaved: "Last saved",
    savedAt: (at: Date, today: boolean) =>
      today ? `Today ${clockTime.format(at)}` : shortDate.format(at),
    risk: "If this computer is lost or breaks, your Graph is lost with it.",
    backUpToGitHub: "Back up to GitHub",
    useRemote: "Use another git remote",
    backedUpTo: "Backed up to",
    lastSync: "Last sync",
    github: "GitHub",
    notConnected: "Not connected",
    disconnectGitHub: "Disconnect GitHub",
    stop: "Stop backing up",
    stopQuestion: (place: string) =>
      `Stop backing up? Glose keeps every version on this computer, and the copy at ${place} stays as it is.`,
    keep: "Keep backing up",
    step: (n: number, of: number) => `Step ${n} of ${of}`,
    intro:
      "GitHub keeps a private copy of every version, free. Only you can see it, and later you can open your Graph on another computer.",
    connect: "Connect GitHub",
    noAccount: "No GitHub account?",
    createAccount: "Create one, free",
    unavailable:
      "This copy of Glose cannot connect to GitHub. You can still use another git remote.",
    codeIntro: "Type this code on GitHub's page. It lets Glose make your private repository.",
    code: "Code for GitHub",
    copy: "Copy code",
    copied: "Copied",
    openAgain: "Open GitHub again",
    waiting:
      "Waiting for GitHub. Type the code on the page that opened. Glose continues by itself.",
    cancel: "Cancel",
    signedIn: (login: string) => `Signed in to GitHub as ${login}.`,
    otherAccount: "Use another account",
    repository: "Repository name",
    repositoryHint:
      "Private. Glose makes it if you have no repository of this name. If you have one, Glose uses it.",
    repositoryInvalid: "Use only letters, digits and the signs - _ and .",
    backUp: "Back up",
    backingUp: "Backing up…",
    done: "Backed up. Every version is on GitHub now, and Glose keeps it up to date after each save.",
    close: "Done",
    remoteIntro:
      "Glose pushes to a git remote you already have, with your own git sign-in: an SSH key or a credential helper.",
    remoteUrl: "Remote address",
    remotePlaceholder: "git@example.com:you/glose-graph.git",
    useThisRemote: "Use this remote",
    checking: "Checking…",
    remoteDone: "Backed up. Glose keeps the remote up to date after each save.",
    problems: {
      declined: "You declined on GitHub, so Glose is not connected.",
      "timed-out": "The code expired before GitHub got it. Connect again for a new code.",
      expired: "GitHub no longer accepts the sign-in. Connect again.",
      failed: "Glose could not connect to GitHub. Try again.",
    } satisfies Record<GitHubProblem, string>,
    refused: {
      "versions-off": "Glose keeps no versions now, so there is nothing to back up.",
      "github-not-connected": "Glose is not connected to GitHub now. Connect again.",
      "public-repository":
        "You have a public repository of this name. Glose never puts your Graph where everyone can read it. Choose another name.",
      "github-failed": "GitHub did not make the repository. Try again in a moment.",
      unreachable:
        "Git could not reach that remote, or could not sign in to it. Check the address, and that git on this computer can push there.",
      "other-graph":
        "That remote holds another Graph. Glose does not mix two Graphs. Use an empty remote, or the one of this Graph.",
    } satisfies Record<RemoteRefusedReason, string>,
  },
  settings: {
    title: "Settings",
    language: "Interface language",
    graphFolder: "Graph folder",
    graphFolderHint: "Changing the folder comes in a later version.",
  },
};

export type Messages = typeof en;

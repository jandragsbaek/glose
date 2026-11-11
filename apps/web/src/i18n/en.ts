import type {
  ChatGptProblem,
  GraphFolderAction,
  GraphFolderUnavailable,
  ReadingStep,
  SessionProblem,
  SessionTool,
} from "@glose/contracts";

const numbers = new Intl.NumberFormat("en");
const plurals = new Intl.PluralRules("en");
const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
const list = new Intl.ListFormat("en", { type: "conjunction" });
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
    recallEmpty: "No Cards yet. Cards are made from Notes, and Recall schedules them for Review.",
    writingProject: "Writing project",
    writingEmpty: "No Writing projects yet. They come in a later version of Glose.",
    aiText: "Notes with AI text",
    aiTextEmpty:
      "No AI text. When the AI writes a Note, the Note shows here until you rewrite it in your own words.",
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
    title: "Extraction",
    start: "Start Extraction",
    startHint:
      "The AI reads your Free text and the Source's data, suggests the core points, and asks you about them. Glose does not save Notes yet.",
    needsChatGpt: "Extraction needs ChatGPT",
    needsChatGptBody: "Connect your ChatGPT plan in Settings, then come back to this Source.",
    openSettings: "Open Settings",
    transcript: "Session",
    you: "You",
    ai: "AI",
    tools: {
      "read-source": "The AI read this Source and your Free text.",
      "list-sources": "The AI looked at the list of your Sources.",
    } satisfies Record<SessionTool, string>,
    working: "The AI is working",
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
  graph: {
    title: "Graph",
    empty:
      "The Graph holds your Notes and the Links between them. It stays empty until Extraction makes the first Notes from a Source.",
  },
  writing: {
    title: "Writing projects",
    empty:
      "A Writing project is prose you write yourself, with References to your Notes. Writing projects come in a later version.",
  },
  recall: {
    title: "Recall",
    empty:
      "Recall asks you about Cards made from your Notes and schedules each one with FSRS. It stays empty until you have Notes.",
  },
  settings: {
    title: "Settings",
    language: "Interface language",
    graphFolder: "Graph folder",
    graphFolderHint: "Changing the folder comes in a later version.",
  },
};

export type Messages = typeof en;

import type { GraphFolderAction, GraphFolderUnavailable, ReadingStep } from "@glose/contracts";

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
      "Extraction and the Probe use your own ChatGPT subscription. Glose cannot connect to ChatGPT yet, so this step is skipped for now. You can already add Sources and write Free text.",
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
    waitsForChatGpt: "needs ChatGPT",
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
    aiUnavailableTitle: "Extraction waits for ChatGPT",
    aiUnavailable:
      "Extraction and the Probe need a ChatGPT connection. Glose cannot connect to ChatGPT yet. Your Free text is saved in the Source file, ready for when it can.",
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

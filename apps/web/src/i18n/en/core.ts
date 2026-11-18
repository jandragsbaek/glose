import type {
  GraphFolderAction,
  GraphFolderUnavailable,
  GraphRemoteUnavailableReason,
  ReadingStep,
} from "@glose/contracts";
import { numbers, count, shortDate, longDate } from "./format.ts";

export const coreMessages = {
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
    required: "required",
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
      read: "Continue reading",
      extraction: "Continue Extraction",
      probe: "Continue Probe",
      done: "Open Source",
    } satisfies Record<ReadingStep, string>,
    startReading: "Start reading",
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
    writingEmpty: "No Writing projects yet. Start a blog post in Writing projects.",
    writingContinue: "Continue writing",
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
      read: "Read",
      extraction: "Extraction",
      probe: "Probe",
    },
    done: "done",
    current: "current step",
    words: (n: number) => count(n, "word", "words"),
    noFreeText: "skipped",
    withChatGpt: "with ChatGPT",
  },
};

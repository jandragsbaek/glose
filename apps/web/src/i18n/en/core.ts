import type {
  VaultFolderAction,
  VaultFolderUnavailable,
  VaultRemoteUnavailableReason,
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
      "Check that the Vault still exists and that Glose may write to it. Then try again.",
    unexpected: "Something went wrong in Glose. Try again.",
    notFoundTitle: "Page not found",
    notFound: "This page does not exist in Glose.",
    sourceNotFound:
      "This Source does not exist. Its Markdown file may have been renamed or deleted.",
    backToToday: "Back to Today",
  },
  setup: {
    title: "Set up Glose",
    purpose:
      "Glose helps you read a book, keep what matters from it, and write about it in your own words.",
    length: "Five short steps. You can change the language and look later in Settings.",
    stepsLabel: "Steps",
    steps: {
      look: "Language and look",
      vault: "Vault",
      sections: "How Glose works",
      chatgpt: "ChatGPT",
      book: "Your first book",
    },
    stepHints: {
      look: "",
      vault: "The folder for your work",
      sections: "Graph, Writing projects, Recall",
      chatgpt: "Optional",
      book: "Optional",
    },
    stepState: {
      done: "Done",
      current: "Current step",
      locked: "After the Vault",
      skipped: "Skipped",
    },
    lookValue: (language: string, theme: string) => `${language} · ${theme}`,
    sectionsRead: "Read",
    chatgptConnected: "Connected",
    chatgptLater: "Later",
    vaultHasSources: (n: number) => `Your Vault has ${count(n, "Source", "Sources")}`,
    languageLegend: "Interface language",
    languageHint:
      "The language of the interface. Notes and Writing projects can be in any language.",
    folderHint:
      "Your Vault is one ordinary folder on this computer. Glose keeps all your Sources, Notes and Cards in it as plain files, so they stay yours and other programs can open them too.",
    privacy: "Your files stay on this computer, except what you keep on GitHub or send to ChatGPT.",
    folderActions: {
      create: "Start a new Vault",
      open: "Open an existing folder",
      clone: "Get it from GitHub",
    } satisfies Record<VaultFolderAction, string>,
    folderActionHints: {
      create: "Glose makes a new folder for your work.",
      open: "A Vault that you moved or that someone shares with you, or a folder of Markdown files.",
      clone: "Glose puts the copy in a new folder.",
    } satisfies Record<VaultFolderAction, string>,
    folderLabel: "Folder path",
    where: "Where",
    folderNotChosen: "No folder chosen yet",
    placeHome: (home: string) => `in your home folder (${home})`,
    placeIn: (trail: string) => `in ${trail}`,
    change: "Change…",
    chooseOpen: "Choose the folder…",
    typePath: "Type a path instead",
    folderNeeded: "Choose the folder that holds your Vault first.",
    pickTitle: {
      create: "Choose where Glose makes the folder for your Vault",
      open: "Choose the folder that holds your Vault",
      clone: "Choose where Glose puts the copy of your Vault",
    } satisfies Record<VaultFolderAction, string>,
    pickButton: {
      create: "Choose this place",
      open: "Open this folder",
      clone: "Choose this place",
    } satisfies Record<VaultFolderAction, string>,
    vaultSubmit: {
      create: "Make the Vault",
      open: "Open the Vault",
      clone: "Copy the Vault",
    } satisfies Record<VaultFolderAction, string>,
    vaultDone: "Glose keeps your work in this folder.",
    vaultFound: (n: number) =>
      n === 0 ? "It holds no Sources yet." : `It holds ${count(n, "Source", "Sources")}.`,
    sectionsIntro:
      "Glose has three Sections. After setup you find them at the left of the window. The AI does different work in each.",
    sections: {
      graph: {
        holds:
          "Notes from what you read, linked to each other. Every Note comes from a Source, so you can find the page again.",
        ai: "The AI may write Notes. Its text carries this mark until you rewrite it in your own words.",
        sample: "Busyness is a proxy for productivity: it feels like work getting done.",
      },
      writing: {
        holds: "Your own prose: blog posts and university assignments that cite your Notes.",
        ai: "The AI suggests Notes to cite and checks your References. It never writes your prose.",
      },
      recall: {
        holds: "Cards made from your Notes, brought back just before you would forget them.",
        ai: "The AI may propose Cards. They carry the same mark until you rewrite them.",
        sample: "What does attention residue do to the next task?",
      },
    },
    bookIntro: "Add the book you are reading now. Glose then opens it, ready to start.",
    bookKnown: (n: number) =>
      `Your Vault already holds ${count(n, "Source", "Sources")}. Today shows the ones in progress.`,
    continue: "Continue",
    back: "Back",
    toToday: "Go to Today",
    later: "Later",
    laterToday: "Later, go to Today",
    addBook: "Add the book",
    chatgptIntro:
      "The AI in Glose runs on your own ChatGPT plan. It helps turn what you write about a book into Notes, asks you questions about the book, and proposes Cards. Glose has no account of its own: ChatGPT asks you to allow Glose to use your plan.",
    notNow: "Not now",
    chatgptHint:
      "Optional. You can also connect later in Settings. Without ChatGPT you can still add Sources and write Free text.",
    copying: "Copying your Vault…",
    remote: {
      from: "From",
      notChosen: "Not chosen yet",
      yours: "Yours",
      sharedBy: (owner: string) => `Shared by ${owner}`,
      choose: "Choose on GitHub",
      chooseAgain: "Choose another",
      useRemote: "Use another git remote",
      backupNote: "Glose keeps the Vault backed up there after each save.",
      missing: "Choose where to get your Vault from.",
      title: "Get your Vault from GitHub",
      intro:
        "Glose copies your Vault from a private repository on GitHub, and keeps it backed up there after each save. Connect GitHub to see your repositories.",
      codeIntro: "Type this code on GitHub's page. It lets Glose read your private repositories.",
      chooseVault: "Choose the Vault",
      listHint: "Private repositories you own or that are shared with you.",
      vault: "Vault",
      updated: (at: Date) => `Updated ${shortDate.format(at)}`,
      others: (count: number) => `Other repositories (${count})`,
      othersHint:
        "No Vault in them yet. If you choose one, Glose makes a Vault of its files as they are.",
      none: "Glose found no private repositories on GitHub. Back the Vault up to GitHub from Settings on the other computer first, or use another account.",
      listFailed: "GitHub did not answer. Try again in a moment.",
      useThis: "Use this repository",
      notEmpty:
        "This folder already holds files. Glose copies a Vault only into a folder that is missing or empty.",
      gitHubFailed:
        "Glose could not copy the repository from GitHub. Check the internet connection and try again, or choose the repository again.",
      copyingNote: "A large Vault can take a few minutes.",
      remoteIntro:
        "Glose copies the Vault from a git remote you already have, with your own git sign-in: an SSH key or a credential helper.",
      errors: {
        "no-git": "Glose needs git to copy a Vault. Install git, then try again.",
        unreachable:
          "Git could not reach that remote, or could not sign in to it. Check the address, and that git on this computer can read it.",
      } satisfies Record<VaultRemoteUnavailableReason, string>,
    },
    folderErrors: {
      "not-absolute": "Write the full path of the folder, starting from the top of the disk.",
      "not-a-folder": "This path is a file, not a folder. Choose a folder.",
      "not-found": "There is no folder at this path. To make one, choose Start a new Vault.",
      "not-empty":
        "This folder already holds files. To use them in Glose, choose Open an existing folder.",
      "not-writable": "Glose cannot write to this folder. Choose a folder that you may write to.",
    } satisfies Record<VaultFolderUnavailable["reason"], string>,
  },
  today: {
    title: "Today",
    date: (date: Date) => longDate.format(date),
    addSource: "Add Source",
    inProgress: "Source in progress",
    continue: {
      "free-text": "Continue Free text",
      read: "Continue reading",
      passages: "Continue Passages",
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
      passages: "Passages",
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

import type {
  ChatGptProblem,
  Confidence,
  PointState,
  ReadingStart,
  ReasoningVerdict,
  ResultVerdict,
  SessionProblem,
  SessionTool,
  TopicState,
} from "@glose/contracts";
import { hostOf } from "../../domain/webAddress.ts";
import { numbers, count, list } from "./format.ts";

export const readingMessages = {
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
    anytime:
      "Write freely about the book in your own words, whenever you want. It stays beside the Probe and Extraction.",
    nextStep: "Next step",
  },
  start: {
    title: "Where are you with this book?",
    hint: "Your answer sets the first step. You can still take the other path later.",
    choices: {
      reading: "I'm reading it now",
      write: "I have thoughts I want to write down",
      probe: "I read it, and I want to be questioned on it",
      "catch-up": "I read it a while ago, or only in part",
    },
    choiceHints: {
      reading:
        "Keep Passages after each sitting and write Notes as you go. Extraction and the Probe come when you finish.",
      write: "Start with Free text in your own words.",
      probe: "The AI asks; you answer with your Reasoning.",
      "catch-up": "The AI asks, and explains the parts you are missing.",
    },
    follows: "What follows",
    chooseFirst: "Choose an answer to see the steps that follow.",
    stepNotes: {
      "free-text": "your own words",
      read: "the text, in Glose",
      passages: "after each sitting",
      extraction: "core points as Notes",
      probe: "questions and answers",
    },
    startWriting: "Start Free text",
    startProbe: "Start the Probe",
    startPassages: "Start Passages",
    starting: "Starting",
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
      "list-notes": "The AI looked at the Notes you made from this Source.",
      "read-probe": "The AI read your Probe.",
      "read-article": "The AI read the text and your Passages.",
      "search-web": "The AI searched the web.",
      "read-web-page": "The AI read a web page.",
    } satisfies Record<SessionTool, string>,
    trail: {
      readSource: "Read the Source and your Free text",
      listSources: "Looked at your Sources",
      readNote: "Read",
      listCards: "Looked at the Note's Cards",
      searchGraph: (query: string) => `Searched your Graph for “${query}”`,
      listNotes: "Looked at your Notes from this Source",
      readProbe: "Read your Probe",
      readArticle: "Read the text and your Passages",
      searchWeb: (query: string) => `Searched the web for “${query}”`,
      readWebPage: "Read",
    },
    trailSummary: (read: {
      readonly freeText: boolean;
      readonly notes: number;
      readonly searches: number;
      readonly sources: boolean;
      readonly cards: boolean;
      readonly sourceNotes: boolean;
      readonly probe: boolean;
      readonly article: boolean;
      readonly webSearches: number;
      readonly webPages: number;
    }) => {
      const things = [
        ...(read.webPages > 0 ? [count(read.webPages, "web page", "web pages")] : []),
        ...(read.article ? ["the text"] : []),
        ...(read.freeText ? ["your Free text"] : []),
        ...(read.probe ? ["your Probe"] : []),
        ...(read.sourceNotes ? ["your Notes from this Source"] : []),
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
      const web =
        read.webSearches === 0
          ? null
          : read.webSearches === 1
            ? "searched the web"
            : `searched the web ${numbers.format(read.webSearches)} times`;
      const line = [web, things.length === 0 ? null : `read ${list.format(things)}`, searched]
        .filter((part) => part !== null)
        .join(" · ");
      return line.charAt(0).toUpperCase() + line.slice(1);
    },
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
        case "list-notes":
          return "Looking at your Notes from this Source";
        case "read-probe":
          return "Reading your Probe";
        case "read-article":
          return "Reading the text";
        case "search-web":
          return detail === undefined ? "Searching the web" : `Searching the web for “${detail}”`;
        case "read-web-page":
          return detail === undefined ? "Reading a web page" : `Reading ${hostOf(detail)}`;
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
  code: {
    label: (language: string): string => (language === "" ? "Code" : `${language} code`),
    copy: "Copy code",
    copied: "Copied",
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
    fromProbe: "From your words in the Probe:",
    notInFreeText: "Not in your Free text. Check it against your copy.",
    fromText: (paragraph: string | null) =>
      paragraph === null ? "From the text:" : `From the text, ${paragraph}:`,
    fromPassage: (paragraph: string | null) =>
      paragraph === null ? "Your Passage:" : `Your Passage, ${paragraph}:`,
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
      `Your Vault already has a file named “${name}”. Change the title, or open that Note.`,
    saveFailed: "Glose could not save the Note. Try again.",
    actionFailed: "Glose could not save that. Try again.",
    next: {
      probe: "Continue to the Probe",
      done: "Mark the Source as read",
    },
    nextHint: {
      probe: "Next, the Probe questions you on the book. Your points and Notes stay here.",
      done: "When its points are written, the Source leaves the desk. Its Notes stay in your Graph.",
    },
    nextFailed: "Glose could not move on to the next step. Try again.",
  },
  probe: {
    title: "Probe",
    stepNote: (questions: number) =>
      questions === 0 ? "with ChatGPT" : count(questions, "question", "questions"),
    tally: (tally: {
      readonly known: number;
      readonly afterTeaching: number;
      readonly taught: number;
      readonly open: number;
      readonly unconfirmed: number;
      readonly asked: number;
      readonly topics: number;
      readonly planned: boolean;
    }) =>
      [
        tally.planned
          ? `${numbers.format(tally.asked)} of ${count(tally.topics, "topic", "topics")} asked`
          : null,
        `${numbers.format(tally.known)} known`,
        tally.afterTeaching === 0
          ? null
          : `${numbers.format(tally.afterTeaching)} known after help`,
        tally.taught === 0 ? null : `${numbers.format(tally.taught)} taught, not confirmed yet`,
        tally.unconfirmed === 0
          ? null
          : `${numbers.format(tally.unconfirmed)} right, not confirmed yet`,
        tally.open === 0 ? null : `${numbers.format(tally.open)} still open`,
      ]
        .filter((part) => part !== null)
        .join(" · "),
    startLead: {
      reading: "Be questioned on the book",
      write: "Be questioned on the book",
      probe: "Be questioned on the book",
      "catch-up": "Catch up on the book, then be questioned",
    } satisfies Record<ReadingStart, string>,
    startBody: {
      reading:
        "The AI asks about the book's main ideas, one question at a time, and tests the Notes you made. Answer with your Reasoning, how you got there, then your answer. Where an answer shows a gap, the AI teaches that part and asks again.",
      write:
        "The AI asks about the book's main ideas, one question at a time, and tests the Notes you made. Answer with your Reasoning, how you got there, then your answer. Where an answer shows a gap, the AI teaches that part and asks again.",
      probe:
        "The AI asks about the book's main ideas, one question at a time. Answer with your Reasoning, how you got there, then your answer. Where an answer shows a gap, the AI teaches that part and asks again. Then Extraction makes Notes from what the Probe found.",
      "catch-up":
        "The AI explains each main idea of the book briefly, then asks about it. Answer with your Reasoning, how you got there, then your answer. Where an answer shows a gap, the AI teaches that part and asks again. Then Extraction makes Notes from what the Probe found.",
    } satisfies Record<ReadingStart, string>,
    start: "Start the Probe",
    needsChatGpt: "The Probe needs ChatGPT",
    showFreeText: "Free text",
    hideFreeText: "Hide Free text",
    finish: "Finish the Probe",
    finishFailed: "Glose could not finish the Probe. Try again.",
    question: (n: number) => `Q${numbers.format(n)}`,
    questionLabel: (n: number) => `Question ${numbers.format(n)}`,
    again: (n: number) => `Q${numbers.format(n)} again`,
    reasoning: "Your Reasoning",
    answer: "Your answer",
    teachMeAsked: "You asked to be taught.",
    hintAsked: "You asked for a hint.",
    judged: "Judged",
    judgedAgain: "Judged again",
    unconfirmedWhy: {
      guess: "You were guessing, so it is not counted as known yet.",
      bare: "No Reasoning for the choice, so it is not counted as known yet.",
    },
    judgedAgainOf: (n: number) => `The AI judged Q${numbers.format(n)} again.`,
    dispute: "Question this judgment",
    chooseOne: "Choose one",
    chooseMany: "Choose all that apply",
    optionsLabel: (n: number) => `Options for Q${numbers.format(n)}`,
    option: (letter: string) => `Option ${letter}`,
    yourChoice: "Your choice",
    noChoice: "Choose an option in the question above.",
    choiceMark: {
      chosenRight: "Your choice · right",
      chosenWrong: "Your choice · not right",
      right: "Right answer",
    },
    tests: (misconception: string) => `Tests: ${misconception}`,
    sure: "How sure are you?",
    sureShort: "How sure",
    confidence: { sure: "Sure", unsure: "Not sure", guess: "Guessing" } satisfies Record<
      Confidence,
      string
    >,
    hint: "Give me a hint",
    hintGloss: (n: number) => `Hint · Q${numbers.format(n)}`,
    hintFailed: "Glose could not ask for a hint. Try again.",
    planned: "Topics planned",
    talk: "Write to the AI instead",
    talkLabel: "Message to the AI",
    talkAbout: (n: number) => `about Q${numbers.format(n)}`,
    talkAboutJudgment: (n: number) => `about the judgment of Q${numbers.format(n)}`,
    talkHint:
      "Ask what the question means, question a judgment, or ask about the book. Your answer waits.",
    talkHintNoQuestion: "Ask about the book or a judgment, or ask for the next question.",
    talkPlaceholder: "Write to the AI",
    backToAnswer: "Back to your answer",
    closeTalk: "Close the message",
    messageFailed: "Glose could not send your message. Try again.",
    you: (about: string | null) => (about === null ? "You" : `You · ${about}`),
    reasoningVerdicts: {
      sound: "Reasoning: sound",
      "partly-sound": "Reasoning: partly sound",
      flawed: "Reasoning: flawed",
      none: "No Reasoning given",
    } satisfies Record<ReasoningVerdict, string>,
    resultVerdicts: {
      right: "Result: right",
      "partly-right": "Result: partly right",
      wrong: "Result: wrong",
    } satisfies Record<ResultVerdict, string>,
    taught: (question: number | null) =>
      question === null ? "Taught" : `Taught · the gap in Q${numbers.format(question)}`,
    intro: "Before the question",
    checkCopy: "From the AI's knowledge of the book, not your copy. Check it there.",
    waiting: "The AI is reading. Its first question appears here.",
    covered:
      "The AI has covered the book's main ideas. Finish the Probe when you are ready, or go on answering.",
    found: "What the Probe found",
    states: {
      asking: "Asked, no answer yet",
      known: "Known",
      "known-after-teaching": "Known after help",
      taught: "Taught, not confirmed yet",
      gap: "Still open",
      unconfirmed: "Right, not confirmed yet",
      "not-asked": "Not asked yet",
    } satisfies Record<TopicState, string>,
    foundEmpty: "The Probe ended before any answer.",
    keptIn: (file: string) => `The Probe is kept in ${file} in your Vault.`,
    continueExtraction: "Continue to Extraction",
    continueHint: "Extraction makes Notes from what the Probe found, with your own words.",
    doneRead: (title: string) => `Done: ${title} is read`,
    doneHint: "The Source leaves the desk. Its Notes, Free text and Probe stay.",
    openPlaceholder: "Think out loud, and end on your answer.",
    choiceReasoningPlaceholder: "Think out loud: why this one?",
    dictate: {
      mac: "To speak instead, start your Mac's dictation: press Fn twice, or the microphone key.",
      windows: "To speak instead, press Windows + H for Windows voice typing.",
      other: "To speak instead, use your computer's dictation. It writes into this box.",
    },
    send: "Send",
    teachMe: "I don't know, teach me",
    askNext: "Ask for the next question",
    sendFailed: "Glose could not send your answer. Try again.",
  },
};

import type { ArticleType, SourceKind } from "@glose/contracts";

import { count, numbers } from "./format.ts";

const lessonPart = (part: string) => {
  const match = /^(\d+)\.(\d+)$/.exec(part);
  return match === null ? `Lesson ${part}` : `Week ${match[1]} · Day ${match[2]}`;
};

export const articleMessages = {
  kinds: {
    label: "What are you adding?",
    passageLabel: "a Passage you marked; Enter opens it",
    names: {
      book: "Book",
      article: "Article",
      lesson: "Course lessons",
      video: "Video",
    } satisfies Record<SourceKind, string>,
    one: {
      book: "Book",
      article: "Article",
      lesson: "Course lesson",
      video: "Video",
    } satisfies Record<SourceKind, string>,
    hints: {
      book: "You read it elsewhere. Glose keeps your Free text and Notes.",
      article: "One Markdown file or pasted text. You read it in Glose.",
      lesson: "A folder of lesson files from a course. Each lesson is a Source.",
      video: "A talk or another video on YouTube. You watch it in Glose and stamp the times.",
    } satisfies Record<SourceKind, string>,
    articleTypes: {
      paper: "Academic paper",
      web: "Web essay",
      press: "Magazine or newspaper",
    } satisfies Record<ArticleType, string>,
  },
  lessonPart,
  lessonShort: (part: string) => {
    const match = /^(\d+)\.(\d+)$/.exec(part);
    return match === null ? `Lesson ${part}` : `Day ${match[2]}`;
  },
  reader: {
    contents: "Contents",
    contentsCount: (paragraphs: number, words: number) =>
      `${count(paragraphs, "paragraph", "paragraphs")} · ${count(words, "word", "words")}`,
    minutes: (n: number) => `about ${count(n, "minute", "minutes")} to read`,
    opening: "Opening",
    sectionPassages: (n: number) => (n === 0 ? "" : count(n, "Passage", "Passages")),
    here: "you are here",
    paragraph: (n: number) => `¶ ${numbers.format(n)}`,
    paragraphLabel: (n: number) => `Paragraph ${numbers.format(n)}`,
    stepNote: (passages: number, place: number | null, total: number) =>
      place === null
        ? count(passages, "Passage", "Passages")
        : `${count(passages, "Passage", "Passages")} · ¶ ${numbers.format(place)} of ${numbers.format(total)}`,
    howTo: "Select words to mark a Passage.",
    notHere: "Passages are marked in the running text: paragraphs, lists and quotes.",
    oneParagraph: (n: number) =>
      `A Passage stays inside one paragraph, so only the words in ¶ ${numbers.format(n)} will be marked.`,
    busy: "The AI is still working. Try again when it has answered.",
    keys: "M marks · D goes deeper · Esc leaves",
    markBar: "Passage",
    markKey: "M",
    deeperKey: "D",
    mark: "Mark Passage",
    markDeeper: "Mark and go deeper",
    marking: "Marking…",
    refused: {
      overlap: "That touches a Passage you marked. Choose words beside it.",
      empty: "Choose some words first.",
      "not-found":
        "Glose could not find that paragraph. The file may have changed; reload the page.",
      "no-text": "This Source has no text in Glose.",
    },
    apparatus: "Passages in view",
    apparatusMore: (n: number) => `Show ${count(n, "more Passage", "more Passages")}`,
    apparatusFewer: "Show fewer",
    open: "Open",
    states: {
      marked: "Marked",
      words: "Your words",
      deeper: (question: number) => `Taken deeper · Q${numbers.format(question)}`,
      deeperOpen: "Being taken deeper",
      understood: "Understood",
      point: "Point made",
    },
    margin: {
      notebook: "Reading notes",
      notebookHint:
        "Write freely about the text while you read. This is your Free text; it is optional, and Extraction reads it.",
      notebookPlaceholder: "What strikes you, what you doubt, what it reminds you of…",
      saved: "Saved",
      saving: "Saving…",
      saveFailed: "Not saved. Glose could not write the file.",
      retry: "Try again",
      lost: (n: number) =>
        `Your words on the Passage in ¶ ${numbers.format(n)} were not saved. They are kept here until they are.`,
      reopen: "Open it",
      lostNotes: "Your reading notes were not saved. They are kept here until they are.",
      passages: (n: number) =>
        n === 0
          ? "No Passages yet. Select words in the text to mark one."
          : `${count(n, "Passage", "Passages")} marked. Choose one in the text to work on it.`,
      passage: (n: number) => `Passage · ¶ ${numbers.format(n)}`,
      close: "Close",
      closeLabel: "Close the Passage",
      yourWords: "Your words",
      yourWordsHint: "Kept as a footnote under the Passage in the text file.",
      yourWordsPlaceholder: "In your own words: what it says, why it matters…",
      goDeeper: "Go deeper",
      goDeeperHint: "The AI questions you on this Passage. It is part of the Probe.",
      makePoint: "Make a Point",
      remove: "Remove the mark",
      removeConfirm: "Remove the mark and your words on it?",
      removeYes: "Remove",
      keep: "Keep it",
      claim: "The Point, as a full sentence",
      claimHint:
        "Your claim about the Passage. It becomes a Note's title; you write the Note in Extraction.",
      savePoint: "Save the Point",
      cancel: "Cancel",
      pointMade: (title: string) => `Point made: ${title}`,
      pointWhere: "You write it as a Note in Extraction.",
      deeperTitle: "Taken deeper",
      deeperWorking: "The AI reads the Passage…",
      understood: "You understand this Passage. The Probe of the whole text comes after reading.",
      fromText: (n: number) => `From the text, ¶ ${numbers.format(n)}`,
      otherOpen: (question: number) =>
        `Q${numbers.format(question)} about another Passage is still open. Answer it there first.`,
      openThat: "Open that Passage",
    },
    end: {
      title: "Done reading",
      summary: (passages: number, deeper: number, points: number) =>
        [
          count(passages, "Passage", "Passages"),
          deeper === 0 ? null : `${numbers.format(deeper)} taken deeper`,
          points === 0 ? null : count(points, "Point", "Points"),
        ]
          .filter((part) => part !== null)
          .join(" · "),
      question: "What next?",
      choices: {
        write: "Make Points from the text",
        probe: "Question me first",
      },
      hints: {
        write:
          "Extraction: the AI proposes the text's core points, your Passages first. Then the Probe questions you.",
        probe:
          "The Probe: the AI questions you on the whole text and teaches the gaps. Then Extraction makes the Notes.",
      },
      go: {
        write: "Continue to Extraction",
        probe: "Start the Probe",
      },
      failed: "Glose could not save the step. Try again.",
    },
    probe: {
      focus: (n: number) => `You went deeper on ¶ ${numbers.format(n)} while reading:`,
      focusDone: (n: number) => `¶ ${numbers.format(n)} understood.`,
      wholeLead: "Next, the Probe of the whole text.",
      wholeBody:
        "While you read, the AI questioned you on your Passages. Now it covers the text's main ideas, the most important first.",
      wholeStart: "Start the Probe of the whole text",
      onParagraph: (n: number) => `¶ ${numbers.format(n)}`,
    },
    readText: "Read the text",
    backToStep: "Back to the step",
    previousLesson: "Previous lesson",
    nextLesson: "Next lesson",
    imageMissing: (alt: string) =>
      alt === "" ? "An image the file names but Glose did not copy." : `Image not copied: ${alt}`,
    notes: "Notes in the text",
    noText:
      "Glose has no text for this Source. Its file in Articles is missing; add it again from the Markdown file.",
    loading: "Opening the text…",
  },
  importText: {
    article: "The article",
    chooseFile: "Choose a Markdown file",
    dropHint: "or drop it here. Glose copies it into Articles in your Graph folder.",
    paste: "Paste the text instead",
    pasteLabel: "The article as Markdown or plain text",
    usePasted: "Use this text",
    chosenMeta: (paragraphs: number, words: number) =>
      `${count(paragraphs, "paragraph", "paragraphs")} · ${count(words, "word", "words")}`,
    pasted: "Pasted text",
    another: "Choose another",
    notMarkdown: (name: string) => `${name} is not a Markdown file. Choose a .md file.`,
    empty: "The text is empty.",
    readFailed: "Glose could not read that file.",
    fromFile: "From the file",
    filledFromFile: "Filled in from the file. Check the marked fields.",
    type: "Kind of article",
    more: {
      paper: "Other authors, volume, issue, pages and address",
      web: "Other authors and date accessed",
      press: "Other authors and pages",
    } satisfies Record<ArticleType, string>,
    otherAuthors: "Other authors",
    otherAuthorsHint: "One per line, as Given Family.",
    published: "Published",
    publishedHint: "The date or the year, for example 2026-03-04 or 2026.",
    containers: {
      paper: "Journal",
      web: "Website",
      press: "Publication",
    } satisfies Record<ArticleType, string>,
    volume: "Volume",
    issue: "Issue",
    pages: "Pages",
    doi: "DOI",
    url: "Address (URL)",
    accessed: "Date accessed",
    accessedHint: "The day you read it online.",
    submit: "Add Article",
    adding: "Adding…",
    reading: "Reading the file…",
    needText: "Choose a Markdown file or paste the text first.",
    needYear: "Write at least the year, for example 2026.",
    needField: "Fill this in.",
    needPasted: "Paste the text, then choose Use this text.",
    backToFile: "Choose a file instead",
    keep: (name: string) => `Keep ${name}`,
    keepPasted: "Keep the pasted text",
    fromPaste: "From the pasted text",
    filledFromPaste: "Filled in from the pasted text. Check the marked fields.",
  },
  lessons: {
    chooseFolder: "Choose the course folder",
    chooseFiles: "Choose lesson files",
    dropHint: "or drop the files here. Each lesson becomes a Source; its text goes into Articles.",
    course: "The course",
    courseName: "Course name",
    courseHint: "Every lesson shares it, like a journal for a paper.",
    teacher: "Teacher or provider",
    teacherHint: "The author of the lessons, for the call number and the Citation.",
    year: "Year",
    url: "Course address (URL)",
    perWeek: "Lessons a week",
    perWeekHint: "For files whose names give no week and day.",
    perWeekInvalid: "Enter a whole number of 1 or more.",
    columns: {
      part: "Week · Day",
      title: "Title",
      words: "Words",
      state: "State",
    },
    partLabel: (file: string) => `Week and day for ${file}`,
    titleLabel: (file: string) => `Title for ${file}`,
    states: {
      new: "New",
      taken: "Already in your Graph",
      named: "A Source has this file name. Change the title.",
      added: "Added",
      failed: "Not added",
    },
    count: (n: number) => count(n, "lesson", "lessons"),
    submit: (n: number) => `Add ${count(n, "lesson", "lessons")}`,
    adding: (done: number, all: number) =>
      `Adding lesson ${numbers.format(done)} of ${numbers.format(all)}…`,
    done: (added: number, skipped: number) =>
      skipped === 0
        ? `${count(added, "lesson", "lessons")} added.`
        : `${count(added, "lesson", "lessons")} added; ${numbers.format(skipped)} were already in your Graph or could not be added.`,
    openFirst: (part: string) => `Open ${lessonPart(part)}`,
    seeSources: "See them in Sources",
    needFiles: "Choose the lesson files first.",
    filled: "Filled in from the files. Check the marked fields.",
    fromFolder: "From the folder name",
    filledFolder: "Filled in from the folder name. Check the marked field.",
    filledBoth: "Filled in from the files and the folder name. Check the marked fields.",
    reading: "Reading the files…",
    emptyFiles: (names: string) =>
      `These lesson files are empty: ${names}. Fix them, then choose again.`,
    noMarkdown: "There are no Markdown files there. Choose a folder or files that end in .md.",
    yearGuess: "This year, as a guess. Change it for an older course.",
    another: "Choose other files",
    keep: (n: number) => `Keep the ${count(n, "lesson", "lessons")}`,
    someFiles: (n: number) => count(n, "lesson file", "lesson files"),
    submitAny: "Add the lessons",
    badPart: "Write week and day as 2.3.",
    clash: (parts: string) =>
      `Two lessons have the same week and day (${parts}). Change one of them.`,
    retry: (n: number) => `Add ${count(n, "remaining lesson", "remaining lessons")}`,
    skippedFiles: (n: number) => `${count(n, "file was", "files were")} not Markdown and left out.`,
  },
};

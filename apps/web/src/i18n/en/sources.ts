import type { ReadingStep } from "@glose/contracts";
import type { MissingDetail } from "../../domain/source.ts";
import { numbers, count, list, monthYear } from "./format.ts";

export const sourceMessages = {
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
};

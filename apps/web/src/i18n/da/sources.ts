import type { ReadingStep } from "@glose/contracts";
import type { MissingDetail } from "../../domain/source.ts";
import { numbers, count, list, monthYear, capitalised } from "./format.ts";
import type { Messages } from "../en.ts";

export const sourceMessages: Pick<Messages, "source" | "sources" | "addSource"> = {
  source: {
    firstPublished: (year: number) => `først udgivet ${year}`,
    callNumberLabel: (callNumber: string) => `Opstillingssignatur ${callNumber}`,
    page: (page: string) => (page.startsWith("¶") ? page : `s. ${page}`),
    missingTitle: "Mangler for en korrekt kildehenvisning",
    missing: {
      firstPublished: "Året for første udgivelse",
      publisher: "Forlaget",
      container: "Hvor den udkom: tidsskriftet, webstedet eller kurset",
    },
    missingInline: {
      firstPublished: "året for første udgivelse",
      publisher: "forlaget",
      container: "hvor den udkom",
    },
    missingLine: (missing: ReadonlyArray<string>) =>
      `Mangler for en korrekt kildehenvisning: ${list.format(missing)}.`,
    howToFix: "Sådan tilføjer du det",
    missingHowTo:
      "Tilføj det i kildens Markdown-fil i Graf-mappen. Redigering i Glose kommer i en senere version.",
    details: "Bibliografiske data",
    fields: {
      author: "Forfatter",
      title: "Titel",
      firstPublished: "Først udgivet",
      edition: "Udgave",
      editionYear: "Udgaveår",
      publisher: "Forlag",
      translator: "Oversætter",
      file: "Fil",
    },
    fileName: (id: string) => `${id}.md`,
  },
  sources: {
    title: "Kilder",
    counts: (all: number, inProgress: number) =>
      inProgress === 0
        ? count(all, "kilde", "kilder")
        : `${count(all, "kilde", "kilder")} · ${numbers.format(inProgress)} i gang`,
    desk: "På skrivebordet",
    deskCount: (n: number) => `${numbers.format(n)} i gang`,
    deskEmpty:
      "Intet på skrivebordet: alle kilder er læst. Tilføj den næste, når du begynder på den.",
    state: (step: Exclude<ReadingStep, "done">, words: number, notes: number) =>
      ({
        "free-text": `Fri tekst · ${count(words, "ord", "ord")}`,
        read: "Læser",
        extraction: `Udtræk · ${count(notes, "note", "noter")} skrevet`,
        probe: `Sondering · ${count(notes, "note", "noter")}`,
      })[step],
    register: "Registret",
    find: "Find en kilde",
    findPlaceholder: "Titel, forfatter, signatur",
    order: "Rækkefølge",
    orders: {
      added: "Tilføjet",
      call: "Opstillingssignatur",
      author: "Forfatter",
    },
    reading: "Læsning",
    readingFilters: {
      all: "Alle læsetrin",
      "in-progress": "I gang",
      done: "Læst",
    },
    citation: "Kildehenvisning",
    citationFilters: {
      all: "Alle kildedata",
      ready: "Klar til kildehenvisning",
      missing: "Mangler data",
    },
    hint: "Vælg et antal under links for at fremhæve kilderne.",
    hintSelected: (title: string, n: number) =>
      n === 0
        ? `${title} deler ingen links med andre kilder.`
        : `${count(n, "kilde deler", "kilder deler")} links med ${title}.`,
    clearSelection: "Ryd",
    columns: {
      call: "Opstillingssignatur",
      title: "Titel",
      reading: "Læsning",
      notes: "Noter",
      located: "Med placering",
      links: "Links til andre kilder",
      citation: "Kildehenvisning",
    },
    monthGroup: (year: number, month: number, n: number) =>
      `${capitalised(monthYear.format(new Date(year, month)))} · ${numbers.format(n)} tilføjet`,
    letterGroup: (letter: string, n: number) => `${letter} · ${count(n, "kilde", "kilder")}`,
    steps: {
      "free-text": "I fri tekst",
      read: "Læses",
      extraction: "I udtræk",
      probe: "I sondering",
      done: "Læst",
    },
    located: (located: number, notes: number) =>
      `${numbers.format(located)} af ${numbers.format(notes)}`,
    noNotes: "Ingen noter",
    linkedSources: (n: number) => count(n, "kilde", "kilder"),
    standsAlone: "Står alene",
    shared: (n: number) => `${numbers.format(n)} fælles`,
    sharedWith: (n: number, title: string) => `${count(n, "link", "links")} fælles med ${title}`,
    showLinks: (title: string) => `forbundet med ${title}`,
    ready: "Klar",
    missing: (missing: ReadonlyArray<MissingDetail>) =>
      missing.length > 1
        ? missing.includes("container")
          ? "Intet år eller sted"
          : "Intet år eller forlag"
        : missing[0] === "firstPublished"
          ? "Intet år"
          : missing[0] === "container"
            ? "Intet tidsskrift, websted eller kursus"
            : "Intet forlag",
    matching: (shown: number, total: number) =>
      `${numbers.format(shown)} af ${count(total, "kilde", "kilder")}`,
    nothingFound: "Ingen kilde passer.",
    clearFilters: "Ryd søgning og filtre",
  },
  addSource: {
    title: "Tilføj kilde",
    find: "Find bogen",
    findHint:
      "Søg i Open Library, et åbent bogkatalog. Når du vælger en bog, udfyldes formularen nedenfor. Et ISBN finder netop din udgave.",
    searchLabel: "Titel, forfatter eller ISBN",
    search: "Søg",
    searching: "Søger i Open Library",
    results: "Bøger i Open Library",
    noResults:
      "Open Library har ingen bog, der passer. Prøv andre ord, eller udfyld formularen selv.",
    unavailable:
      "Open Library svarede ikke. Tjek internetforbindelsen, eller udfyld formularen selv.",
    resultEdition: (publisher: string | null, year: number | null) => {
      const parts = [publisher, year].filter((part) => part !== null);
      return parts.length === 0 ? "" : `Udgave: ${parts.join(", ")}`;
    },
    partBreak: ". ",
    notYourCopy:
      "Ikke dit eksemplar? Søg på det ISBN, der står i din bog, for at få netop den udgave.",
    filledTitle: (title: string) => `Udfyldt fra Open Library: ${title}`,
    filled:
      "Tjek felterne mærket Fra Open Library mod dit eksemplar. Titel, forlag og udgaveår skal være dem fra den bog, du har læst.",
    keptTyped: "Felter, du selv har skrevet i, er beholdt.",
    undoFill: "Fortryd",
    fromCatalog: "Fra Open Library",
    intro:
      "En bog du læser eller har læst. En kildehenvisning kræver fuldstændige data, så udfyld det du har. Glose viser, hvad der mangler.",
    author: "Forfatter",
    work: "Værk",
    familyName: "Efternavn",
    givenName: "Fornavn",
    titleField: "Titel",
    firstPublished: "Først udgivet",
    firstPublishedHint: "Året værket først udkom, for eksempel 1958.",
    edition: "Udgave",
    editionHint: "Som det står i dit eksemplar, for eksempel 2.",
    editionYear: "Udgaveår",
    publisher: "Forlag",
    translator: "Oversætter",
    yearInvalid: "Skriv året med tal, for eksempel 1958.",
    submit: "Tilføj kilde",
    cancel: "Annullér",
    nameTaken: (fileName: string) =>
      `Graf-mappen har allerede en fil med navnet "${fileName}". Ret titlen, eller åbn den kilde, der findes.`,
  },
};

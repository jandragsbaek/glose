import { isPageNumber, isTimestamp, type ReadingStep } from "@glose/contracts";
import type { MissingDetail } from "../../domain/source.ts";
import { numbers, count, list, monthYear, capitalised } from "./format.ts";
import type { Messages } from "../en.ts";

export const sourceMessages: Pick<
  Messages,
  "source" | "sources" | "addSource" | "sourceMenu" | "startOver" | "deleteSource"
> = {
  source: {
    firstPublished: (year: number) => `først udgivet ${year}`,
    callNumberLabel: (callNumber: string) => `Opstillingssignatur ${callNumber}`,
    page: (page: string, video = false) =>
      page.startsWith("¶") || (video && isTimestamp(page)) || !isPageNumber(page)
        ? page
        : `s. ${page}`,
    missingTitle: "Mangler for en korrekt kildehenvisning",
    missing: {
      firstPublished: "Året for første udgivelse",
      publisher: "Forlaget",
      container: "Hvor den udkom: tidsskriftet, webstedet eller kurset",
      channel: "Hvor den udkom: kanalen eller begivenheden",
    },
    missingInline: {
      firstPublished: "året for første udgivelse",
      publisher: "forlaget",
      container: "hvor den udkom",
      channel: "kanalen eller begivenheden",
    },
    missingLine: (missing: ReadonlyArray<string>) =>
      `Mangler for en korrekt kildehenvisning: ${list.format(missing)}.`,
    howToFix: "Sådan tilføjer du det",
    missingHowTo:
      "Tilføj det i kildens Markdown-fil i arkivet. Redigering i Glose kommer i en senere version.",
    details: "Bibliografiske data",
    fields: {
      author: "Forfatter",
      title: "Titel",
      firstPublished: "Først udgivet",
      edition: "Udgave",
      editionYear: "Udgaveår",
      publisher: "Forlag",
      translator: "Oversætter",
      speaker: "Taler",
      channel: "Kanal eller begivenhed",
      address: "Adresse",
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
        passages: `Passager · ${count(notes, "note", "noter")} skrevet`,
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
      passages: "I passager",
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
        ? missing.includes("container") || missing.includes("channel")
          ? "Intet år eller sted"
          : "Intet år eller forlag"
        : missing[0] === "firstPublished"
          ? "Intet år"
          : missing[0] === "container"
            ? "Intet tidsskrift, websted eller kursus"
            : missing[0] === "channel"
              ? "Ingen kanal eller begivenhed"
              : "Intet forlag",
    matching: (shown: number, total: number) =>
      `${numbers.format(shown)} af ${count(total, "kilde", "kilder")}`,
    nothingFound: "Ingen kilde passer.",
    clearFilters: "Ryd søgning og filtre",
  },
  addSource: {
    title: "Tilføj kilde",
    book: "Bogen",
    findHint:
      "Søger i Open Library, et åbent bogkatalog. Et resultat udfylder felterne nedenfor; du kan også skrive dem selv. Et ISBN finder netop din udgave.",
    showResults: (n: number) => `Vis alle ${count(n, "resultat", "resultater")}`,
    checkFields:
      "Nogle felter ovenfor mangler en værdi eller skal rettes. Markøren står i det første.",
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
    filled: "Udfyldt fra Open Library. Tjek de mærkede felter mod dit eksemplar.",
    emptied:
      "Open Library havde ingen værdi for nogle felter, som en tidligere bog udfyldte, så de er tomme nu.",
    keptTyped: "Felter, du selv har skrevet i, er beholdt.",
    undoFill: "Fortryd",
    fromCatalog: "Fra Open Library",
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
    editionYearHint: "Året for det eksemplar, du har læst.",
    more: "Udgave og oversætter",
    publisher: "Forlag",
    translator: "Oversætter",
    yearInvalid: "Skriv året med tal, for eksempel 1958.",
    submit: "Tilføj kilde",
    cancel: "Annullér",
    nameTaken: (fileName: string) =>
      `Arkivet har allerede en fil med navnet "${fileName}". Ret titlen, eller åbn den kilde, der findes.`,
  },
  sourceMenu: {
    label: "Mere for denne kilde",
    startOver: "Begynd forfra…",
    delete: "Slet kilde…",
  },
  startOver: {
    title: (title: string) => `Begynd forfra på ${title}`,
    where: "Hvor er du med denne bog nu?",
    lead: "Din læsning begynder igen ved første trin. Den gamle sondering og det gamle udtræk lægges til side.",
    setAside: "Lægges til side",
    setAsideHint: "Gemmes i arkivet: optegnelsen over sonderingen flyttes til Probes/Set aside.",
    stays: "Bliver",
    probe: (questions: number) => `Sonderingen (${count(questions, "spørgsmål", "spørgsmål")})`,
    extraction: "Udtrækket og dets kernepunkter",
    nothingSetAside: "Intet endnu.",
    freeText: (words: number) => `Fri tekst (${count(words, "ord", "ord")})`,
    passages: (n: number) => count(n, "passage", "passager"),
    notes: (n: number) => count(n, "note", "noter"),
    nothingStays: "Intet endnu.",
    loading: "Ser på kilden",
    start: "Begynd forfra",
    startAt: (step: string) => `Begynd forfra: ${step}`,
    starting: "Begynder forfra",
    cancel: "Annullér",
  },
  deleteSource: {
    title: (title: string) => `Slet ${title}?`,
    lead: "Det fjerner kilden og det, der kun hører til den:",
    file: (fileName: string) => `Kildefilen, ${fileName}`,
    text: "Dens tekst i Articles",
    video: "Dens gemte lektionsvideo",
    freeText: (words: number) => `Dens fri tekst (${count(words, "ord", "ord")})`,
    passages: (n: number) => `Dens ${count(n, "passage", "passager")}`,
    probe: (questions: number) =>
      `Dens sondering (${count(questions, "spørgsmål", "spørgsmål")}) og optegnelsen i Probes`,
    extraction: "Dens udtræk",
    setAside: (n: number) =>
      `${count(n, "sondering eller udtræk", "sonderinger og udtræk")}, der blev lagt til side ved Begynd forfra`,
    linkedFrom: (n: number) =>
      `${count(n, "note linker", "noter linker")} til den. De links vil pege på intet:`,
    versions: "En tidligere version gemmer en kopi.",
    inUseTitle: "Glose kan ikke slette denne kilde endnu",
    inUse:
      "Andet arbejde bygger på den. Slet eller flyt det arbejde først, eller begynd forfra på kilden.",
    notes: "Noter fra denne kilde:",
    writing: "Skriveprojekter, der henviser til den:",
    startOverInstead: "Begynd forfra i stedet…",
    delete: "Slet kilde",
    deleting: "Sletter",
    cancel: "Annullér",
    close: "Luk",
  },
};

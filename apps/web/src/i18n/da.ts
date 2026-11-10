import type { Messages } from "./en.ts";

const numbers = new Intl.NumberFormat("da");
const plurals = new Intl.PluralRules("da");
const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
const list = new Intl.ListFormat("da", { type: "conjunction" });
const longDate = new Intl.DateTimeFormat("da-DK", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** The Danish catalog. Typed by the English one, so a missing message fails the typecheck. */
export const da: Messages = {
  app: {
    name: "Glose",
    mark: "GLO",
  },
  nav: {
    label: "Afsnit",
    today: "I dag",
    graph: "Graf",
    writingProjects: "Skrive\u00ADprojekter",
    recall: "Genkaldelse",
    settings: "Indstillinger",
    language: "Sprog i programmet",
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
    retry: "Prøv igen",
    optional: "valgfri",
    loading: "Indlæser",
  },
  errors: {
    storage: "Glose kunne ikke læse eller skrive sine filer.",
    storageRecovery:
      "Tjek at Graf-mappen stadig findes, og at Glose må skrive i den. Prøv så igen.",
    unexpected: "Noget gik galt i Glose. Prøv igen.",
    notFoundTitle: "Siden findes ikke",
    notFound: "Denne side findes ikke i Glose.",
    sourceNotFound: "Denne kilde findes ikke. Dens Markdown-fil kan være omdøbt eller slettet.",
    backToToday: "Tilbage til I dag",
  },
  setup: {
    title: "Velkommen til Glose",
    intro:
      "Tre valg, så åbner Glose på I dag. Intet forlader din computer, undtagen det du senere sender til ChatGPT.",
    languageStep: "Sprog",
    languageHint:
      "Sproget i programmet. Noter og skriveprojekter kan være på alle sprog. Du kan ændre det senere under Indstillinger.",
    folderStep: "Graf-mappe",
    folderHint:
      "Glose gemmer hver kilde og note som en Markdown-fil i denne mappe, og sine egne indstillinger i en skjult .glose-mappe i den. Flyt mappen, eller del den gennem Dropbox eller git, så følger grafen med.",
    folderActions: {
      create: "Start en ny graf",
      open: "Åbn en eksisterende mappe",
    },
    folderActionHints: {
      create: "Glose opretter en tom mappe på denne sti.",
      open: "En graf, som du har flyttet, eller som nogen deler med dig, eller en mappe med Markdown-filer.",
    },
    folderLabel: "Mappens sti",
    chatgptStep: "ChatGPT",
    chatgptHint:
      "Udtræk og sondering bruger dit eget ChatGPT-abonnement. Glose kan ikke forbinde til ChatGPT endnu, så dette trin springes over indtil videre. Du kan allerede tilføje kilder og skrive fri tekst.",
    submit: "Begynd at bruge Glose",
    folderErrors: {
      "not-absolute": "Skriv mappens fulde sti, helt fra toppen af disken.",
      "not-a-folder": "Denne sti er en fil, ikke en mappe. Vælg en mappe.",
      "not-found": "Der er ingen mappe på denne sti. Vælg Start en ny graf for at oprette den.",
      "not-empty":
        "Mappen indeholder allerede filer. Vælg Åbn en eksisterende mappe for at bruge dem i Glose.",
      "not-writable": "Glose kan ikke skrive i mappen. Vælg en mappe, som du må skrive i.",
    },
  },
  today: {
    title: "I dag",
    date: (date: Date) => longDate.format(date),
    addSource: "Tilføj kilde",
    inProgress: "Kilde i gang",
    continue: {
      "free-text": "Fortsæt fri tekst",
      extraction: "Fortsæt udtræk",
      probe: "Fortsæt sondering",
      done: "Åbn kilde",
    },
    alsoInProgress: "Også i gang",
    open: "Åbn",
    noSourceTitle: "Tilføj den bog, du læser",
    noSourceBody:
      "Hver note starter i en kilde. Tilføj en, skriv frit om den, og Glose hjælper dig med at gøre den til noter.",
    notesNear: "Noter tæt på dit arbejde",
    notesNearEmpty:
      "Noter fra kilden, du er i gang med, og de noter de linker til, vises her. Noter kommer fra udtræk.",
    recall: "Genkaldelse",
    recallEmpty:
      "Ingen kort endnu. Kort laves af noter, og Genkaldelse planlægger, hvornår du skal gennemgå dem.",
    writingProject: "Skriveprojekt",
    writingEmpty: "Ingen skriveprojekter endnu. De kommer i en senere version af Glose.",
    aiText: "Noter med AI-tekst",
    aiTextEmpty:
      "Ingen AI-tekst. Når AI'en skriver en note, vises noten her, indtil du har omskrevet den med dine egne ord.",
  },
  steps: {
    label: "Læsning",
    names: {
      "free-text": "Fri tekst",
      extraction: "Udtræk",
      probe: "Sondering",
    },
    done: "færdig",
    current: "nuværende trin",
    words: (n: number) => count(n, "ord", "ord"),
    noFreeText: "sprunget over",
    waitsForChatGpt: "kræver ChatGPT",
  },
  source: {
    firstPublished: (year: number) => `først udgivet ${year}`,
    callNumberLabel: (callNumber: string) => `Opstillingssignatur ${callNumber}`,
    missingTitle: "Mangler for en korrekt kildehenvisning",
    missing: {
      firstPublished: "Året for første udgivelse",
      publisher: "Forlaget",
    },
    missingInline: {
      firstPublished: "året for første udgivelse",
      publisher: "forlaget",
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
  addSource: {
    title: "Tilføj kilde",
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
  reading: {
    freeText: "Fri tekst",
    freeTextHint:
      "Skriv frit om bogen med dine egne ord: hvad der blev hængende, hvad du tvivler på, hvad du vil forstå. Dette trin er valgfrit.",
    freeTextLabel: "Fri tekst om denne kilde",
    save: "Gem",
    saving: "Gemmer",
    saved: "Gemt",
    unsaved: "Ikke gemt",
    finish: "Afslut fri tekst",
    skip: "Spring fri tekst over",
    finished: "Fri tekst er afsluttet. Du kan stadig ændre den.",
    nextStep: "Næste trin",
    aiUnavailableTitle: "Udtræk venter på ChatGPT",
    aiUnavailable:
      "Udtræk og sondering kræver en forbindelse til ChatGPT. Glose kan ikke forbinde til ChatGPT endnu. Din frie tekst er gemt i kildens fil, klar til når det kan.",
  },
  graph: {
    title: "Graf",
    empty:
      "Grafen rummer dine noter og links mellem dem. Den er tom, indtil udtræk laver de første noter fra en kilde.",
  },
  writing: {
    title: "Skriveprojekter",
    empty:
      "Et skriveprojekt er prosa, du selv skriver, med henvisninger til dine noter. Skriveprojekter kommer i en senere version.",
  },
  recall: {
    title: "Genkaldelse",
    empty:
      "Genkaldelse spørger dig om kort lavet af dine noter og planlægger hvert kort med FSRS. Den er tom, indtil du har noter.",
  },
  settings: {
    title: "Indstillinger",
    language: "Sprog i programmet",
    graphFolder: "Graf-mappe",
    graphFolderHint: "Skift af mappe kommer i en senere version.",
  },
};

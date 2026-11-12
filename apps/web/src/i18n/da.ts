import { ANSWER_WORDS, QUESTION_WORDS } from "@glose/contracts";

import { formatInterval } from "../domain/interval.ts";
import type { Messages } from "./en.ts";

const numbers = new Intl.NumberFormat("da");
const plurals = new Intl.PluralRules("da");
const count = (n: number, one: string, other: string) =>
  `${numbers.format(n)} ${plurals.select(n) === "one" ? one : other}`;
const list = new Intl.ListFormat("da", { type: "conjunction" });
const clockTime = new Intl.DateTimeFormat("da-DK", { timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short" });
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
      "Valgfrit. Du kan også forbinde senere under Indstillinger. Uden ChatGPT kan du stadig tilføje kilder og skrive fri tekst.",
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
      "Ingen kort endnu. Åbn en note i grafen, og vælg Lav kort. Genkaldelse planlægger, hvornår du skal gennemgå dem.",
    recallCounts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "kort", "kort")
        : `${count(cards, "kort", "kort")}, ${numbers.format(ai)} med AI-tekst`,
    openRecall: "Åbn Genkaldelse",
    writingProject: "Skriveprojekt",
    writingEmpty: "Ingen skriveprojekter endnu. De kommer i en senere version af Glose.",
    aiText: "Noter med AI-tekst",
    aiTextEmpty:
      "Ingen AI-tekst. Når AI'en skriver en note, vises noten her, indtil du har omskrevet den med dine egne ord.",
    aiTextCount: (n: number) => count(n, "note", "noter"),
    aiTextMore: (n: number) => `${count(n, "note mere", "noter mere")} i grafen.`,
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
    withChatGpt: "med ChatGPT",
    later: "kommer senere",
  },
  source: {
    firstPublished: (year: number) => `først udgivet ${year}`,
    callNumberLabel: (callNumber: string) => `Opstillingssignatur ${callNumber}`,
    page: (page: string) => `s. ${page}`,
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
  },
  chatgpt: {
    title: "ChatGPT",
    intro:
      "Udtræk og sondering bruger dit eget ChatGPT-abonnement. Glose har ingen konto selv: ChatGPT beder dig give Glose lov til at bruge dit abonnement og tæller forbruget dér.",
    continue: "Fortsæt med ChatGPT",
    lastAccount: (email: string) => `Sidst brugt med ${email}.`,
    otherAccount: "Brug en anden ChatGPT-konto",
    connecting: "Venter på ChatGPT",
    connectingHint:
      "Glose har åbnet ChatGPT i din browser. Log ind dér, og giv Glose lov til at bruge dit abonnement. Kom så tilbage hertil.",
    openAgain: "Åbn ChatGPT-siden igen",
    cancel: "Annullér",
    connected: (email: string) => `Forbundet som ${email}.`,
    usingPlan: "Bruger ChatGPT-abonnement",
    manageUsage: "Administrér forbrug",
    disconnect: "Afbryd forbindelsen",
    disconnectUnconfirmed:
      "Glose har glemt log-ind'et, men ChatGPT bekræftede ikke, at det er afsluttet. Afbryd Glose i ChatGPT's indstillinger for at være sikker.",
    planNotAllowedTitle: "Glose må ikke bruge dit ChatGPT-abonnement",
    planNotAllowed:
      "Du loggede ind, men gav ikke Glose lov til at bruge dit ChatGPT-abonnement. AI'en kan ikke arbejde uden.",
    allowPlan: "Giv lov til at bruge abonnementet",
    unknown: "Glose kan ikke se forbindelsen til ChatGPT lige nu.",
    problems: {
      declined: "Du sagde nej i ChatGPT, så Glose er ikke forbundet.",
      "port-busy":
        "Et andet program logger ind på ChatGPT samtidig, måske Codex. Gør det log-ind færdigt eller luk det, og prøv så igen.",
      "timed-out": "Log-ind'et tog for lang tid. Prøv igen.",
      "other-account":
        "Browseren loggede ind på en anden ChatGPT-konto. Prøv igen med samme konto, eller vælg Brug en anden ChatGPT-konto.",
      expired:
        "Log-ind'et på ChatGPT virker ikke længere. Det kan være udløbet, eller Glose er afbrudt i ChatGPT. Log ind igen.",
      failed: "Log-ind'et virkede ikke. Prøv igen.",
    },
    noticeTitle: "Du bruger dit ChatGPT-abonnement",
    noticeBody:
      "AI'en i Glose bruger nu dit ChatGPT-abonnement. Du kan se og begrænse forbruget i ChatGPT's indstillinger.",
    gotIt: "Forstået",
  },
  session: {
    needsChatGpt: "Udtræk kræver ChatGPT",
    needsChatGptBody:
      "Forbind dit ChatGPT-abonnement under Indstillinger, og kom så tilbage til denne kilde.",
    openSettings: "Åbn Indstillinger",
    transcript: "Session",
    you: "Dig",
    ai: "AI",
    tools: {
      "read-source": "AI'en læste denne kilde og din frie tekst.",
      "list-sources": "AI'en så på listen over dine kilder.",
      "read-note": "AI'en læste en note.",
      "list-cards": "AI'en så på de kort, noten allerede har.",
      "search-graph": "AI'en søgte i din graf.",
    },
    trail: {
      readSource: "Læste kilden og din frie tekst",
      listSources: "Så på dine kilder",
      readNote: "Læste",
      listCards: "Så på notens kort",
      searchGraph: (query: string) => `Søgte i din graf efter »${query}«`,
    },
    trailSummary: (read) => {
      const things = [
        ...(read.freeText ? ["din frie tekst"] : []),
        ...(read.notes > 0 ? [count(read.notes, "note", "noter")] : []),
        ...(read.sources ? ["dine kilder"] : []),
        ...(read.cards ? ["notens kort"] : []),
      ];
      const searched =
        read.searches === 0
          ? null
          : read.searches === 1
            ? "søgte i din graf"
            : `søgte i din graf ${numbers.format(read.searches)} gange`;
      const line = [things.length === 0 ? null : `læste ${list.format(things)}`, searched]
        .filter((part) => part !== null)
        .join(" · ");
      return line.charAt(0).toUpperCase() + line.slice(1);
    },
    live: (tool, detail) => {
      switch (tool) {
        case "read-source":
          return "Læser din frie tekst";
        case "list-sources":
          return "Ser på dine kilder";
        case "read-note":
          return detail === undefined ? "Læser en note" : `Læser ${detail}`;
        case "list-cards":
          return "Ser på notens kort";
        case "search-graph":
          return detail === undefined ? "Søger i din graf" : `Søger i din graf efter »${detail}«`;
        case null:
          return "Tænker";
      }
    },
    thought: (ms: number) =>
      ms < 1000 ? "Tænkte kort" : `Tænkte i ${numbers.format(Math.round(ms / 1000))} s`,
    youAbout: (point: number) => `Dig · om ${numbers.format(point)}`,
    about: "Om",
    clearAbout: "Tal om hele kilden",
    placeholder: "Svar, spørg eller sig imod",
    sendKey: { mac: "⌘ ↵", other: "Ctrl ↵" },
    pointsProposed: (n: number) => `Foreslog ${count(n, "punkt", "punkter")}`,
    pointAdded: "Tilføjede et punkt med dine ord",
    pointRef: (point: number) => `Punkt ${numbers.format(point)}`,
    passage: "Passage",
    messageLabel: "Dit svar",
    messageHint: "Tryk Ctrl+Enter eller Cmd+Enter for at sende.",
    send: "Send",
    stop: "Stop",
    retry: "Prøv igen",
    model: (model: string) => `Model ${model}`,
    sendFailed: "Glose kunne ikke sende din besked. Prøv igen.",
    problems: {
      "not-connected": "Forbindelsen til ChatGPT virker ikke. Log ind igen under Indstillinger.",
      "plan-not-allowed":
        "Glose må ikke bruge dit ChatGPT-abonnement. Giv lov under Indstillinger, og prøv så igen.",
      "usage-limit":
        "Forbrugsgrænsen er nået. Dit ChatGPT-abonnement, eller den andel du har givet Glose, er brugt op for nu. Se grænserne i ChatGPT's indstillinger.",
      "not-eligible":
        "Denne ChatGPT-konto kan ikke bruge sit abonnement i andre programmer. ChatGPT Plus og Pro kan.",
      unavailable: "ChatGPT kunne ikke nås. Prøv igen om lidt.",
      failed: "AI'en stoppede med en fejl. Prøv igen.",
    },
  },
  aiText: {
    paragraphs: () => "AI-afsnit",
    part: "AI-skrevet del",
    note: "AI-skrevet note",
    card: "AI-skrevet kort",
    title: "AI-skrevet titel",
  },
  extraction: {
    title: "Kernepunkter",
    count: (n: number) => count(n, "punkt", "punkter"),
    stepNote: (written: number, total: number) =>
      total === 0
        ? "med ChatGPT"
        : `${numbers.format(written)} af ${count(total, "punkt", "punkter")} skrevet`,
    showFreeText: "Læs",
    hideFreeText: "Skjul",
    startLead: "Find kildens kernepunkter",
    startBody:
      "AI'en læser din frie tekst og søger i din graf. Den foreslår kernepunkterne, siger hvor hvert punkt kommer fra, og hvordan det møder de noter, du har, og spørger dig om dem. Hvert punkt, du beholder, skriver du som en note med dine egne ord.",
    start: "Start udtræk",
    waiting: "AI'en læser. Dens punkter kommer her.",
    noPoints: "Ingen åbne punkter. Bed AI'en om flere, eller tilføj et punkt med dine egne ord.",
    proposed: (n: number) => `Foreslået af AI'en · ${numbers.format(n)}`,
    toWrite: "At skrive",
    written: "Skrevet",
    dropped: "Droppet",
    fromFreeText: "Fra din frie tekst:",
    notInFreeText: "Ikke i din frie tekst. Tjek det i dit eget eksemplar.",
    ownWords: "Dit eget punkt",
    repeats: "Du har denne note:",
    pullsAgainst: "Trækker imod",
    keep: "Behold",
    discuss: "Drøft",
    drop: "Drop",
    write: "Skriv",
    bringBack: "Hent tilbage",
    titleLabel: "Punkt, notens titel",
    textLabel: "Noten, med dine egne ord",
    page: "Side",
    linksHead: "Links fra din graf",
    addLink: "Tilføj",
    linkAdded: "Tilføjet",
    undo: "Fortryd",
    dropLink: "Drop",
    draftKept: "Noten beholder dette udkast, mærket som AI-tekst.",
    draftLeftOut: "Noten udelader dette udkast.",
    leaveDraftOut: "Udelad udkastet",
    keepDraft: "Behold udkastet",
    save: "Gem note",
    askDraft: "Bed om et udkast",
    draftRequest: "Skriv et udkast til dette punkts note.",
    proposeMore: "Foreslå flere",
    proposeMoreRequest: "Foreslå flere kernepunkter.",
    addOwn: "Tilføj et punkt med dine ord",
    addOwnLabel: "Dit punkt",
    addOwnHint: "Én påstand, som en hel sætning. Den bliver notens titel.",
    add: "Tilføj",
    cancel: "Annullér",
    showDropped: (n: number) => `${numbers.format(n)} droppet`,
    hideDropped: "Skjul droppede",
    openInGraph: "Åbn i grafen",
    links: (n: number) => count(n, "link", "links"),
    states: {
      open: "Foreslået",
      kept: "Beholdt",
      written: "Skrevet",
      dropped: "Droppet",
    },
    nameTaken: (name: string) =>
      `Din graf har allerede en fil med navnet »${name}«. Ret titlen, eller åbn den note.`,
    saveFailed: "Glose kunne ikke gemme noten. Prøv igen.",
    actionFailed: "Glose kunne ikke gemme det. Prøv igen.",
  },
  graph: {
    title: "Graf",
    empty:
      "Grafen rummer dine noter og links mellem dem. Den er tom, indtil udtræk laver de første noter fra en kilde.",
    counts: (notes: number, sources: number, links: number) =>
      [
        count(notes, "note", "noter"),
        count(sources, "kilde", "kilder"),
        count(links, "link", "links"),
      ].join(" · "),
    canvasLabel: (notes: number, links: number) =>
      `Grafen: ${count(notes, "punkt", "punkter")} forbundet af ${count(links, "link", "links")}. Panelet ved siden af viser de samme kilder og noter.`,
    findLabel: "Søg i grafen",
    findPlaceholder: "Find en note eller kilde",
    found: (n: number) => (n === 0 ? "Intet fundet" : `${numbers.format(n)} fundet`),
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    fit: "Vis hele grafen",
    help: "Rul eller knib for at zoome, og træk i baggrunden for at flytte rundt. Træk i et punkt for at trække i dets links. Klik på et punkt for at læse det her; dobbeltklik på en kilde for at åbne den.",
    sources: "Kilder",
    note: "Note",
    source: "Kilde",
    close: "Luk",
    noSource: "Noten nævner ingen kilde endnu.",
    linkCount: (n: number) => count(n, "link", "links"),
    noLinks: "Ingen links endnu.",
    notesFromSource: "Noter fra denne kilde",
    openSource: "Åbn kilden",
    missingLink: (name: string) => `Ingen fil hedder ${name} endnu.`,
    makeCards: "Lav kort",
    cardCount: (n: number) => (n === 0 ? "Ingen kort endnu" : count(n, "kort", "kort")),
  },
  writing: {
    title: "Skriveprojekter",
    empty:
      "Et skriveprojekt er prosa, du selv skriver, med henvisninger til dine noter. Skriveprojekter kommer i en senere version.",
  },
  recall: {
    title: "Genkaldelse",
    empty:
      "Genkaldelse spørger dig om kort lavet af dine noter og planlægger hvert kort med FSRS. Åbn en note i grafen, og vælg Lav kort for at lave kort.",
    counts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "kort", "kort")
        : `${count(cards, "kort", "kort")} · ${numbers.format(ai)} med AI-tekst`,
    findLabel: "Find kort",
    findPlaceholder: "Find et spørgsmål, svar eller en note",
    onlyAi: "Kun kort med AI-tekst",
    shown: (shown: number, total: number) =>
      `Viser ${numbers.format(shown)} af ${count(total, "kort", "kort")}.`,
    showMore: "Vis flere",
    nothingFound: "Intet kort passer.",
    gradeLabel: "Vurdering",
    allGrades: "Alle vurderinger",
  },
  review: {
    title: "Gennemgang",
    counts: (counts) =>
      `${count(counts.new, "ny", "nye")} · ${numbers.format(counts.learning)} under indlæring · ${count(counts.review, "forfalden", "forfaldne")}`,
    states: { new: "Nyt kort", learning: "Under indlæring", review: "Forfalden" },
    showAnswer: "Vis svar",
    didRecall: "Huskede du det?",
    forgot: "Glemt",
    recalled: "Husket",
    howWasIt: "Hvordan gik det?",
    efforts: { hard: "Med besvær", good: "Normalt", easy: "Med det samme" },
    back: "Tilbage",
    interval: (ms) => formatInterval("da", ms),
    start: "Start gennemgang",
    dueToday: (n) => `${count(n, "kort", "kort")} at gennemgå i dag.`,
    left: (n) => `${numbers.format(n)} tilbage`,
    stop: "Stop",
    keys: { space: "Mellemrum", escape: "Esc", backspace: "Backspace" },
    waitTitle: "Intet at gennemgå lige nu",
    nextAt: (at) => `Et kort under indlæring kommer igen kl. ${clockTime.format(at)}.`,
    doneTitle: "Færdig for i dag",
    doneToday: "Du har gennemgået alle kort for i dag. Flere kommer igen i morgen.",
    backToRecall: "Tilbage til Genkaldelse",
    failed: "Glose kunne ikke gemme gennemgangen. Prøv igen.",
  },
  cards: {
    extraction: "Kortudtræk",
    title: "Kort",
    start: "Lav kort af hele noten",
    startPassage: "Lav kort af passagen",
    startHint:
      "AI'en læser noten og foreslår kort. Du beholder, retter eller dropper hvert kort. Et kort, du beholder, er mærket som AI-tekst, indtil du har omskrevet det med dine egne ord.",
    needsChatGpt: "Kortudtræk kræver ChatGPT",
    needsChatGptBody:
      "Forbind dit ChatGPT-abonnement under Indstillinger, og kom så tilbage til denne note. Du kan stadig skrive dine egne kort.",
    noteNotFound: "Noten findes ikke. Dens Markdown-fil kan være omdøbt eller slettet.",
    backToGraph: "Tilbage til grafen",
    openInGraph: "Åbn i grafen",
    passage: "Passage",
    passageHint:
      "Vil du lave kort af en del af noten, så markér teksten ovenfor, og vælg Brug den markerede tekst.",
    useSelection: "Brug den markerede tekst",
    noSelection: "Markér først tekst i noten.",
    clearPassage: "Fjern passagen",
    sendPassage: "Lav kort af passagen",
    proposals: "Foreslåede kort",
    question: "Spørgsmål",
    answer: "Svar",
    keep: "Behold",
    edit: "Ret",
    drop: "Drop",
    save: "Gem",
    cancel: "Annullér",
    states: {
      open: "Foreslået",
      kept: "Beholdt",
      dropped: "Droppet",
    },
    keepFailed: "Glose kunne ikke gemme kortet. Prøv igen.",
    fromNote: (n: number) =>
      n === 0 ? "Ingen kort fra denne note endnu." : count(n, "kort", "kort"),
    write: "Skriv dit eget kort",
    writeHint: "Et kort med dine egne ord har intet AI-mærke.",
    add: "Tilføj kort",
    saveFailed: "Glose kunne ikke gemme kortet. Prøv igen.",
    from: "Fra",
    fromNone: "Fra ingen note",
    rewrote: "Jeg har omskrevet det",
    rewroteHint: "Fjerner AI-mærket. Vælg det, når spørgsmål og svar er med dine egne ord.",
    delete: "Slet",
    deleteConfirm: "Slet dette kort? Glose fjerner filen fra mappen Cards.",
    file: (file: string) => `Cards/${file}.md`,
  },
  score: {
    label: "Tjek",
    grades: {
      good: "Godt kort",
      fix: "Kan blive bedre",
      poor: "Skal rettes",
    },
    judge: {
      done: "",
      pending: "AI'en tjekker kortet.",
      off: "Forbind ChatGPT i Indstillinger for også at få AI-tjek.",
      failed: "AI'en kunne ikke tjekke kortet. Glose prøver igen senere.",
    },
    verdicts: {
      pass: "Bestået",
      warn: "Advarsel",
      fail: "Ikke bestået",
    },
    passed: (n: number) => `${count(n, "tjek", "tjek")} bestået`,
    ai: "AI-tjek",
    aiHint: "AI-tjek er råd. I forsøg er AI-dommere enige med mennesker om cirka to af tre kort.",
    rulesWhileTyping: "Tjek, mens du skriver",
    checks: {
      "has-answer": {
        name: "Har et svar",
        tip: "Skriv svaret, så en gennemgang kan tjekke, hvad du husker.",
      },
      recall: {
        name: "Beder dig huske, ikke vælge",
        tip: "Et ja, et nej eller et valg kan gættes. Spørg hvad, hvorfor eller hvordan.",
      },
      "not-broad": {
        name: "Beder om ét svar, ikke en stil",
        tip: "Forklar eller Beskriv beder om en stil. Spørg efter én ting, du kan huske.",
      },
      concise: {
        name: "Kort",
        tip: `Hold spørgsmålet under ${QUESTION_WORDS} ord og svaret under ${ANSWER_WORDS}. Del et længere kort.`,
      },
      "no-list": {
        name: "Ingen liste at remse op",
        tip: "En liste er svær at huske som ét kort. Lav et kort for hvert punkt, eller et kort om idéen, der samler dem.",
      },
      "no-giveaway": {
        name: "Røber ikke svaret",
        tip: "De fleste ord i svaret står i spørgsmålet. Spørg, så du skal huske dem.",
      },
      distinct: {
        name: "Kan ikke forveksles med et andet kort",
        tip: "Et andet kort fra denne note spørger næsten om det samme. Gør spørgsmålene forskellige, eller slå kortene sammen.",
      },
      "one-answer": {
        name: "Ét præcist svar",
        tip: "Spørgsmålet skal have ét rigtigt svar: svaret på dette kort.",
      },
      specific: {
        name: "Præcist, ikke bredt eller vagt",
        tip: "Sig præcist, hvad der skal huskes.",
      },
      "self-contained": {
        name: "Klart uden noten",
        tip: "Nævn emnet, så kortet er klart om flere måneder.",
      },
      "one-idea": {
        name: "Én idé",
        tip: "Spørg efter én kendsgerning eller én idé. Del kortet.",
      },
      "true-to-note": {
        name: "Tro mod sin note",
        tip: "Svaret skal stå i noten, uden tilføjede fakta.",
      },
    },
  },
  versions: {
    title: "Versioner af din graf",
    off: "Ingen versioner",
    offReasons: {
      "no-graph": "Glose gemmer versioner, når du har valgt en graf-mappe.",
      "no-git":
        "Git er ikke installeret på denne computer. Installer Git, og start Glose igen for at gemme versioner af din graf.",
      "other-repository":
        "Graf-mappen ligger i et andet git-repository. Glose laver ikke commits der.",
      failed: "Git kunne ikke oprette et repository i graf-mappen.",
    },
    saved: (at: Date, today: boolean) =>
      `Gemt ${today ? clockTime.format(at) : shortDate.format(at)}`,
    notSavedYet: "Ikke gemt endnu",
    saving: "Gemmer…",
    syncing: "Synkroniserer…",
    unsaved: "Ændringer er ikke gemt endnu",
    changes: "Ændringer",
    allSaved: "Alt er gemt.",
    pending: "Ikke gemt endnu. Glose gemmer dem efter 5 minutter uden ændringer.",
    remote: "Remote",
    noRemote:
      "Ingen. Versionerne bliver på denne computer. Tilføj et git-remote for at tage backup.",
    sync: "Synkronisering",
    synced: (at: Date, today: boolean) =>
      `Synkroniseret ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    notSynced: "Ikke synkroniseret, siden Glose startede.",
    unpushed: (n: number) => `${count(n, "version", "versioner")} er ikke pushet endnu.`,
    problemsShort: {
      conflict: "Konflikt ved synkronisering",
      "sync-failed": "Ikke synkroniseret",
      "save-failed": "Ikke gemt",
    },
    problems: {
      conflict:
        "De samme linjer er ændret på denne computer og på remote. Glose beholdt alle versioner og synkroniserede ikke. Saml ændringerne med git. Så synkroniserer Glose igen.",
      "sync-failed": "Glose kunne ikke synkronisere med remote. Glose prøver igen efter næste gem.",
      "save-failed": "Git kunne ikke gemme en version. Glose prøver igen ved næste ændring.",
    },
    endDay: "Afslut dagen",
    endDayHint: "Skriv én linje om i dag. Glose gemmer den som en version og synkroniserer den.",
    summary: "I dag",
    summaryPlaceholder: "Læste Arendt, skrev to noter",
    dayEnded: "Dagen er gemt som en version.",
  },
  settings: {
    title: "Indstillinger",
    language: "Sprog i programmet",
    graphFolder: "Graf-mappe",
    graphFolderHint: "Skift af mappe kommer i en senere version.",
  },
};

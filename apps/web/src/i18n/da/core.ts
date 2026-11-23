import { numbers, count, shortDate, longDate } from "./format.ts";
import type { Messages } from "../en.ts";

export const coreMessages: Pick<
  Messages,
  "app" | "nav" | "languages" | "languageCodes" | "common" | "errors" | "setup" | "today" | "steps"
> = {
  app: {
    name: "Glose",
    mark: "GLO",
  },
  nav: {
    label: "Afsnit",
    today: "I dag",
    sources: "Kilder",
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
    required: "skal udfyldes",
    loading: "Indlæser",
  },
  errors: {
    storage: "Glose kunne ikke læse eller skrive sine filer.",
    storageRecovery: "Tjek at arkivet stadig findes, og at Glose må skrive i det. Prøv så igen.",
    unexpected: "Noget gik galt i Glose. Prøv igen.",
    notFoundTitle: "Siden findes ikke",
    notFound: "Denne side findes ikke i Glose.",
    sourceNotFound: "Denne kilde findes ikke. Dens Markdown-fil kan være omdøbt eller slettet.",
    backToToday: "Tilbage til I dag",
  },
  setup: {
    title: "Sæt Glose op",
    purpose:
      "Glose hjælper dig med at læse en bog, gemme det vigtige fra den og skrive om den med dine egne ord.",
    length: "Fem korte trin. Du kan ændre sprog og udseende senere under Indstillinger.",
    stepsLabel: "Trin",
    steps: {
      look: "Sprog og udseende",
      vault: "Arkiv",
      sections: "Sådan virker Glose",
      chatgpt: "ChatGPT",
      book: "Din første bog",
    },
    stepHints: {
      look: "",
      vault: "Mappen til dit arbejde",
      sections: "Graf, Skriveprojekter, Genkaldelse",
      chatgpt: "Valgfrit",
      book: "Valgfrit",
    },
    stepState: {
      done: "Færdig",
      current: "Nuværende trin",
      locked: "Efter arkivet",
      skipped: "Sprunget over",
    },
    lookValue: (language, theme) => `${language} · ${theme}`,
    sectionsRead: "Læst",
    chatgptConnected: "Forbundet",
    chatgptLater: "Senere",
    vaultHasSources: (n) => `Dit arkiv har ${count(n, "kilde", "kilder")}`,
    languageLegend: "Sprog i programmet",
    languageHint: "Sproget i programmet. Noter og skriveprojekter kan være på alle sprog.",
    folderHint:
      "Dit arkiv er en helt almindelig mappe på denne computer. Glose gemmer alle dine kilder, noter og kort i den som almindelige filer, så de forbliver dine, og andre programmer også kan åbne dem.",
    privacy:
      "Dine filer bliver på denne computer, undtagen det du gemmer på GitHub eller sender til ChatGPT.",
    folderActions: {
      create: "Start et nyt arkiv",
      open: "Åbn en eksisterende mappe",
      clone: "Hent det fra GitHub",
    },
    folderActionHints: {
      create: "Glose opretter en ny mappe til dit arbejde.",
      open: "Et arkiv, som du har flyttet, eller som nogen deler med dig, eller en mappe med Markdown-filer.",
      clone: "Glose lægger kopien i en ny mappe.",
    },
    folderLabel: "Mappens sti",
    where: "Hvor",
    folderNotChosen: "Ingen mappe valgt endnu",
    placeHome: (home) => `i din hjemmemappe (${home})`,
    placeIn: (trail) => `i ${trail}`,
    change: "Skift…",
    chooseOpen: "Vælg mappen…",
    typePath: "Skriv en sti i stedet",
    folderNeeded: "Vælg først den mappe, dit arkiv ligger i.",
    pickTitle: {
      create: "Vælg, hvor Glose skal oprette mappen til dit arkiv",
      open: "Vælg den mappe, dit arkiv ligger i",
      clone: "Vælg, hvor Glose skal lægge kopien af dit arkiv",
    },
    pickButton: {
      create: "Vælg dette sted",
      open: "Åbn denne mappe",
      clone: "Vælg dette sted",
    },
    vaultSubmit: {
      create: "Opret arkivet",
      open: "Åbn arkivet",
      clone: "Kopiér arkivet",
    },
    vaultDone: "Glose gemmer dit arbejde i denne mappe.",
    vaultFound: (n) =>
      n === 0 ? "Den har ingen kilder endnu." : `Den har ${count(n, "kilde", "kilder")}.`,
    sectionsIntro:
      "Glose har tre afsnit. Efter opsætningen finder du dem i venstre side af vinduet. AI'en gør forskelligt arbejde i hvert.",
    sections: {
      graph: {
        holds:
          "Noter fra det, du læser, forbundet med hinanden. Hver note kommer fra en kilde, så du kan finde siden igen.",
        ai: "AI'en må skrive noter. Dens tekst har dette mærke, indtil du skriver den om med dine egne ord.",
        sample:
          "Travlhed er en stedfortræder for produktivitet: det føles, som om arbejdet bliver gjort.",
      },
      writing: {
        holds: "Din egen prosa: blogindlæg og universitetsopgaver, der henviser til dine noter.",
        ai: "AI'en foreslår noter at henvise til og tjekker dine kildehenvisninger. Den skriver aldrig din prosa.",
      },
      recall: {
        holds: "Kort lavet af dine noter, som kommer igen lige før, du ville glemme dem.",
        ai: "AI'en må foreslå kort. De har samme mærke, indtil du skriver dem om.",
        sample: "Hvad gør opmærksomhedsrester ved den næste opgave?",
      },
    },
    bookIntro: "Tilføj den bog, du læser nu. Så åbner Glose den, klar til at begynde.",
    bookKnown: (n) =>
      `Dit arkiv har allerede ${count(n, "kilde", "kilder")}. I dag viser dem, du er i gang med.`,
    continue: "Fortsæt",
    back: "Tilbage",
    toToday: "Gå til I dag",
    later: "Senere",
    laterToday: "Senere, gå til I dag",
    addBook: "Tilføj bogen",
    chatgptIntro:
      "AI'en i Glose bruger dit eget ChatGPT-abonnement. Den hjælper med at gøre det, du skriver om en bog, til noter, stiller dig spørgsmål om bogen og foreslår kort. Glose har ingen konto selv: ChatGPT beder dig give Glose lov til at bruge dit abonnement.",
    notNow: "Ikke nu",
    chatgptHint:
      "Valgfrit. Du kan også forbinde senere under Indstillinger. Uden ChatGPT kan du stadig tilføje kilder og skrive fri tekst.",
    copying: "Kopierer dit arkiv…",
    remote: {
      from: "Fra",
      notChosen: "Ikke valgt endnu",
      yours: "Din",
      sharedBy: (owner) => `Delt af ${owner}`,
      choose: "Vælg på GitHub",
      chooseAgain: "Vælg en anden",
      useRemote: "Brug et andet git-remote",
      backupNote: "Glose holder backuppen af arkivet opdateret der efter hvert gem.",
      missing: "Vælg, hvor dit arkiv skal hentes fra.",
      title: "Hent dit arkiv fra GitHub",
      intro:
        "Glose kopierer dit arkiv fra et privat repository på GitHub og holder backuppen opdateret der efter hvert gem. Forbind GitHub for at se dine repositories.",
      codeIntro: "Skriv denne kode på GitHubs side. Så kan Glose læse dine private repositories.",
      chooseVault: "Vælg arkivet",
      listHint: "Private repositories, som du ejer, eller som andre deler med dig.",
      vault: "Arkiv",
      updated: (at) => `Opdateret ${shortDate.format(at)}`,
      others: (n) => `Andre repositories (${numbers.format(n)})`,
      othersHint:
        "Intet arkiv i dem endnu. Vælger du et, laver Glose et arkiv af dets filer, som de er.",
      none: "Glose fandt ingen private repositories på GitHub. Tag først backup af arkivet til GitHub under Indstillinger på den anden computer, eller brug en anden konto.",
      listFailed: "GitHub svarede ikke. Prøv igen om lidt.",
      useThis: "Brug dette repository",
      notEmpty:
        "Mappen indeholder allerede filer. Glose kopierer kun et arkiv til en mappe, der ikke findes eller er tom.",
      gitHubFailed:
        "Glose kunne ikke kopiere repositoriet fra GitHub. Tjek internetforbindelsen, og prøv igen, eller vælg repositoriet igen.",
      copyingNote: "Et stort arkiv kan tage nogle minutter.",
      remoteIntro:
        "Glose kopierer arkivet fra et git-remote, du allerede har, med dit eget git-login: en SSH-nøgle eller en credential helper.",
      errors: {
        "no-git": "Glose skal bruge git for at kopiere et arkiv. Installér git, og prøv igen.",
        unreachable:
          "Git kunne ikke nå det remote eller logge ind på det. Tjek adressen, og at git på denne computer kan læse det.",
      },
    },
    folderErrors: {
      "not-absolute": "Skriv mappens fulde sti, helt fra toppen af disken.",
      "not-a-folder": "Denne sti er en fil, ikke en mappe. Vælg en mappe.",
      "not-found": "Der er ingen mappe på denne sti. Vælg Start et nyt arkiv for at oprette den.",
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
      read: "Læs videre",
      passages: "Fortsæt passager",
      extraction: "Fortsæt udtræk",
      probe: "Fortsæt sondering",
      done: "Åbn kilde",
    },
    startReading: "Begynd at læse",
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
    writingEmpty: "Ingen skriveprojekter endnu. Begynd på et blogindlæg under Skriveprojekter.",
    writingContinue: "Skriv videre",
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
      read: "Læs",
      passages: "Passager",
      extraction: "Udtræk",
      probe: "Sondering",
    },
    done: "færdig",
    current: "nuværende trin",
    words: (n: number) => count(n, "ord", "ord"),
    noFreeText: "sprunget over",
    withChatGpt: "med ChatGPT",
  },
};

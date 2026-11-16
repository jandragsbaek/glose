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
      "Tre valg, så åbner Glose på I dag. Intet forlader din computer, undtagen det du gemmer på GitHub eller sender til ChatGPT.",
    languageStep: "Sprog",
    languageHint:
      "Sproget i programmet. Noter og skriveprojekter kan være på alle sprog. Du kan ændre det senere under Indstillinger.",
    folderStep: "Graf-mappe",
    folderHint:
      "Glose gemmer hver kilde og note som en Markdown-fil i denne mappe, og sine egne indstillinger i en skjult .glose-mappe i den. Flyt mappen, eller del den gennem Dropbox eller git, så følger grafen med.",
    folderActions: {
      create: "Start en ny graf",
      open: "Åbn en eksisterende mappe",
      clone: "Hent den fra GitHub",
    },
    folderActionHints: {
      create: "Glose opretter en tom mappe på denne sti.",
      open: "En graf, som du har flyttet, eller som nogen deler med dig, eller en mappe med Markdown-filer.",
      clone:
        "Glose kopierer grafen til en ny mappe på denne sti. Mappen må ikke findes eller skal være tom.",
    },
    folderLabel: "Mappens sti",
    chatgptStep: "ChatGPT",
    chatgptHint:
      "Valgfrit. Du kan også forbinde senere under Indstillinger. Uden ChatGPT kan du stadig tilføje kilder og skrive fri tekst.",
    submit: "Begynd at bruge Glose",
    copying: "Kopierer din graf…",
    remote: {
      from: "Fra",
      notChosen: "Ikke valgt endnu",
      yours: "Din",
      sharedBy: (owner) => `Delt af ${owner}`,
      choose: "Vælg på GitHub",
      chooseAgain: "Vælg en anden",
      useRemote: "Brug et andet git-remote",
      backupNote: "Glose holder backuppen af grafen opdateret der efter hvert gem.",
      missing: "Vælg, hvor din graf skal hentes fra.",
      title: "Hent din graf fra GitHub",
      intro:
        "Glose kopierer din graf fra et privat repository på GitHub og holder backuppen opdateret der efter hvert gem. Forbind GitHub for at se dine repositories.",
      codeIntro: "Skriv denne kode på GitHubs side. Så kan Glose læse dine private repositories.",
      chooseGraph: "Vælg grafen",
      listHint: "Private repositories, som du ejer, eller som andre deler med dig.",
      graph: "Graf",
      updated: (at) => `Opdateret ${shortDate.format(at)}`,
      others: (n) => `Andre repositories (${numbers.format(n)})`,
      othersHint:
        "Ingen graf i dem endnu. Vælger du et, laver Glose en graf af dets filer, som de er.",
      none: "Glose fandt ingen private repositories på GitHub. Tag først backup af grafen til GitHub under Indstillinger på den anden computer, eller brug en anden konto.",
      listFailed: "GitHub svarede ikke. Prøv igen om lidt.",
      useThis: "Brug dette repository",
      notEmpty:
        "Mappen indeholder allerede filer. Glose kopierer kun en graf til en mappe, der ikke findes eller er tom.",
      gitHubFailed:
        "Glose kunne ikke kopiere repositoriet fra GitHub. Tjek internetforbindelsen, og prøv igen, eller vælg repositoriet igen.",
      copyingNote: "En stor graf kan tage nogle minutter.",
      remoteIntro:
        "Glose kopierer grafen fra et git-remote, du allerede har, med dit eget git-login: en SSH-nøgle eller en credential helper.",
      errors: {
        "no-git": "Glose skal bruge git for at kopiere en graf. Installér git, og prøv igen.",
        unreachable:
          "Git kunne ikke nå det remote eller logge ind på det. Tjek adressen, og at git på denne computer kan læse det.",
      },
    },
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

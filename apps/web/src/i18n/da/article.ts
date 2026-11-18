import type { ArticleType, SourceKind } from "@glose/contracts";

import type { articleMessages as english } from "../en/article.ts";
import { count, numbers } from "./format.ts";

const lessonPart = (part: string) => {
  const match = /^(\d+)\.(\d+)$/.exec(part);
  return match === null ? `Lektion ${part}` : `Uge ${match[1]} · Dag ${match[2]}`;
};

export const articleMessages: typeof english = {
  kinds: {
    label: "Hvad tilføjer du?",
    passageLabel: "en passage, du har markeret; Enter åbner den",
    names: {
      book: "Bog",
      article: "Artikel",
      lesson: "Kursuslektioner",
    } satisfies Record<SourceKind, string>,
    one: {
      book: "Bog",
      article: "Artikel",
      lesson: "Kursuslektion",
    } satisfies Record<SourceKind, string>,
    hints: {
      book: "Du læser den et andet sted. Glose gemmer din frie tekst og dine noter.",
      article: "Én Markdown-fil eller indsat tekst. Du læser den i Glose.",
      lesson: "En mappe med lektionsfiler fra et kursus. Hver lektion bliver en kilde.",
    } satisfies Record<SourceKind, string>,
    articleTypes: {
      paper: "Videnskabelig artikel",
      web: "Webessay",
      press: "Blad eller avis",
    } satisfies Record<ArticleType, string>,
  },
  lessonPart,
  lessonShort: (part: string) => {
    const match = /^(\d+)\.(\d+)$/.exec(part);
    return match === null ? `Lektion ${part}` : `Dag ${match[2]}`;
  },
  reader: {
    contents: "Indhold",
    contentsCount: (paragraphs: number, words: number) =>
      `${count(paragraphs, "afsnit", "afsnit")} · ${count(words, "ord", "ord")}`,
    minutes: (n: number) => `ca. ${count(n, "minuts", "minutters")} læsning`,
    opening: "Indledning",
    sectionPassages: (n: number) => (n === 0 ? "" : count(n, "passage", "passager")),
    here: "du er her",
    paragraph: (n: number) => `¶ ${numbers.format(n)}`,
    paragraphLabel: (n: number) => `Afsnit ${numbers.format(n)}`,
    stepNote: (passages: number, place: number | null, total: number) =>
      place === null
        ? count(passages, "passage", "passager")
        : `${count(passages, "passage", "passager")} · ¶ ${numbers.format(place)} af ${numbers.format(total)}`,
    howTo: "Markér ord for at gemme en passage.",
    notHere: "Passager markeres i den løbende tekst: afsnit, lister og citater.",
    oneParagraph: (n: number) =>
      `En passage holder sig inden for ét afsnit, så kun ordene i ¶ ${numbers.format(n)} bliver markeret.`,
    busy: "AI'en arbejder stadig. Prøv igen, når den har svaret.",
    keys: "M markerer · D går i dybden · Esc lukker",
    markBar: "Passage",
    markKey: "M",
    deeperKey: "D",
    mark: "Markér passage",
    markDeeper: "Markér og gå i dybden",
    marking: "Markerer…",
    refused: {
      overlap: "Det rører en passage, du har markeret. Vælg ordene ved siden af.",
      empty: "Vælg nogle ord først.",
      "not-found": "Glose kunne ikke finde det afsnit. Filen er måske ændret; genindlæs siden.",
      "no-text": "Denne kilde har ingen tekst i Glose.",
    },
    apparatus: "Passager i syne",
    apparatusMore: (n: number) => `Vis ${count(n, "passage mere", "passager mere")}`,
    apparatusFewer: "Vis færre",
    open: "Åbn",
    states: {
      marked: "Markeret",
      words: "Dine ord",
      deeper: (question: number) => `Gået i dybden · S${numbers.format(question)}`,
      deeperOpen: "Går i dybden",
      understood: "Forstået",
      point: "Punkt lavet",
    },
    margin: {
      notebook: "Læsenoter",
      notebookHint:
        "Skriv frit om teksten, mens du læser. Det er din frie tekst; den er frivillig, og udtrækket læser den.",
      notebookPlaceholder: "Hvad slår dig, hvad tvivler du på, hvad minder det dig om…",
      saved: "Gemt",
      saving: "Gemmer…",
      saveFailed: "Ikke gemt. Glose kunne ikke skrive filen.",
      retry: "Prøv igen",
      lost: (n: number) =>
        `Dine ord om passagen i ¶ ${numbers.format(n)} blev ikke gemt. De bliver her, til de er gemt.`,
      reopen: "Åbn den",
      lostNotes: "Dine læsenoter blev ikke gemt. De bliver her, til de er gemt.",
      passages: (n: number) =>
        n === 0
          ? "Ingen passager endnu. Markér ord i teksten for at gemme en."
          : `${count(n, "passage", "passager")} markeret. Vælg en i teksten for at arbejde med den.`,
      passage: (n: number) => `Passage · ¶ ${numbers.format(n)}`,
      close: "Luk",
      closeLabel: "Luk passagen",
      yourWords: "Dine ord",
      yourWordsHint: "Gemt som en fodnote under passagen i tekstfilen.",
      yourWordsPlaceholder: "Med dine egne ord: hvad den siger, hvorfor den betyder noget…",
      goDeeper: "Gå i dybden",
      goDeeperHint: "AI'en spørger dig om denne passage. Det er en del af sonderingen.",
      makePoint: "Lav et punkt",
      remove: "Fjern markeringen",
      removeConfirm: "Fjern markeringen og dine ord om den?",
      removeYes: "Fjern",
      keep: "Behold den",
      claim: "Punktet, som en hel sætning",
      claimHint:
        "Din påstand om passagen. Den bliver titlen på en note; noten skriver du i udtrækket.",
      savePoint: "Gem punktet",
      cancel: "Annullér",
      pointMade: (title: string) => `Punkt lavet: ${title}`,
      pointWhere: "Du skriver det som en note i udtrækket.",
      deeperTitle: "I dybden",
      deeperWorking: "AI'en læser passagen…",
      understood: "Du forstår denne passage. Sonderingen af hele teksten kommer efter læsningen.",
      fromText: (n: number) => `Fra teksten, ¶ ${numbers.format(n)}`,
      otherOpen: (question: number) =>
        `S${numbers.format(question)} om en anden passage er stadig åben. Svar på den først.`,
      openThat: "Åbn den passage",
    },
    end: {
      title: "Færdig med at læse",
      summary: (passages: number, deeper: number, points: number) =>
        [
          count(passages, "passage", "passager"),
          deeper === 0 ? null : `${numbers.format(deeper)} i dybden`,
          points === 0 ? null : count(points, "punkt", "punkter"),
        ]
          .filter((part) => part !== null)
          .join(" · "),
      question: "Hvad nu?",
      choices: {
        write: "Lav punkter fra teksten",
        probe: "Spørg mig først",
      },
      hints: {
        write:
          "Udtræk: AI'en foreslår tekstens kernepunkter, dine passager først. Bagefter spørger sonderingen dig.",
        probe:
          "Sondering: AI'en spørger dig om hele teksten og forklarer hullerne. Bagefter laver udtrækket noterne.",
      },
      go: {
        write: "Fortsæt til udtræk",
        probe: "Start sonderingen",
      },
      failed: "Glose kunne ikke gemme trinnet. Prøv igen.",
    },
    probe: {
      focus: (n: number) => `Du gik i dybden med ¶ ${numbers.format(n)}, mens du læste:`,
      focusDone: (n: number) => `¶ ${numbers.format(n)} forstået.`,
      wholeLead: "Nu kommer sonderingen af hele teksten.",
      wholeBody:
        "Mens du læste, spurgte AI'en dig om dine passager. Nu gennemgår den tekstens hovedidéer, de vigtigste først.",
      wholeStart: "Start sonderingen af hele teksten",
      onParagraph: (n: number) => `¶ ${numbers.format(n)}`,
    },
    readText: "Læs teksten",
    backToStep: "Tilbage til trinnet",
    previousLesson: "Forrige lektion",
    nextLesson: "Næste lektion",
    imageMissing: (alt: string) =>
      alt === ""
        ? "Et billede, som filen nævner, men som Glose ikke har kopieret."
        : `Billedet er ikke kopieret: ${alt}`,
    notes: "Noter i teksten",
    noText:
      "Glose har ingen tekst til denne kilde. Dens fil i Articles mangler; tilføj den igen fra Markdown-filen.",
    loading: "Åbner teksten…",
  },
  importText: {
    article: "Artiklen",
    chooseFile: "Vælg en Markdown-fil",
    dropHint: "eller slip den her. Glose kopierer den ind i Articles i din grafmappe.",
    paste: "Indsæt teksten i stedet",
    pasteLabel: "Artiklen som Markdown eller ren tekst",
    usePasted: "Brug denne tekst",
    chosenMeta: (paragraphs: number, words: number) =>
      `${count(paragraphs, "afsnit", "afsnit")} · ${count(words, "ord", "ord")}`,
    pasted: "Indsat tekst",
    another: "Vælg en anden",
    notMarkdown: (name: string) => `${name} er ikke en Markdown-fil. Vælg en .md-fil.`,
    empty: "Teksten er tom.",
    readFailed: "Glose kunne ikke læse den fil.",
    fromFile: "Fra filen",
    filledFromFile: "Udfyldt fra filen. Tjek de mærkede felter.",
    type: "Slags artikel",
    more: {
      paper: "Andre forfattere, årgang, nummer, sider og adresse",
      web: "Andre forfattere og læsedato",
      press: "Andre forfattere og sider",
    } satisfies Record<ArticleType, string>,
    otherAuthors: "Andre forfattere",
    otherAuthorsHint: "Én pr. linje, som Fornavn Efternavn.",
    published: "Udgivet",
    publishedHint: "Datoen eller året, fx 2026-03-04 eller 2026.",
    containers: {
      paper: "Tidsskrift",
      web: "Websted",
      press: "Udgivelse",
    } satisfies Record<ArticleType, string>,
    volume: "Årgang",
    issue: "Nummer",
    pages: "Sider",
    doi: "DOI",
    url: "Adresse (URL)",
    accessed: "Læsedato",
    accessedHint: "Den dag, du læste den online.",
    submit: "Tilføj artikel",
    adding: "Tilføjer…",
    reading: "Læser filen…",
    needText: "Vælg en Markdown-fil eller indsæt teksten først.",
    needYear: "Skriv mindst året, fx 2026.",
    needField: "Udfyld dette felt.",
    needPasted: "Indsæt teksten, og vælg så Brug denne tekst.",
    backToFile: "Vælg en fil i stedet",
    keep: (name: string) => `Behold ${name}`,
    keepPasted: "Behold den indsatte tekst",
    fromPaste: "Fra den indsatte tekst",
    filledFromPaste: "Udfyldt fra den indsatte tekst. Tjek de mærkede felter.",
  },
  lessons: {
    chooseFolder: "Vælg kursusmappen",
    chooseFiles: "Vælg lektionsfiler",
    dropHint: "eller slip filerne her. Hver lektion bliver en kilde; dens tekst lægges i Articles.",
    course: "Kurset",
    courseName: "Kursets navn",
    courseHint: "Alle lektionerne deler det, som et tidsskrift for en artikel.",
    teacher: "Underviser eller udbyder",
    teacherHint: "Lektionernes forfatter, til hyldenummeret og kildehenvisningen.",
    year: "År",
    url: "Kursets adresse (URL)",
    perWeek: "Lektioner om ugen",
    perWeekHint: "Til filer, hvis navne ikke giver uge og dag.",
    perWeekInvalid: "Skriv et helt tal, fx 5.",
    columns: {
      part: "Uge · Dag",
      title: "Titel",
      words: "Ord",
      state: "Status",
    },
    partLabel: (file: string) => `Uge og dag for ${file}`,
    titleLabel: (file: string) => `Titel for ${file}`,
    states: {
      new: "Ny",
      taken: "Allerede i din graf",
      named: "En kilde har dette filnavn. Ret titlen.",
      added: "Tilføjet",
      failed: "Ikke tilføjet",
    },
    count: (n: number) => count(n, "lektion", "lektioner"),
    submit: (n: number) => `Tilføj ${count(n, "lektion", "lektioner")}`,
    adding: (done: number, all: number) =>
      `Tilføjer lektion ${numbers.format(done)} af ${numbers.format(all)}…`,
    done: (added: number, skipped: number) =>
      skipped === 0
        ? `${count(added, "lektion", "lektioner")} tilføjet.`
        : `${count(added, "lektion", "lektioner")} tilføjet; ${numbers.format(skipped)} var allerede i din graf eller kunne ikke tilføjes.`,
    openFirst: (part: string) => `Åbn ${lessonPart(part)}`,
    seeSources: "Se dem under Kilder",
    needFiles: "Vælg lektionsfilerne først.",
    filled: "Udfyldt fra filerne. Tjek de mærkede felter.",
    fromFolder: "Fra mappens navn",
    filledFolder: "Udfyldt fra mappens navn. Tjek det mærkede felt.",
    filledBoth: "Udfyldt fra filerne og mappens navn. Tjek de mærkede felter.",
    reading: "Læser filerne…",
    noMarkdown: "Der er ingen Markdown-filer der. Vælg en mappe eller filer, der ender på .md.",
    yearGuess: "I år, som et gæt. Ret det for et ældre kursus.",
    another: "Vælg andre filer",
    keep: (n: number) =>
      n === 1 ? "Behold lektionen" : `Behold de ${numbers.format(n)} lektioner`,
    someFiles: (n: number) => count(n, "lektionsfil", "lektionsfiler"),
    submitAny: "Tilføj lektionerne",
    badPart: "Skriv uge og dag som 2.3.",
    clash: (parts: string) => `To lektioner har samme uge og dag (${parts}). Ret en af dem.`,
    retry: (n: number) => `Tilføj ${count(n, "resterende lektion", "resterende lektioner")}`,
    skippedFiles: (n: number) =>
      `${count(n, "fil var", "filer var")} ikke Markdown og blev udeladt.`,
  },
};

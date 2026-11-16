import { ANSWER_WORDS, QUESTION_WORDS } from "@glose/contracts";
import { formatInterval } from "../../domain/interval.ts";
import { numbers, count, clockTime } from "./format.ts";
import type { Messages } from "../en.ts";

export const recallMessages: Pick<Messages, "recall" | "review" | "cards" | "score"> = {
  recall: {
    title: "Genkaldelse",
    empty:
      "Genkaldelse spørger dig om kort lavet af dine noter og planlægger hvert kort med FSRS. Åbn en note i grafen, og vælg Lav kort for at lave kort.",
    counts: (cards: number, ai: number) =>
      ai === 0
        ? count(cards, "kort", "kort")
        : `${count(cards, "kort", "kort")} · ${numbers.format(ai)} med AI-tekst`,
    findLabel: "Find kort",
    matches: (n) => `${count(n, "kort passer", "kort passer")}.`,
    clearSearch: "Ryd søgningen",
    shown: (shown: number, total: number) =>
      `Viser ${numbers.format(shown)} af ${count(total, "kort", "kort")}.`,
    showMore: "Vis flere",
    nothingFound: "Intet kort passer.",
    cardCount: (n) => count(n, "kort", "kort"),
    trays: { fix: "At rette", ai: "At omskrive", good: "Gode" },
    fixEmptyTitle: "Intet at rette",
    fixEmpty: "Alle kort består deres tjek.",
    aiEmptyTitle: "Intet at omskrive",
    aiEmpty: "Intet godt kort har AI-tekst tilbage.",
    goodEmpty: "Et kort kommer her, når det består sine tjek og står i dine egne ord.",
    goodFolded: (n) => `${count(n, "godt kort", "gode kort")} i dine egne ord`,
    goodFoldedBody: "Her er intet at gøre. Vis dem for at læse eller redigere et.",
    showGood: "Vis de gode kort",
    foldGood: "Fold sammen",
    moreFaults: (n) => `${numbers.format(n)} til`,
    card: "Kort",
    close: "Luk",
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
    dueToday: (n) => `${count(n, "kort", "kort")} at gennemgå i dag`,
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
};

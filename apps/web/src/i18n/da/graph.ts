import { numbers, count, list } from "./format.ts";
import type { Messages } from "../en.ts";

export const graphMessages: Pick<Messages, "graph" | "rewrite"> = {
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
    canvasLabel: (notes: number, links: number, ai = 0) =>
      `Grafen: ${count(notes, "punkt", "punkter")} forbundet af ${count(links, "link", "links")}.${ai === 0 ? "" : ` ${count(ai, "note", "noter")} har AI-tekst.`} Panelet ved siden af viser de samme kilder og noter.`,
    findLabel: "Søg i grafen",
    findPlaceholder: "Find en note eller kilde",
    found: (n: number) => (n === 0 ? "Intet fundet" : `${numbers.format(n)} fundet`),
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    fit: "Vis hele grafen",
    help: "Rul eller knib for at zoome, og træk i baggrunden for at flytte rundt. Træk i et punkt for at trække i dets links. Klik på et punkt for at læse det her. Dobbeltklik på en note, eller vælg den og tryk Enter på grafen, for at omskrive eller redigere den; en kilde åbnes i stedet.",
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
    rewrite: "Omskriv med dine ord",
    edit: "Redigér",
    toRewrite: "Til omskrivning",
    toRewriteHelp:
      "Disse noter har stadig AI-tekst. På grafen er de hule ringe: dobbeltklik på en for at skrive den med dine ord.",
    noteCount: (n: number) => count(n, "note", "noter"),
    aiKey: (n: number) => `${count(n, "note", "noter")} har AI-tekst`,
    aiKeyHint: "Vis kun noterne med AI-tekst",
    aiKeyLabel: (n: number) =>
      `${count(n, "note", "noter")} har AI-tekst. Vis kun noterne med AI-tekst`,
    allYours: "Alle noter er skrevet med dine ord",
    holdsAi: "har AI-tekst",
  },
  rewrite: {
    titleAi: "Omskriv noten",
    titleOwn: "Redigér noten",
    aiColumn: "Det skrev AI'en",
    yourColumn: "Med dine ord",
    titleLabel: "Titel",
    titleYours: "Titlen med dine ord",
    titlePlaceholder: "Påstanden med dine ord, som en hel sætning",
    textLabel: "Tekst",
    yoursLabel: "Dine ord i stedet for denne AI-tekst",
    yoursPlaceholder:
      "Sig det igen, som du forstår det. Lad feltet stå tomt for at beholde AI-teksten, markeret.",
    headingLabel: "Delens overskrift med dine ord",
    headingPlaceholder: "Overskrift",
    correct: "Ret AI-teksten",
    undoCorrect: "Fortryd",
    stillMarked: "forbliver markeret",
    replaces: "Dine ord. De erstatter AI-teksten, når du gemmer.",
    page: "Side",
    renames: (notes: number, sources: number, cards: number) => {
      const linking = [
        notes > 0 ? count(notes, "note", "noter") : null,
        sources > 0 ? count(sources, "kilde", "kilder") : null,
        cards > 0 ? count(cards, "kort", "kort") : null,
      ].filter((part) => part !== null);
      return linking.length === 0
        ? "En ny titel omdøber notens fil."
        : `En ny titel omdøber notens fil. Links i ${list.format(linking)} følger med.`;
    },
    noTitle: "En note skal have en titel.",
    nameTaken: (name: string) =>
      `Din graf har allerede en fil med navnet »${name}«. Vælg en anden titel.`,
    progress: (done: number, total: number) =>
      `${numbers.format(done)} af ${numbers.format(total)} med dine ord`,
    save: "Gem",
    saving: "Gemmer…",
    cancel: "Annullér",
    discardQuestion: "Kassér det, du har skrevet?",
    discard: "Kassér",
    keepWriting: "Skriv videre",
    saveFailed: "Glose kunne ikke gemme noten. Prøv igen.",
  },
};

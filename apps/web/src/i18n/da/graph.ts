import { numbers, count, dayDate, list } from "./format.ts";
import type { Messages } from "../en.ts";

const dayOf = (day: string) => {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
};

export const graphMessages: Pick<Messages, "graph" | "rewrite" | "newNote" | "research"> = {
  graph: {
    title: "Graf",
    empty:
      "Grafen rummer dine noter og links mellem dem. Udtræk laver noter fra en kilde, eller start selv en med Ny note.",
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
    growth: {
      names: { seed: "Frø", sprout: "Spire", sapling: "Ungt træ", tree: "Træ" },
      lastTended: (day: string | null) =>
        day === null ? "Aldrig plejet" : `Plejet ${dayDate.format(dayOf(day))}`,
      grow: (name: string) => `Lad den gro til ${name.toLocaleLowerCase("da")}`,
      earned: {
        sprout: "Den er skrevet helt med dine ord.",
        sapling: (n: number) =>
          `Den er skrevet med dine ord og har links med ${count(n, "note", "noter")}.`,
        tree: (n: number) =>
          `Du har plejet den, og den har links med ${count(n, "note", "noter")}. Holder den stadig?`,
      },
      needs: {
        rewrite: "Den gror, når AI-teksten er skrevet med dine ord.",
        links: (need: number, have: number) =>
          `Den skal have links med ${count(need, "note", "noter")} (nu ${numbers.format(have)}).`,
        tend: "Plej den, så kan den gro til et træ.",
      },
      tend: "Markér som plejet",
      tendHelp: "At pleje en note er at læse den igen og afgøre, om den stadig holder.",
      failed: "Glose kunne ikke gemme det. Prøv igen.",
      toTend: "Til pleje",
      toTendHelp:
        "Noter med dine ord, den der blev plejet for længst siden først. Læs en igen, og markér den som plejet.",
      more: (n: number) => `og ${numbers.format(n)} mere`,
    },
    properties: "Egenskaber",
    noProperties: "Filen har ingen egenskaber.",
    props: {
      kinds: {
        text: "Tekst",
        list: "Liste",
        number: "Tal",
        checkbox: "Ja eller nej",
        date: "Dato",
      },
      kept: "Glose styrer dette felt.",
      elsewhere: "Glose kan ikke vise denne værdi. Ret den i en anden editor.",
      remove: (key: string) => `Fjern ${key}`,
      removeItem: (item: string) => `Fjern ${item}`,
      addItem: "Tilføj…",
      addTo: (key: string) => `Tilføj til ${key}`,
      add: "Tilføj egenskab",
      name: "Navn",
      type: "Type",
      value: "Værdi",
      yes: "Ja",
      listHint: "Adskil punkterne med kommaer.",
      addButton: "Tilføj",
      cancel: "Annullér",
      nameMissing: "Skriv et navn til egenskaben.",
      nameBad: "Et navn må ikke begynde eller slutte med mellemrum eller have linjeskift.",
      nameTaken: (key: string) => `Filen har allerede »${key}«.`,
      numberMissing: "Skriv et tal.",
      dateMissing: "Vælg en dato.",
      failed: (key: string) => `Glose kunne ikke gemme »${key}«. Filen er som før. Prøv igen.`,
    },
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
      `Dit arkiv har allerede en fil med navnet »${name}«. Vælg en anden titel.`,
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
  newNote: {
    key: "N",
    open: "Ny note",
    title: "Ny note",
    meta: "En note i din graf, med dine ord",
    titleLabel: "Titel",
    titlePlaceholder: "Idéen, påstanden eller spørgsmålet, som en hel sætning",
    restsOn: "Bygger på",
    restsOnLabel: "Den kilde, noten bygger på",
    noSource: "Ingen kilde endnu",
    noSourceHint: "Behold en side fra researchen for at give noten en kilde, eller gem den uden.",
    textLabel: "Med dine ord",
    textPlaceholder: "Skriv det, du forstår. AI'en skriver ikke her.",
    quotes: "Beholdte citater",
    quotesEmpty:
      "Når du beholder en side fra researchen, kommer dens citater her. Vælg et citats nummer for at henvise til det, hvor markøren står.",
    cite: (n: number) => `Henvis til citat ${numbers.format(n)}, hvor markøren står`,
    paragraph: (n: number) => `¶ ${numbers.format(n)}`,
    wordForWord: "Ord for ord",
    wordForWordHint: "Glose fandt præcis disse ord på siden.",
    citedIn: (n: number) => `Henviser til citat ${numbers.format(n)}`,
    citesMissing: (cited: ReadonlyArray<number>) =>
      `Din tekst henviser til ${cited.length === 1 ? "citat" : "citaterne"} ${list.format(cited.map((n) => numbers.format(n)))}, som du ikke længere beholder. Behold siden igen, eller tag ${cited.length === 1 ? "nummeret" : "numrene"} ud af teksten.`,
    links: "Links",
    linksHint: "Noter, AI'en fandt i din graf. De afkrydsede linkes fra noten.",
    becomesSources: (n: number) =>
      n === 0
        ? ""
        : `${count(n, "beholdt side bliver en kilde", "beholdte sider bliver kilder")}, når du gemmer.`,
    save: "Gem note",
    saving: "Gemmer …",
    pageProblems: {
      "not-kept":
        "Et citat eller kilden kommer fra en side, du ikke længere beholder. Behold den igen, eller fjern citatet.",
      unreadable:
        "Glose kunne ikke læse en af de beholdte sider igen for at gemme den. Prøv igen, eller drop siden.",
      "quote-gone":
        "Et citat står ikke længere på sin side, så Glose kan ikke gemme det. Fjern citatet, eller drop siden.",
    },
    draftNode: "Ny note",
  },
  research: {
    title: "Research",
    meta: "med AI'en",
    intro: "AI'en finder websider og præcise citater, og noter at linke til. Du skriver noten.",
    askLegend: "Bed AI'en om at",
    asks: {
      learn: "Lære emnet",
      back: "Støtte min idé",
      check: "Tjekke påstanden",
      bridge: "Forbinde to noter",
    },
    askHints: {
      learn: "Klare, pålidelige sider, der forklarer emnet.",
      back: "Sider, der støtter din idé, og sider, der trækker imod den.",
      check: "Det stærkeste belæg på begge sider af påstanden.",
      bridge: "Det, der forbinder to af dine noter.",
    },
    questionLabel: "Dit spørgsmål",
    questionHint: "Valgfrit. Hvad vil du finde ud af?",
    bridgeFrom: "Første note",
    bridgeTo: "Anden note",
    bridgePlaceholder: "En notes navn",
    bridgeMissing: "Vælg to noter fra din graf.",
    needsTitle: "Skriv en titel eller et par ord først, så AI'en ved, hvad den skal lede efter.",
    start: "Find kilder",
    again: "Søg igen",
    needsChatGpt: "Research kræver ChatGPT",
    needsChatGptBody: "Forbind din ChatGPT-plan i Indstillinger. Du kan skrive noten uden.",
    startFailed: "Glose kunne ikke starte researchen. Prøv igen.",
    youAsked: (ask: string) => `Du bad om: ${ask}`,
    stances: {
      supports: "Støtter",
      "pulls-against": "Trækker imod",
      context: "Baggrund",
    },
    kinds: {
      paper: "Videnskabelig artikel",
      web: "Webessay",
      press: "Blad eller avis",
    },
    keep: "Behold",
    kept: "Beholdt",
    drop: "Drop",
    dropped: "Droppet",
    keepAgain: "Behold alligevel",
    unkeep: "Fjern",
    moreQuotes: (n: number) => `og ${count(n, "citat mere", "citater mere")} fra siden`,
    youHave: "Du har denne kilde",
    openPage: "Åbn siden",
    pagesProposed: (n: number) => `Fandt ${count(n, "side", "sider")}`,
    linksProposed: (n: number) => `Foreslog ${count(n, "link", "links")}`,
    webSearchOff:
      "Websøgning er ikke tilgængelig for din ChatGPT-konto. Indsæt adressen på en side i beskedfeltet, så læser AI'en den.",
    placeholder: "Spørg om siderne, eller indsæt en sides adresse",
    decideFailed: "Glose kunne ikke gemme dit valg. Prøv igen.",
  },
};

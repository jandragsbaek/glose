import { count } from "./format.ts";
import type { Messages } from "../en.ts";

export const triesMessages: Pick<Messages, "tries"> = {
  tries: {
    short: "Forsøg",
    open: "Prøv andre ord",
    cannot: "Vælg et ord eller nogle få ord i ét afsnit, uden en henvisning.",
    slipLabel: (text: string) => `Forsøg for “${text}”`,
    words: (n: number) => count(n, "ord", "ord"),
    count: (n: number) => count(n, "forsøg", "forsøg"),
    listLabel: "Dine forsøg",
    first: "første",
    aiTag: "AI-ord",
    newWord: "Skriv et andet ord",
    newWords: "Skriv ordene på en anden måde",
    remove: (text: string) => `Fjern “${text}”`,
    ask: "Bed AI'en om ord",
    askAgain: "Bed om andre ord",
    asking: "Spørger AI'en …",
    aiGloss: "Ord fra AI'en",
    aiListLabel: "Ord fra AI'en, du kan prøve",
    tryIt: "Prøv det",
    noWords: "AI'en fandt ingen andre ord. Spørg igen, eller skriv dine egne.",
    off: "Forbind ChatGPT i Indstillinger for at bede AI'en om ord.",
    failed: "AI'en svarede ikke. Prøv igen.",
    tooLong: (n: number) => `AI'en foreslår ord for op til ${count(n, "ord", "ord")}.`,
    hint: "↑ ↓ viser et andet forsøg · Enter tilføjer dit · Esc lukker",
    tipHint: (keys: string) => `← → skifter · ${keys} viser alle`,
    refused: "Dette forsøg ville bryde fed eller kursiv omkring det. Ret markeringerne først.",
    flipped: (text: string, n: number, of: number) => `${text}, forsøg ${n} af ${of}`,
  },
};

import { isPageNumber } from "@glose/contracts";

import type { passageMessages as english } from "../en/passages.ts";
import { count, numbers } from "./format.ts";

export const passageMessages: typeof english = {
  passages: {
    writeKey: "W",
    openPassage: "Åbn bogens passager",
    stepNote: (n: number, last: string | null) =>
      n === 0
        ? "efter hver læsning"
        : last === null
          ? count(n, "passage", "passager")
          : `${count(n, "passage", "passager")} · til ${last}`,
    page: (page: string) => (isPageNumber(page) ? `s. ${page}` : page),
    keys: "Ctrl+Enter gemmer · X vælger · W skriver en note",
    open: "Passager",
    back: "Tilbage til trinnet",
    pages: "Sider",
    band: (from: number, to: number) => `s. ${from}–${to}`,
    otherBand: "Uden sidetal",
    unusedOnly: "Kun ubrugte",
    empty:
      "Ingen passager endnu. Skriv de ord, der betyder noget, fra dit eksemplar i linjen nedenfor.",
    emptyUnused: "Alle passager er i en note.",
    choose: (page: string) => `Vælg passagen på ${page}`,
    chooseNoPage: "Vælg passagen",
    yourWords: "Dine ord om den",
    inNotes: (n: number) => (n === 1 ? "I 1 note:" : `I ${numbers.format(n)} noter:`),
    onDesk: (n: number) => `På skrivebordet · [${numbers.format(n)}]`,
    noPage: "Ingen side: et skriveprojekt kan ikke citere den",
    edit: "Ret",
    remove: "Slet",
    removeUsed: "En note citerer den, så den bliver.",
    removeAsk: "Slet denne passage?",
    keepIt: "Behold den",
    save: "Gem",
    cancel: "Annullér",
    usedBy: (n: number) =>
      `Brugt i ${count(n, "note", "noter")}: når du gemmer, ændres ordene også i ${n === 1 ? "dens fodnote" : "deres fodnoter"}.`,
    failed: "Glose kunne ikke gemme passagen. Prøv igen.",
    capture: {
      title: "Næste passage",
      page: "Side",
      pageHint: "En side, et interval eller en placering i en e-bog",
      carried: "som før",
      lastTime: (page: string) => `Sidst: ${page}`,
      words: "Ordene, fra dit eksemplar",
      wordsHint: "Skriv dem nøjagtigt af: et skriveprojekt citerer dem, som de står.",
      yourWords: "Dine ord om den (valgfrit)",
      keep: "Gem",
      keeping: "Gemmer…",
      draft: "Gemt som kladde, mens du skriver",
      asPage: (location: string) => `Brug ${location} som side`,
      pasteNamed: (location: string) => `Det indsatte nævner ${location}.`,
      joinLines: "Saml linjerne",
      broken: "Det indsatte har brudte linjer.",
      again: (day: string) => `Du har allerede gemt disse ord (${day}). Gem dem igen?`,
    },
    desk: {
      title: "Skriv en note",
      meta: (n: number) => `ud fra ${count(n, "passage", "passager")}, med dine ord`,
      close: "Luk",
      titleLabel: "Notens titel",
      titlePlaceholder: "Hvad tager du med herfra, i én sætning?",
      restsOn: "Bygger på",
      text: "Med dine ord",
      textPlaceholder: "Hvad tager du med fra disse ord, og hvorfor holder det?",
      page: "Notens side",
      draft: "endnu ikke i din note",
      takeIn: "Tag den med",
      askDraft: "Bed AI'en om en kladde",
      drafting: "AI'en skriver en kladde…",
      findLinks: "Find links",
      finding: "AI'en leder efter noter at linke til…",
      linksRequest:
        "Hvilke noter i min graf bør denne note linke til? Sig, om den gentager eller trækker imod en af dem.",
      linkHand: "Eller skriv [[ i dine ord for at linke selv.",
      needsTitle: "Skriv titlen først: AI'en skriver ud fra din påstand, ikke kun ud fra passagen.",
      needsChatGpt: "AI'ens kladde og links kræver ChatGPT. Du kan skrive og gemme uden.",
      save: "Gem note",
      saving: "Gemmer…",
      next: (page: string) => `Så lukker skrivebordet, ved ${page}`,
      discard: "Kassér det, du skrev?",
      discardYes: "Kassér",
      discardNo: "Skriv videre",
    },
    end: {
      title: "Færdig med at læse",
      summary: (passages: number, used: number, words: number) =>
        [
          count(passages, "passage", "passager"),
          `${numbers.format(used)} i noter`,
          words === 0 ? null : `Fri tekst ${count(words, "ord", "ord")}`,
        ]
          .filter((part) => part !== null)
          .join(" · "),
      hint: (unused: number) =>
        unused === 0
          ? "Udtrækket foreslår bogens kernepunkter, og så udspørger sonderingen dig."
          : `Udtrækket begynder med de ${count(unused, "passage", "passager")}, du ikke har brugt, og så udspørger sonderingen dig.`,
      go: "Fortsæt til udtræk",
      failed: "Glose kunne ikke gemme trinnet. Prøv igen.",
    },
    marginRule:
      "Skriv noter undervejs. Når du er færdig med bogen, begynder udtrækket med de passager, du ikke har brugt.",
    freeTextHint: "Hvad du indtil nu mener om bogen, med dine egne ord. Det er din frie tekst.",
  },
};

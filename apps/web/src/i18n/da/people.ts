import type { SourceKind } from "@glose/contracts";

import type { peopleMessages as english } from "../en/people.ts";
import { count, list } from "./format.ts";

export const peopleMessages: typeof english = {
  people: {
    crumb: "Graf",
    kind: "Person",
    sub: (sources: number, notes: number, people: number) =>
      [
        count(sources, "kilde", "kilder"),
        count(notes, "note", "noter"),
        count(people, "person", "personer"),
      ].join(" · "),
    born: (year: string) => `født ${year}`,
    lived: (born: string, died: string) => `${born}–${died}`,
    notFound: (name: string) => `Ingen person hedder ${name} i dette arkiv.`,
    backToGraph: "Tilbage til grafen",
    edit: "Redigér i grafen",
    addSource: "Tilføj en kilde",
    works: "Værker og foredrag",
    worksMeta: "efter år for første udgivelse",
    worksLabel: (name: string) => `Værker og foredrag af ${name}, efter år`,
    kinds: {
      book: "Bog",
      article: "Artikel",
      lesson: "Kursuslektion",
      video: "Foredrag",
    } satisfies Record<SourceKind, string>,
    workMeta: (kind: string, notes: number) =>
      [kind, ...(notes === 0 ? [] : [count(notes, "note", "noter")])].join(" · "),
    noWorks: (name: string) =>
      `Ingen kilde i dette arkiv har ${name} som forfatter endnu. Tilføj en, så kommer den på denne linje.`,
    undated: "Ukendt år",
    legendBook: "Bog eller tekst",
    legendTalk: "Foredrag (video)",
    legendMeet: "Hvor en linket person møder denne",
    lanesLabel: "Hvor linkede personer møder disse værker",
    meeting: (theirs: ReadonlyArray<string>, links: number, mentions: number) =>
      [
        ...(theirs.length === 0
          ? []
          : [`${list.format(theirs)} · ${count(links, "link", "links")}`]),
        ...(mentions === 0 ? [] : [`nævnt i ${count(mentions, "note", "noter")}`]),
      ].join(" · "),
    meetingAt: (title: string, words: string) => `Ved ${title}: ${words}`,
    noMeeting: "ingen fælles links endnu",
    noSources: "ingen kilde endnu",
    from: (title: string) => `Fra ${title}`,
    openSource: "Åbn kilden",
    noNotes: (title: string) => `Ingen noter fra ${title} endnu.`,
    words: "Med dine ord",
    noWords: (name: string) =>
      `Intet skrevet om ${name} endnu. Redigér personen i grafen for at skrive, hvem de er for dig.`,
    people: "Personer",
    noPeople:
      "Ingen links til andre personer endnu. Nævn en person med dine ord som et link, fx [[Mihaly Csikszentmihalyi]].",
    throughWorks: "Linket gennem deres værker",
    proposal: (name: string) => `${name} har ingen personnote endnu.`,
    makePerson: (name: string) => `Lav en personnote om ${name}`,
    making: "Laver personnoten…",
    taken: (name: string) =>
      `En fil hedder allerede ${name}. Omdøb den, eller ret dens egenskaber.`,
    failed: "Glose kunne ikke lave personnoten. Prøv igen.",
    openPerson: (name: string) => `Åbn ${name}`,
  },
};

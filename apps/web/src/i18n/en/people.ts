import type { SourceKind } from "@glose/contracts";

import { count, list } from "./format.ts";

export const peopleMessages = {
  people: {
    crumb: "Graph",
    kind: "Person",
    sub: (sources: number, notes: number, people: number) =>
      [
        count(sources, "Source", "Sources"),
        count(notes, "Note", "Notes"),
        count(people, "Person", "People"),
      ].join(" · "),
    born: (year: string) => `born ${year}`,
    lived: (born: string, died: string) => `${born}–${died}`,
    notFound: (name: string) => `No Person is named ${name} in this Vault.`,
    backToGraph: "Back to the Graph",
    edit: "Edit in the Graph",
    addSource: "Add a Source",
    works: "Works and talks",
    worksMeta: "by year of first publication",
    worksLabel: (name: string) => `Works and talks by ${name}, by year`,
    kinds: {
      book: "Book",
      article: "Article",
      lesson: "Course lesson",
      video: "Talk",
    } satisfies Record<SourceKind, string>,
    workMeta: (kind: string, notes: number) =>
      [kind, ...(notes === 0 ? [] : [count(notes, "Note", "Notes")])].join(" · "),
    noWorks: (name: string) =>
      `No Source in this Vault names ${name} as its author yet. Add one, and it appears on this line.`,
    undated: "Year unknown",
    legendBook: "Book or text",
    legendTalk: "Talk (Video)",
    legendMeet: "Where a linked Person meets this one",
    lanesLabel: "Where linked People meet these works",
    meeting: (theirs: ReadonlyArray<string>, links: number, mentions: number) =>
      [
        ...(theirs.length === 0
          ? []
          : [`${list.format(theirs)} · ${count(links, "Link", "Links")}`]),
        ...(mentions === 0 ? [] : [`named in ${count(mentions, "Note", "Notes")}`]),
      ].join(" · "),
    meetingAt: (title: string, words: string) => `At ${title}: ${words}`,
    noMeeting: "no shared Links yet",
    noSources: "no Source yet",
    from: (title: string) => `From ${title}`,
    openSource: "Open the Source",
    noNotes: (title: string) => `No Notes from ${title} yet.`,
    words: "In your words",
    noWords: (name: string) =>
      `Nothing written about ${name} yet. Edit the Person in the Graph to say who they are to you.`,
    people: "People",
    noPeople:
      "No Links to other People yet. Name a Person in your words as a Link, such as [[Mihaly Csikszentmihalyi]].",
    throughWorks: "Linked through their works",
    proposal: (name: string) => `${name} has no Person note yet.`,
    makePerson: (name: string) => `Make a Person note for ${name}`,
    making: "Making the Person note…",
    taken: (name: string) => `A file is named ${name} already. Rename it, or set its properties.`,
    failed: "Glose could not make the Person note. Try again.",
    openPerson: (name: string) => `Open ${name}`,
  },
};

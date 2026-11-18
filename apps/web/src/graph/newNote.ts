import type { FoundPage, GraphView, NoteQuote, SessionEntry } from "@glose/contracts";

export const DRAFT_NODE = "\u0000new-note";

export const newDraftId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `new-${Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("")}`;
};

export const pagesOf = (entries: ReadonlyArray<SessionEntry>): ReadonlyArray<FoundPage> =>
  entries.flatMap((entry) => (entry._tag === "FoundPages" ? entry.pages : []));

export const proposedLinksOf = (entries: ReadonlyArray<SessionEntry>) => {
  const seen = new Set<string>();
  return entries
    .flatMap((entry) => (entry._tag === "ResearchLinks" ? entry.links : []))
    .filter((link) => {
      const key = link.note.toLocaleLowerCase("und");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export interface KeptQuote extends NoteQuote {
  readonly number: number;
  readonly pageTitle: string;
  readonly page: string;
}

export const keptQuotes = (pages: ReadonlyArray<FoundPage>): ReadonlyArray<KeptQuote> => {
  let number = 0;
  const out: Array<KeptQuote> = [];
  for (const page of pages) {
    for (const quote of page.quotes) {
      number++;
      if (page.state !== "kept") continue;
      out.push({
        number,
        page: page.id,
        pageTitle: page.title,
        paragraph: quote.paragraph,
        text: quote.text,
      });
    }
  }
  return out;
};

const MARKER = /\[\^q(\d{1,4})\]/g;

export const citedNumbers = (text: string): ReadonlyArray<number> => [
  ...new Set(Array.from(text.matchAll(MARKER), (match) => Number(match[1]))),
];

export const footnotesFor = (
  text: string,
  kept: ReadonlyArray<KeptQuote>,
): {
  readonly text: string;
  readonly quotes: ReadonlyArray<NoteQuote>;
  readonly missing: ReadonlyArray<number>;
} => {
  const byNumber = new Map(kept.map((quote) => [quote.number, quote]));
  const cited = citedNumbers(text);
  const missing = cited.filter((number) => !byNumber.has(number));
  const order = [
    ...cited.filter((number) => byNumber.has(number)),
    ...kept.map((quote) => quote.number).filter((number) => !cited.includes(number)),
  ];
  const label = new Map(order.map((number, index) => [number, index + 1]));
  return {
    text: text.replace(MARKER, (marker, digits: string) => {
      const next = label.get(Number(digits));
      return next === undefined ? marker : `[^q${next}]`;
    }),
    quotes: order.map((number) => {
      const { page, paragraph, text: words } = byNumber.get(number)!;
      return { page, paragraph, text: words };
    }),
    missing,
  };
};

export const insertMarker = (
  text: string,
  at: number,
  number: number,
): { readonly text: string; readonly caret: number } => {
  const head = text.slice(0, at);
  const before = head.replace(/[ \t]+$/, "");
  const gap = head.slice(before.length);
  const marker = `[^q${number}]`;
  return {
    text: `${before}${marker}${gap}${text.slice(at)}`,
    caret: before.length + marker.length + gap.length,
  };
};

export const withDraft = (view: GraphView): GraphView => ({
  nodes: [
    ...view.nodes,
    {
      id: DRAFT_NODE,
      kind: "note",
      title: "",
      sourceId: null,
      body: "",
      aiText: false,
      aiTitle: false,
      page: null,
    },
  ],
  links: view.links,
});

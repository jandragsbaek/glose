import {
  type GraphNode,
  type GraphView,
  linkKey,
  MARKDOWN_CODE,
  parseWikilink,
  type PersonName,
  type Source,
  WIKILINK,
} from "@glose/contracts";

const same = (a: string, b: string) => linkKey(a.trim()) === linkKey(b.trim());

export const isTheirs = (name: PersonName, source: Source): boolean =>
  same(name.family, source.familyName) &&
  (name.given === null || source.givenName === null || same(name.given, source.givenName));

export const peopleIn = (view: GraphView): ReadonlyArray<GraphNode> =>
  view.nodes.filter((node) => node.kind === "person");

export const personOfSource = (
  source: Source,
  people: ReadonlyArray<GraphNode>,
): GraphNode | null =>
  people.find(
    (node) =>
      node.person?.given != null && source.givenName !== null && isTheirs(node.person, source),
  ) ??
  people.find((node) => node.person !== undefined && isTheirs(node.person, source)) ??
  null;

export const authorOf = (source: Source): PersonName => ({
  family: source.familyName,
  given: source.givenName,
});

export interface Work {
  readonly source: Source;
  readonly notes: ReadonlyArray<GraphNode>;
}

const byYear = (a: Source, b: Source) =>
  (a.firstPublished ?? Number.POSITIVE_INFINITY) - (b.firstPublished ?? Number.POSITIVE_INFINITY) ||
  a.title.localeCompare(b.title);

export const worksOf = (
  person: GraphNode,
  sources: ReadonlyArray<Source>,
  view: GraphView,
): ReadonlyArray<Work> => {
  const name = person.person;
  if (name === undefined) return [];
  return sources
    .filter((source) => isTheirs(name, source))
    .sort(byYear)
    .map((source) => ({
      source,
      notes: view.nodes
        .filter((node) => node.kind === "note" && node.sourceId === source.id)
        .sort((a, b) => a.title.localeCompare(b.title)),
    }));
};

export const firstChoice = (works: ReadonlyArray<Work>): Work | null =>
  works.reduce<Work | null>(
    (best, work) => (best === null || work.notes.length >= best.notes.length ? work : best),
    null,
  );

export interface Meeting {
  readonly work: string;
  readonly theirs: ReadonlyArray<string>;
  readonly links: number;
  readonly named: number;
}

export interface LinkedPerson {
  readonly node: GraphNode;
  readonly reason: string | null;
  readonly works: ReadonlyArray<Source>;
  readonly meetings: ReadonlyArray<Meeting>;
}

const ownerOf = (works: ReadonlyArray<Work>): ReadonlyMap<string, string> =>
  new Map(
    works.flatMap((work) => [
      [work.source.id, work.source.id] as const,
      ...work.notes.map((note) => [note.id, work.source.id] as const),
    ]),
  );

const SELF = "\u0000self";

export const linkedPeople = (
  person: GraphNode,
  works: ReadonlyArray<Work>,
  sources: ReadonlyArray<Source>,
  view: GraphView,
): ReadonlyArray<LinkedPerson> => {
  const mine = ownerOf(works);
  const titles = new Map(sources.map((source) => [source.id, source.title]));
  return peopleIn(view)
    .filter((other) => other.id !== person.id)
    .flatMap((other): ReadonlyArray<LinkedPerson> => {
      const theirWorks = worksOf(other, sources, view);
      const theirs = new Map([...ownerOf(theirWorks), [other.id, SELF]]);
      const direct = view.links.some(
        (link) =>
          (link.from === person.id && link.to === other.id) ||
          (link.from === other.id && link.to === person.id),
      );
      const meet = new Map<string, Map<string, number>>();
      const naming = new Map<string, Set<string>>();
      for (const link of view.links) {
        const pairs = [
          [link.from, theirs.get(link.to), true],
          [link.to, theirs.get(link.from), false],
        ] as const;
        for (const [id, their, outgoing] of pairs) {
          const work = mine.get(id);
          if (work === undefined || their === undefined || (their === SELF && !outgoing)) continue;
          const counts = meet.get(work) ?? new Map<string, number>();
          if (their === SELF) naming.set(work, (naming.get(work) ?? new Set()).add(id));
          else counts.set(their, (counts.get(their) ?? 0) + 1);
          meet.set(work, counts);
        }
      }
      if (!direct && meet.size === 0) return [];
      const meetings = works.flatMap((work): ReadonlyArray<Meeting> => {
        const counts = meet.get(work.source.id);
        if (counts === undefined) return [];
        const toWorks = Array.from(counts);
        return [
          {
            work: work.source.id,
            theirs: toWorks.map(([id]) => titles.get(id) ?? id),
            links: toWorks.reduce((sum, [, n]) => sum + n, 0),
            named: naming.get(work.source.id)?.size ?? 0,
          },
        ];
      });
      return [
        {
          node: other,
          reason: sentenceLinking(person.body, other.id) ?? sentenceLinking(other.body, person.id),
          works: theirWorks.map((work) => work.source),
          meetings,
        },
      ];
    })
    .sort((a, b) => a.node.title.localeCompare(b.node.title));
};

const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });

const plain = (markdown: string) =>
  markdown
    .replace(WIKILINK, (_, inner: string) => parseWikilink(inner).label)
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^>\s?(?:\[![^\]]*\][-+]?\s*)?/, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const sentenceLinking = (markdown: string, target: string): string | null => {
  const key = linkKey(target);
  const lines = markdown.replace(MARKDOWN_CODE, "").split(/\r?\n/);
  for (const line of lines) {
    for (const { segment } of segmenter.segment(line)) {
      const links = Array.from(segment.matchAll(WIKILINK), (match) =>
        linkKey(parseWikilink(match[1] ?? "").target),
      );
      if (!links.includes(key)) continue;
      const words = plain(segment).replace(/^[-–—:;,\s]+|[-–—:;,\s]+$/g, "");
      return words === "" || linkKey(words) === key ? null : words;
    }
  }
  return null;
};

export interface Placed {
  readonly work: Work;
  readonly at: number;
  readonly row: number;
}

export interface CareerLine {
  readonly from: number;
  readonly to: number;
  readonly placed: ReadonlyArray<Placed>;
  readonly undated: ReadonlyArray<Work>;
  readonly ticks: ReadonlyArray<{ readonly year: number; readonly at: number }>;
  readonly rows: number;
}

const LABEL_GAP = 0.26;
const MIN_SPAN = 10;
const TICK_GAP = 0.07;

export const careerLine = (works: ReadonlyArray<Work>): CareerLine => {
  const dated = works.filter((work) => work.source.firstPublished !== null);
  const years = dated.map((work) => work.source.firstPublished ?? 0);
  const first = years.length === 0 ? new Date().getFullYear() : Math.min(...years);
  const last = years.length === 0 ? first : Math.max(...years);
  const pad = Math.max(1, Math.ceil((MIN_SPAN - (last - first)) / 2));
  const from = first - pad;
  const to = last + pad;
  const at = (year: number) => (year - from) / (to - from);
  const rowEnds: Array<number> = [];
  const placed = dated.map((work): Placed => {
    const x = at(work.source.firstPublished ?? from);
    let row = rowEnds.findIndex((end) => x - end >= LABEL_GAP);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = x;
    return { work, at: x, row };
  });
  const ticks: Array<{ year: number; at: number }> = [];
  for (const year of [from, ...new Set(years), to].sort((a, b) => a - b)) {
    const x = at(year);
    const prior = ticks.at(-1);
    if (prior !== undefined && x - prior.at < TICK_GAP) {
      if (year === to) ticks[ticks.length - 1] = { year, at: x };
      continue;
    }
    ticks.push({ year, at: x });
  }
  return {
    from,
    to,
    placed,
    undated: works.filter((work) => work.source.firstPublished === null),
    ticks,
    rows: Math.max(1, rowEnds.length),
  };
};

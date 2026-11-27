import type { GraphNode } from "./graph.ts";

const K1 = 1.2;
const TITLE_WEIGHT = 3;
const BODY_LENGTH_WEIGHT = 0.75;
const INSIDE_SHARE = 0.3;
const INSIDE_MIN = 5;

const ENGLISH_STOP_WORDS = [
  "a an the and or but if of at by for with about into onto from to up down in out on off over",
  "under then than so too very can will just should would could also is are was were be been",
  "being have has had do does did i me my we our you your he him his she her it its they them",
  "their what which who whom this that these those am not no nor only own same such each",
];

const DANISH_STOP_WORDS = [
  "og i jeg det at en den til er som på de med han af ikke der var mig sig men et har om vi min",
  "havde ham hun nu da fra du ud sine dem os op hvor eller hvad skal selv her alle vil blev",
  "kunne ind når være dog noget ville jo deres efter ned skulle denne dette mit også have dig",
  "anden hende mine meget sit vor disse hvis din nogle hos blive mange ad bliver hendes været",
  "jer sådan",
];

const STOP_WORDS = new Set([...ENGLISH_STOP_WORDS, ...DANISH_STOP_WORDS].join(" ").split(" "));

const MARKUP = /\[!ai(?:-part)?\][-+]?|\[\^[^\]\s]*\]/giu;

export const withoutSearchMarkup = (text: string): string => text.replace(MARKUP, " ");

const tokens = (text: string): ReadonlyArray<string> =>
  (
    withoutSearchMarkup(text)
      .normalize("NFC")
      .toLocaleLowerCase("und")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).filter((word) => word.length >= 2 && !STOP_WORDS.has(word));

const EN_PLURAL = /(?:ies|sses|xes|ches|shes|zes|[^siu]s)$/u;
const EN_ENDING = /(?:ing|ed)$/u;
const DOUBLE = /([b-df-hj-np-rtv-z])\1$/u;
const DA_ENDING =
  /(?:erendes|erende|hedens|ernes|erens|erets|endes|heden|heder|ende|enes|eres|erne|ered|erede|eren|erer|eret|heds|hed|ene|ere|ens|ers|ets|en|er|es|et|e|s)$/u;
const MIN_STEM = 3;

const cut = (word: string, ending: RegExp) => {
  const match = ending.exec(word);
  return match === null || match.index < MIN_STEM ? word : word.slice(0, match.index);
};

const englishStem = (word: string) => {
  let stem = word;
  const plural = EN_PLURAL.exec(stem)?.[0];
  if (plural === "ies") stem = stem.length > 4 ? `${stem.slice(0, -3)}y` : stem.slice(0, -1);
  else if (plural !== undefined && plural.length > 2) stem = stem.slice(0, -2);
  else if (plural !== undefined && plural.length === 2 && stem.length > 3) stem = stem.slice(0, -1);
  const ending = cut(stem, EN_ENDING);
  if (ending !== stem)
    stem = DOUBLE.test(ending) && !/(?:ll|ss|zz)$/u.test(ending) ? ending.slice(0, -1) : ending;
  return stem.length > MIN_STEM && stem.endsWith("e") ? stem.slice(0, -1) : stem;
};

const danishStem = (word: string) => cut(word, DA_ENDING);

const stemsOf = (word: string): ReadonlyArray<string> => {
  const english = englishStem(word);
  const danish = danishStem(word);
  return english === danish ? [english] : [english, danish];
};

interface Posting {
  readonly doc: number;
  readonly title: number;
  readonly body: number;
}

export interface GraphSearchIndex {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly postings: ReadonlyMap<string, ReadonlyArray<Posting>>;
  readonly byKey: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly lengths: ReadonlyArray<number>;
  readonly averageLength: number;
}

const count = (words: ReadonlyArray<string>) => {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
};

export const indexNodes = (nodes: ReadonlyArray<GraphNode>): GraphSearchIndex => {
  const postings = new Map<string, Array<Posting>>();
  const lengths: Array<number> = [];
  nodes.forEach((node, doc) => {
    const title = count(tokens(node.title));
    const bodyWords = tokens(node.body);
    const body = count(bodyWords);
    lengths.push(bodyWords.length);
    for (const word of new Set([...title.keys(), ...body.keys()])) {
      const list = postings.get(word) ?? [];
      list.push({ doc, title: title.get(word) ?? 0, body: body.get(word) ?? 0 });
      postings.set(word, list);
    }
  });
  const byKey = new Map<string, Array<string>>();
  for (const word of postings.keys()) {
    for (const key of stemsOf(word)) {
      const list = byKey.get(key) ?? [];
      list.push(word);
      byKey.set(key, list);
    }
  }
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return {
    nodes,
    postings,
    byKey,
    lengths,
    averageLength: Math.max(1, total / Math.max(1, nodes.length)),
  };
};

const matchesOf = (index: GraphSearchIndex, keys: ReadonlyArray<string>) => {
  const whole = new Set(keys.flatMap((key) => index.byKey.get(key) ?? []));
  const inside = new Set<string>();
  const parts = keys.filter((key) => key.length >= INSIDE_MIN);
  if (parts.length > 0) {
    for (const word of index.postings.keys()) {
      if (
        !whole.has(word) &&
        parts.some((part) => word.length > part.length && word.includes(part))
      )
        inside.add(word);
    }
  }
  return { whole, inside };
};

export interface GraphSearchHit {
  readonly node: GraphNode;
  readonly score: number;
  readonly matchedBodyWords: ReadonlyArray<string>;
}

export const searchIndex = (
  index: GraphSearchIndex,
  query: string,
): ReadonlyArray<GraphSearchHit> => {
  const { nodes } = index;
  const terms = new Map(tokens(query).map((word) => [stemsOf(word).join(" "), stemsOf(word)]));
  const scores = new Map<number, number>();
  const words = new Map<number, Set<string>>();
  for (const keys of terms.values()) {
    const { whole, inside } = matchesOf(index, keys);
    const weightsOf = (found: ReadonlySet<string>) => {
      const weights = new Map<number, number>();
      for (const word of found) {
        for (const posting of index.postings.get(word) ?? []) {
          const norm =
            1 -
            BODY_LENGTH_WEIGHT +
            (BODY_LENGTH_WEIGHT * (index.lengths[posting.doc] ?? 0)) / index.averageLength;
          const weight = TITLE_WEIGHT * posting.title + posting.body / norm;
          weights.set(posting.doc, (weights.get(posting.doc) ?? 0) + weight);
          if (posting.body > 0)
            words.set(posting.doc, (words.get(posting.doc) ?? new Set()).add(word));
        }
      }
      return weights;
    };
    const wholeWeights = weightsOf(whole);
    const insideWeights = weightsOf(inside);
    const docs = new Set([...wholeWeights.keys(), ...insideWeights.keys()]);
    const idf = Math.log(1 + (nodes.length - docs.size + 0.5) / (docs.size + 0.5));
    const saturated = (weight = 0) => (weight * (K1 + 1)) / (weight + K1);
    for (const doc of docs) {
      const score =
        saturated(wholeWeights.get(doc)) + INSIDE_SHARE * saturated(insideWeights.get(doc));
      scores.set(doc, (scores.get(doc) ?? 0) + idf * score);
    }
  }
  return [...scores]
    .flatMap(([doc, score]) => {
      const node = nodes[doc];
      return node === undefined
        ? []
        : [{ node, score, matchedBodyWords: [...(words.get(doc) ?? [])] }];
    })
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id, "en"));
};

export const searchNodes = (
  nodes: ReadonlyArray<GraphNode>,
  query: string,
): ReadonlyArray<GraphSearchHit> => searchIndex(indexNodes(nodes), query);

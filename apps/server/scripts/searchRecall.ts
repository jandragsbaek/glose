import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";

import { linkKey, parseWikilink, WIKILINK } from "@glose/contracts";

import { searchGraph } from "../src/sessions/graphTools.ts";
import { buildGraphView } from "../src/vault/graphView.ts";

const { values, positionals } = NodeUtil.parseArgs({
  allowPositionals: true,
  options: { sample: { type: "string" }, seed: { type: "string", default: "1" } },
});
const sample = values.sample === undefined ? null : Number(values.sample);
const seed = Number(values.seed);
if ((sample !== null && !(Number.isInteger(sample) && sample > 0)) || !Number.isInteger(seed)) {
  console.error("Usage: searchRecall.ts [Vault folder] [--sample N] [--seed S]");
  process.exit(1);
}
const folder = NodePath.resolve(
  positionals[0] ?? NodePath.join(import.meta.dirname, "../../../demo/Vault"),
);
const files = NodeFS.readdirSync(folder)
  .filter((entry) => entry.endsWith(".md") && !entry.startsWith("."))
  .map((entry) => ({
    name: entry.slice(0, -3),
    markdown: NodeFS.readFileSync(NodePath.join(folder, entry), "utf8"),
  }));
const view = buildGraphView(files);
const kindOf = new Map(view.nodes.map((node) => [node.id, node.kind]));

const withoutLinksTo = (body: string, key: string) =>
  body.replace(WIKILINK, (whole: string, inner: string) =>
    linkKey(parseWikilink(inner).target) === key ? "" : whole,
  );
const withoutLinks = (body: string) =>
  body.replace(WIKILINK, "").replace(/^(Related|Se også):.*$/gim, "");

const neighbours = (id: string) =>
  new Set(
    view.links
      .flatMap((link) => (link.from === id ? [link.to] : link.to === id ? [link.from] : []))
      .filter((other) => kindOf.get(other) === "note"),
  );

const seededRandom = (state: number) => () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const linkedNotes = view.nodes.filter(
  (node) => node.kind === "note" && neighbours(node.id).size > 0,
);
const picked = (() => {
  if (sample === null || sample >= linkedNotes.length) return linkedNotes;
  const next = seededRandom(seed);
  const order = [...linkedNotes];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return order.slice(0, sample);
})();

const measure = (queryOf: (node: (typeof view.nodes)[number]) => string) => {
  let notes = 0;
  let found = 0;
  let wanted = 0;
  let anyHit = 0;
  let reciprocal = 0;
  for (const node of picked) {
    const linked = neighbours(node.id);
    const key = linkKey(node.id);
    const rest = view.nodes
      .filter((other) => other.id !== node.id)
      .map((other) => ({ ...other, body: withoutLinksTo(other.body, key) }));
    const names = searchGraph(rest, queryOf(node)).map((match) => match.name);
    const hits = names.filter((name) => linked.has(name)).length;
    const first = names.findIndex((name) => linked.has(name));
    notes += 1;
    found += hits;
    wanted += linked.size;
    anyHit += hits > 0 ? 1 : 0;
    reciprocal += first < 0 ? 0 : 1 / (first + 1);
  }
  const share = (part: number, whole: number) => `${((100 * part) / whole).toFixed(1)}%`;
  return {
    notes,
    links: wanted,
    "linked Notes in top 10": share(found, wanted),
    "Notes with a hit": share(anyHit, notes),
    "first hit (MRR)": (reciprocal / notes).toFixed(3),
  };
};

console.log(`Vault: ${folder}`);
console.log(
  picked.length === linkedNotes.length
    ? `Notes: all ${linkedNotes.length} with Links`
    : `Notes: ${picked.length} of ${linkedNotes.length} with Links, seed ${seed}`,
);
console.log(
  "Query = title:",
  measure((node) => node.title),
);
console.log(
  "Query = title and text:",
  measure((node) => `${node.title}\n${withoutLinks(node.body)}`),
);

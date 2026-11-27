import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const WORDS = JSON.parse(
  NodeFS.readFileSync(NodePath.join(import.meta.dirname, "sample-words.json"), "utf8"),
);
const TOPICS = WORDS.topics.map(({ topic, nouns }) => [topic, nouns]);
const PREDICATES = WORDS.predicates;
const OPENINGS = WORDS.openings;
const MIDDLES = WORDS.middles;
const FILLERS = WORDS.fillers;
const BOOK_TITLES = WORDS["book-titles"];
const FAMILIES = WORDS.families;
const GIVENS = WORDS.givens;
const PUBLISHERS = WORDS.publishers;
const READING_STEPS = WORDS["reading-steps"];
const GROWTHS = WORDS.growths;
const LINK_COUNTS = WORDS["link-counts"];

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const isPlural = (noun) => {
  const head = noun
    .split(/ (?:of|in|for) /)[0]
    .split(" ")
    .pop();
  return /[^su]s$/.test(head);
};
const agree = (noun, predicate) => {
  if (!isPlural(noun)) return predicate;
  const [verb, ...rest] = predicate.split(" ");
  return [verb === "is" ? "are" : verb.slice(0, -1), ...rest].join(" ");
};

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const titleCase = (text) => text.split(" ").map(capital).join(" ");
const fill = (template, words) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    key in words ? words[key] : capital(words[key.toLowerCase()]),
  );

export const countOption = (args, flag, fallback) => {
  const at = args.indexOf(flag);
  if (at < 0) return fallback;
  const count = Number(args[at + 1]);
  if (!Number.isSafeInteger(count) || count < 1) {
    console.error(`${flag} needs a whole number above 0, not "${args[at + 1] ?? ""}"`);
    process.exit(1);
  }
  return count;
};

export const generateVault = (folder, { nodes = 10_000, seed = 1 } = {}) => {
  const random = mulberry32(seed);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const weighted = (pairs) => {
    let roll = random() * pairs.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of pairs) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return pairs[pairs.length - 1][0];
  };
  const day = () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2026, 10, 20);
    return new Date(start + random() * (end - start)).toISOString().slice(0, 10);
  };

  NodeFS.mkdirSync(folder, { recursive: true });
  const taken = new Set(
    NodeFS.readdirSync(folder)
      .filter((entry) => entry.endsWith(".md"))
      .map((entry) => entry.slice(0, -3).toLowerCase()),
  );
  const claim = (name) => {
    if (taken.has(name.toLowerCase())) return false;
    taken.add(name.toLowerCase());
    return true;
  };

  const sourceCount = Math.max(1, Math.round(nodes * 0.04));
  const personShare = 0.6;

  const authors = [];
  const authorCount = Math.max(1, Math.round(sourceCount / 2));
  for (let made = 0, tries = 0; made < authorCount && tries < authorCount * 20; tries++) {
    const family = pick(FAMILIES);
    const given = pick(GIVENS);
    const name = `${given} ${family}`;
    if (authors.some((author) => author.name === name)) continue;
    authors.push({ family, given, name, sources: [] });
    made++;
  }

  const sources = [];
  for (let tries = 0; sources.length < sourceCount && tries < sourceCount * 50; tries++) {
    const topic = Math.floor(random() * TOPICS.length);
    const [, nouns] = TOPICS[topic];
    const x = titleCase(pick(nouns));
    const y = titleCase(pick(nouns));
    if (x === y) continue;
    const title = fill(pick(BOOK_TITLES), { X: x, Y: y });
    const author = pick(authors);
    const year = 1950 + Math.floor(random() * 76);
    const name = `${author.family} ${year} ${title}`;
    if (!claim(name)) continue;
    const source = { name, title, topic, author, year, notes: [], step: weighted(READING_STEPS) };
    author.sources.push(source);
    sources.push(source);
  }

  const people = authors
    .filter((author) => author.sources.length > 0 && random() < personShare)
    .slice(0, Math.max(0, nodes - sources.length));
  for (const person of people) {
    if (!claim(person.name)) person.skip = true;
  }
  const personCount = people.filter((person) => !person.skip).length;

  const noteCount = Math.max(0, nodes - sources.length - personCount);
  const notes = [];
  const byTopic = TOPICS.map(() => []);
  const everywhere = [];
  for (let tries = 0; notes.length < noteCount && tries < noteCount * 50; tries++) {
    const source = pick(sources);
    const [, nouns] = TOPICS[source.topic];
    const a = pick(nouns);
    const b = pick(nouns);
    if (a === b) continue;
    const predicate = agree(a, pick(PREDICATES));
    const title = capital(`${a} ${predicate} ${b}`);
    if (!claim(title)) continue;
    const note = { name: title, source, a, b, predicate, links: [] };
    const wanted = weighted(LINK_COUNTS);
    const local = source.notes;
    const nearby = byTopic[source.topic];
    for (let n = 0, guard = 0; n < wanted && guard < wanted * 6; guard++) {
      const roll = random();
      const pool = roll < 0.5 ? local : roll < 0.85 ? nearby : everywhere;
      if (pool.length === 0) continue;
      const target = pick(pool);
      if (note.links.includes(target)) continue;
      note.links.push(target);
      nearby.push(target);
      everywhere.push(target);
      n++;
    }
    notes.push(note);
    source.notes.push(note);
    nearby.push(note);
    everywhere.push(note);
  }

  const write = (name, text) => NodeFS.writeFileSync(NodePath.join(folder, `${name}.md`), text);
  const yamlText = (value) => (/^[\w .,-]+$/.test(value) ? value : JSON.stringify(value));

  for (const note of notes) {
    const [, nouns] = TOPICS[note.source.topic];
    const words = () => ({
      a: note.a,
      b: note.b,
      p: note.predicate,
      c: pick(nouns),
      d: pick(nouns),
    });
    const opening = fill(pick(OPENINGS), words());
    const paragraphs = [[opening, fill(pick(FILLERS), words())]];
    let current = paragraphs[0];
    for (const target of note.links) {
      if (current.length >= 3) {
        current = [];
        paragraphs.push(current);
      }
      current.push(fill(pick(MIDDLES), { ...words(), link: `[[${target.name}]]` }));
      if (random() < 0.5) current.push(fill(pick(FILLERS), words()));
    }
    const growth = weighted(GROWTHS);
    const ai = random() < 0.05;
    const front = [
      "glose: note",
      `source: "[[${note.source.name}]]"`,
      ...(random() < 0.4 ? [`page: ${1 + Math.floor(random() * 320)}`] : []),
      ...(growth === "seed" ? [] : [`growth: ${growth}`]),
      `created: ${day()}`,
      ...(random() < 0.1 ? [`tended: ${day()}`] : []),
      ...(ai ? ["ai: true"] : []),
    ];
    const body = paragraphs.map((sentences) => sentences.join(" ")).join("\n\n");
    write(
      note.name,
      `---\n${front.join("\n")}\n---\n\n${ai ? `> [!ai]\n> ${opening}\n\n` : ""}${body}\n`,
    );
  }

  for (const source of sources) {
    const [topic] = TOPICS[source.topic];
    const shown = source.notes.slice(0, 2 + Math.floor(random() * 3));
    const lines = [
      `Generated sample Source on ${topic}, for performance tests. ${source.author.name} writes plainly and at length.`,
      ...shown.map((note) => fill(pick(MIDDLES), { ...note, c: topic, link: `[[${note.name}]]` })),
    ];
    const front = [
      "glose: source",
      `author-family: ${source.author.family}`,
      `author-given: ${source.author.given}`,
      `title: ${yamlText(source.title)}`,
      `first-published: ${source.year}`,
      `publisher: ${pick(PUBLISHERS)}`,
      `reading-step: ${source.step}`,
      `added: ${day()}`,
    ];
    write(source.name, `---\n${front.join("\n")}\n---\n\n${lines.join("\n\n")}\n`);
  }

  for (const person of people) {
    if (person.skip) continue;
    const notesOf = person.sources.flatMap((source) => source.notes);
    const shown = Array.from({ length: Math.min(3, notesOf.length) }, () => pick(notesOf));
    const linked = [...new Set(shown)].map((note) => `[[${note.name}]]`);
    const front = [
      "glose: person",
      `family: ${person.family}`,
      `given: ${person.given}`,
      `born: ${1900 + Math.floor(random() * 90)}`,
      `created: ${day()}`,
    ];
    const text = `Generated sample Person for performance tests. ${person.given} writes about ${TOPICS[person.sources[0].topic][0]}.${
      linked.length === 0 ? "" : ` The Notes I return to: ${linked.join(", ")}.`
    }`;
    write(person.name, `---\n${front.join("\n")}\n---\n\n${text}\n`);
  }

  const passageFolder = NodePath.join(folder, "Passages");
  NodeFS.mkdirSync(passageFolder, { recursive: true });
  let passages = 0;
  for (const source of sources) {
    if (source.step === "read") continue;
    const [, nouns] = TOPICS[source.topic];
    const count = Math.floor(random() * 10);
    for (let n = 0; n < count; n++) {
      const page = 1 + Math.floor(random() * 320);
      const words = fill(pick(FILLERS), { a: pick(nouns), c: pick(nouns), d: pick(nouns) });
      const name = `${source.name} p. ${page} ${words.split(" ").slice(0, 6).join(" ").replace(/[.,:]/g, "")}`;
      const file = NodePath.join(passageFolder, `${name}.md`);
      if (NodeFS.existsSync(file)) continue;
      const mine =
        random() < 0.4
          ? `\n${fill(pick(FILLERS), { a: pick(nouns), c: pick(nouns), d: pick(nouns) })}\n`
          : "";
      NodeFS.writeFileSync(
        file,
        `---\nglose: passage\nsource: "[[${source.name}]]"\npage: ${page}\ncreated: ${day()}\n---\n\n> ${words}\n${mine}`,
      );
      passages++;
    }
  }

  const links = notes.reduce((sum, note) => sum + note.links.length + 1, 0);
  return { sources: sources.length, notes: notes.length, people: personCount, passages, links };
};

const isMain = process.argv[1] && NodeURL.pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  const folder = args.find((arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"));
  if (folder === undefined) {
    console.error("Usage: node scripts/generate-vault.mjs <folder> [--nodes 10000] [--seed 1]");
    process.exit(1);
  }
  const started = performance.now();
  const made = generateVault(NodePath.resolve(folder), {
    nodes: countOption(args, "--nodes", 10_000),
    seed: countOption(args, "--seed", 1),
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `${made.sources} Sources, ${made.notes} Notes, ${made.people} People, ${made.passages} Passages, about ${made.links} Links (${seconds} s)`,
  );
}

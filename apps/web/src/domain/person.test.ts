import { assert, describe, it } from "@effect/vitest";
import { BOOK_TEXT_DETAILS, type GraphNode, type GraphView, type Source } from "@glose/contracts";

import {
  careerLine,
  firstChoice,
  isTheirs,
  linkedPeople,
  personOfSource,
  sentenceLinking,
  worksOf,
} from "./person.ts";

const source = (
  id: string,
  familyName: string,
  givenName: string | null,
  firstPublished: number | null,
  more: Partial<Source> = {},
): Source => ({
  id,
  familyName,
  givenName,
  title: id,
  firstPublished,
  edition: null,
  editionYear: null,
  publisher: null,
  translator: null,
  ...BOOK_TEXT_DETAILS,
  hasText: false,
  videoLink: null,
  videoFile: null,
  readingPlace: null,
  readingStep: "done",
  readingStart: null,
  freeText: "",
  modified: 0,
  added: 0,
  ...more,
});

const node = (id: string, kind: GraphNode["kind"], more: Partial<GraphNode> = {}): GraphNode => ({
  id,
  kind,
  title: id,
  sourceId: null,
  body: "",
  aiText: false,
  aiTitle: false,
  page: null,
  growth: kind === "note" ? "seed" : null,
  created: null,
  updated: null,
  tended: null,
  properties: [],
  ...more,
});

const person = (id: string, family: string, given: string | null, body = "") =>
  node(id, "person", { person: { family, given }, body });

const note = (id: string, sourceId: string) => node(id, "note", { sourceId });

const DEEP_WORK = source("Deep Work", "Newport", "Cal", 2016);
const MINIMALISM = source("Digital Minimalism", "newport", null, 2019);
const QUIT = source("Quit social media", "Newport", "Cal", 2016, { kind: "video" });
const FLOW = source("Flow", "Csikszentmihalyi", "Mihaly", 1990);
const OTHER_NEWPORT = source("Elsewhere", "Newport", "Ann", 2001);
const SOURCES = [MINIMALISM, FLOW, DEEP_WORK, QUIT, OTHER_NEWPORT];

const NEWPORT = person(
  "Cal Newport",
  "Newport",
  "Cal",
  "Blunt rules.\n\n- His case leans on [[Mihaly Csikszentmihalyi]]'s research on flow. He says so.",
);
const CSIKSZENTMIHALYI = person("Mihaly Csikszentmihalyi", "Csikszentmihalyi", "Mihaly");
const LEROY = person("Sophie Leroy", "Leroy", "Sophie");

const VIEW: GraphView = {
  nodes: [
    NEWPORT,
    CSIKSZENTMIHALYI,
    LEROY,
    person("Hannah Arendt", "Arendt", "Hannah"),
    note("Deep work is rare", "Deep Work"),
    note("Attention residue", "Deep Work"),
    note("Social media is a slot machine", "Quit social media"),
    note("Flow needs clear goals", "Flow"),
    note("Attention is psychic energy", "Flow"),
  ],
  links: [
    { from: "Cal Newport", to: "Mihaly Csikszentmihalyi" },
    { from: "Deep work is rare", to: "Flow needs clear goals" },
    { from: "Attention residue", to: "Attention is psychic energy" },
    { from: "Flow", to: "Deep Work" },
    { from: "Attention residue", to: "Sophie Leroy" },
    { from: "Sophie Leroy", to: "Attention residue" },
  ],
};

describe("isTheirs", () => {
  it("matches the author's family name, and the given name when both are known", () => {
    const name = { family: "Newport", given: "Cal" };
    assert.isTrue(isTheirs(name, DEEP_WORK));
    assert.isTrue(isTheirs(name, MINIMALISM));
    assert.isFalse(isTheirs(name, OTHER_NEWPORT));
    assert.isTrue(isTheirs({ family: "NEWPORT", given: null }, OTHER_NEWPORT));
    assert.strictEqual(personOfSource(FLOW, [NEWPORT, CSIKSZENTMIHALYI]), CSIKSZENTMIHALYI);
    const surname = person("Newport", "Newport", null);
    assert.strictEqual(personOfSource(DEEP_WORK, [surname, NEWPORT]), NEWPORT);
    assert.isNull(personOfSource(OTHER_NEWPORT, [NEWPORT, CSIKSZENTMIHALYI]));
  });
});

describe("worksOf", () => {
  it("lists the person's Sources by year, each with its Notes, and chooses the one with most Notes", () => {
    const works = worksOf(NEWPORT, SOURCES, VIEW);

    assert.deepStrictEqual(
      works.map((work) => [work.source.id, work.notes.map((one) => one.id)]),
      [
        ["Deep Work", ["Attention residue", "Deep work is rare"]],
        ["Quit social media", ["Social media is a slot machine"]],
        ["Digital Minimalism", []],
      ],
    );
    assert.strictEqual(firstChoice(works)?.source.id, "Deep Work");
    assert.isNull(firstChoice([]));
  });
});

describe("linkedPeople", () => {
  it("finds where linked People meet the person's works, and the sentence that links them", () => {
    const works = worksOf(NEWPORT, SOURCES, VIEW);
    const people = linkedPeople(NEWPORT, works, SOURCES, VIEW);

    assert.deepStrictEqual(
      people.map(({ node, reason, works, meetings }) => ({
        id: node.id,
        reason,
        works: works.map((one) => one.id),
        meetings,
      })),
      [
        {
          id: "Mihaly Csikszentmihalyi",
          reason: "His case leans on Mihaly Csikszentmihalyi's research on flow.",
          works: ["Flow"],
          meetings: [{ work: "Deep Work", theirs: ["Flow"], links: 3, named: 0 }],
        },
        {
          id: "Sophie Leroy",
          reason: null,
          works: [],
          meetings: [{ work: "Deep Work", theirs: [], links: 0, named: 1 }],
        },
      ],
    );
  });
});

describe("sentenceLinking", () => {
  it("takes the one sentence that holds the Link, as plain words", () => {
    assert.strictEqual(
      sentenceLinking("First. Then **[[Flow|flow]]** came. Last.", "flow"),
      "Then flow came.",
    );
    assert.isNull(sentenceLinking("- [[Flow]]", "Flow"));
    assert.isNull(sentenceLinking("`[[Flow]]` in code.", "Flow"));
    assert.isNull(sentenceLinking("No Link here.", "Flow"));
  });
});

describe("careerLine", () => {
  it("spans at least ten years, stacks works of one year, and keeps the undated apart", () => {
    const undated = source("Notebook", "Newport", "Cal", null);
    const line = careerLine(worksOf(NEWPORT, [...SOURCES, undated], VIEW));

    assert.strictEqual(line.from, 2012);
    assert.strictEqual(line.to, 2023);
    assert.deepStrictEqual(
      line.placed.map(({ work, at, row }) => [work.source.id, Number(at.toFixed(3)), row]),
      [
        ["Deep Work", 0.364, 0],
        ["Quit social media", 0.364, 1],
        ["Digital Minimalism", 0.636, 0],
      ],
    );
    assert.strictEqual(line.rows, 2);
    assert.deepStrictEqual(
      line.ticks.map((tick) => tick.year),
      [2012, 2016, 2019, 2023],
    );
    assert.deepStrictEqual(
      line.undated.map((work) => work.source.id),
      ["Notebook"],
    );
  });
});

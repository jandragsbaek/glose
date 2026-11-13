import { assert, describe, it } from "@effect/vitest";
import type { GraphNode, GraphView, Source } from "@glose/contracts";

import { filterRecords, groupRecords, sourceRecords } from "./register.ts";

const source = (
  id: string,
  familyName: string,
  firstPublished: number | null,
  added: Date,
  more: Partial<Source> = {},
): Source => ({
  id,
  familyName,
  givenName: null,
  title: id,
  firstPublished,
  edition: null,
  editionYear: null,
  publisher: "A publisher",
  translator: null,
  readingStep: "done",
  freeText: "",
  modified: added.getTime(),
  added: added.getTime(),
  ...more,
});

const note = (id: string, sourceId: string | null, page: string | null = null): GraphNode => ({
  id,
  kind: "note",
  title: id,
  sourceId,
  body: "",
  aiText: false,
  aiTitle: false,
  page,
});

const sourceNode = (id: string): GraphNode => ({ ...note(id, null), kind: "source" });

const NEWPORT = source("Deep Work", "Newport", 2016, new Date(2026, 9, 15), {
  givenName: "Cal",
});
const FLOW = source("Flow", "Csikszentmihalyi", 1990, new Date(2026, 8, 6));
const ZINSSER = source("On Writing Well", "Zinsser", 1976, new Date(2026, 10, 9), {
  readingStep: "extraction",
  publisher: null,
});
const ORSTED = source("Aanden i Naturen", "Ørsted", 1850, new Date(2026, 10, 2));

const GRAPH: GraphView = {
  nodes: [
    sourceNode("Deep Work"),
    sourceNode("Flow"),
    sourceNode("On Writing Well"),
    note("Attention residue", "Deep Work", "42"),
    note("Shutdown ritual", "Deep Work"),
    note("Flow needs clear goals", "Flow", "54"),
    note("Clutter", "On Writing Well"),
    note("A thought of my own", null),
  ],
  links: [
    { from: "Attention residue", to: "Flow needs clear goals" },
    { from: "Flow needs clear goals", to: "Shutdown ritual" },
    { from: "Attention residue", to: "Shutdown ritual" },
    { from: "On Writing Well", to: "Attention residue" },
    { from: "Clutter", to: "A thought of my own" },
  ],
};

describe("sourceRecords", () => {
  it("counts each Source's Notes, their Locations, and the Links its Notes share with other Sources", () => {
    const records = sourceRecords([NEWPORT, FLOW, ZINSSER], GRAPH);

    assert.deepStrictEqual(
      records.map((record) => ({
        id: record.source.id,
        call: record.call,
        notes: record.notes,
        located: record.located,
        linked: Object.fromEntries(record.linked),
        missing: record.missing,
      })),
      [
        {
          id: "Deep Work",
          call: "NEW 2016",
          notes: 2,
          located: 1,
          linked: { Flow: 2, "On Writing Well": 1 },
          missing: [],
        },
        {
          id: "Flow",
          call: "CSI 1990",
          notes: 1,
          located: 1,
          linked: { "Deep Work": 2 },
          missing: [],
        },
        {
          id: "On Writing Well",
          call: "ZIN 1976",
          notes: 1,
          located: 0,
          linked: { "Deep Work": 1 },
          missing: ["publisher"],
        },
      ],
    );
  });
});

describe("filterRecords", () => {
  const records = sourceRecords([NEWPORT, FLOW, ZINSSER, ORSTED], GRAPH);
  const ids = (query: Parameters<typeof filterRecords>[1]) =>
    filterRecords(records, query, "da").map((record) => record.source.id);

  it("finds a Source by its title, its author or its call number", () => {
    assert.deepStrictEqual(
      [
        ids({ text: "deep", reading: "all", citation: "all" }),
        ids({ text: "ørsted", reading: "all", citation: "all" }),
        ids({ text: "csi 1990", reading: "all", citation: "all" }),
        ids({ text: "cal newport", reading: "all", citation: "all" }),
      ],
      [["Deep Work"], ["Aanden i Naturen"], ["Flow"], ["Deep Work"]],
    );
  });

  it("keeps the Sources in progress, or those missing data for a Citation", () => {
    assert.deepStrictEqual(
      [
        ids({ text: "", reading: "in-progress", citation: "all" }),
        ids({ text: "", reading: "all", citation: "missing" }),
      ],
      [["On Writing Well"], ["On Writing Well"]],
    );
  });
});

describe("groupRecords", () => {
  const records = sourceRecords([NEWPORT, FLOW, ZINSSER, ORSTED], GRAPH);
  const groups = (order: Parameters<typeof groupRecords>[1]) =>
    groupRecords(records, order, "da").map((group) => [
      group.key.kind === "month" ? `${group.key.year}-${group.key.month + 1}` : group.key.letter,
      group.records.map((record) => record.call),
    ]);

  it("groups by the month each Source was added, newest first", () => {
    assert.deepStrictEqual(groups("added"), [
      ["2026-11", ["ZIN 1976", "ØRS 1850"]],
      ["2026-10", ["NEW 2016"]],
      ["2026-9", ["CSI 1990"]],
    ]);
  });

  it("groups by the first letter in the interface language's alphabet", () => {
    assert.deepStrictEqual(groups("call"), [
      ["C", ["CSI 1990"]],
      ["N", ["NEW 2016"]],
      ["Z", ["ZIN 1976"]],
      ["Ø", ["ØRS 1850"]],
    ]);
  });
});

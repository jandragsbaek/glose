import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { searchIndex } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as NodeFS from "node:fs";

import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/services.ts";
import * as Graph from "./Graph.ts";
import * as Notes from "./Notes.ts";

const note = (body: string) => ["---", "glose: note", "---", "", body, ""].join("\n");

const passage = (source: string) =>
  ["---", "glose: passage", `source: "[[${source}]]"`, "---", "", "> Words.", ""].join("\n");

const MIDNIGHT = new Date(2026, 10, 27);

const withVault = <A, E>(
  test: (vault: {
    readonly write: (name: string, markdown: string) => void;
    readonly remove: (name: string) => void;
    readonly file: (name: string) => string;
    readonly graph: Graph.Graph["Service"];
    readonly notes: Notes.Notes["Service"];
  }) => Effect.Effect<A, E, Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    const file = (name: string) => path.join(folder, name);
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        vaultFolder: folder,
        action: "create",
      });
      return yield* test({
        write: (name, markdown) => {
          NodeFS.mkdirSync(path.dirname(file(name)), { recursive: true });
          NodeFS.writeFileSync(file(name), markdown);
        },
        remove: (name) => NodeFS.rmSync(file(name), { recursive: true }),
        file,
        graph: yield* Graph.Graph,
        notes: yield* Notes.Notes,
      });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

const ids = (graph: Graph.Graph["Service"]) =>
  Effect.map(graph.read, (view) => view.nodes.map((node) => node.id));

it.layer(NodeServices.layer)("Graph.read", (it) => {
  it.effect("shows Notes that another app adds, edits and deletes on the next read", () =>
    withVault(({ write, remove, graph }) =>
      Effect.gen(function* () {
        write("Natality.md", note("See [[Plurality]]."));
        assert.deepStrictEqual(yield* ids(graph), ["Natality"]);

        write("Plurality.md", note("Many."));
        assert.deepStrictEqual(yield* ids(graph), ["Natality", "Plurality"]);
        assert.deepStrictEqual((yield* graph.read).links, [{ from: "Natality", to: "Plurality" }]);

        write("Natality.md", note("See [[Plurality]]!"));
        assert.strictEqual(
          (yield* graph.read).nodes.find((node) => node.id === "Natality")?.body,
          "See [[Plurality]]!",
        );

        remove("Plurality.md");
        assert.deepStrictEqual(yield* ids(graph), ["Natality"]);
        assert.deepStrictEqual((yield* graph.read).links, []);
      }),
    ),
  );

  it.effect("shows an edit in place that keeps the size and the modified time", () =>
    withVault(({ write, file, graph }) =>
      Effect.gen(function* () {
        const modified = () => NodeFS.statSync(file("Natality.md"), { bigint: true }).mtimeNs;
        write("Natality.md", note("Beginnings."));
        NodeFS.utimesSync(file("Natality.md"), MIDNIGHT, MIDNIGHT);
        const before = modified();
        assert.strictEqual((yield* graph.read).nodes[0]?.body, "Beginnings.");

        NodeFS.writeFileSync(file("Natality.md"), note("Beginnings!"));
        NodeFS.utimesSync(file("Natality.md"), MIDNIGHT, MIDNIGHT);

        assert.strictEqual(modified(), before);
        assert.strictEqual((yield* graph.read).nodes[0]?.body, "Beginnings!");
      }),
    ),
  );

  it.effect("reads a Person and a Passage saved with a byte order mark", () =>
    withVault(({ write, graph }) =>
      Effect.gen(function* () {
        write("Hannah Arendt.md", "\uFEFF---\nglose: person\n---\n");
        write("Passages/On beginnings.md", `\uFEFF${passage("Hannah Arendt")}`);

        const view = yield* graph.read;
        assert.deepStrictEqual(
          view.nodes.map((node) => [node.id, node.kind]),
          [["Hannah Arendt", "person"]],
        );
        assert.deepStrictEqual(view.passages, [{ id: "On beginnings", source: "Hannah Arendt" }]);
      }),
    ),
  );

  it.effect("shows what Glose writes on the next read", () =>
    withVault(({ write, graph, notes }) =>
      Effect.gen(function* () {
        write("Natality.md", note("Beginnings."));
        assert.strictEqual((yield* graph.read).nodes[0]?.growth, "seed");

        yield* notes.grow("Natality", "sapling");
        assert.strictEqual((yield* graph.read).nodes[0]?.growth, "sapling");

        const saved = yield* notes.save({
          id: "Natality",
          title: "Natality and action",
          aiTitle: false,
          page: null,
          body: "Every birth is a beginning.",
          aiNote: false,
        });
        const view = yield* graph.read;
        assert.deepStrictEqual(
          view.nodes.map((node) => [node.id, node.body]),
          [[saved, "Every birth is a beginning."]],
        );
      }),
    ),
  );

  it.effect("shows Passages that are added and deleted", () =>
    withVault(({ write, remove, graph }) =>
      Effect.gen(function* () {
        assert.deepStrictEqual((yield* graph.read).passages, []);

        write("Passages/On beginnings.md", passage("Arendt 1958 The Human Condition"));
        assert.deepStrictEqual((yield* graph.read).passages, [
          { id: "On beginnings", source: "Arendt 1958 The Human Condition" },
        ]);

        remove("Passages");
        assert.deepStrictEqual((yield* graph.read).passages, []);
      }),
    ),
  );

  it.effect("gives every read at the same time the same Graph", () =>
    withVault(({ write, graph }) =>
      Effect.gen(function* () {
        write("Natality.md", note("Beginnings."));
        const views = yield* Effect.all(
          Array.from({ length: 5 }, () => graph.read),
          {
            concurrency: "unbounded",
          },
        );
        for (const view of views) assert.deepStrictEqual(view, views[0]);
        assert.deepStrictEqual(
          views[0]?.nodes.map((node) => node.id),
          ["Natality"],
        );
      }),
    ),
  );
});

it.layer(NodeServices.layer)("Graph.searchIndex", (it) => {
  it.effect("finds words that were written after the last search", () =>
    withVault(({ write, graph }) =>
      Effect.gen(function* () {
        write("Natality.md", note("Beginnings."));
        const hits = (index: Parameters<typeof searchIndex>[0]) =>
          searchIndex(index, "plurality").map((hit) => hit.node.id);
        assert.deepStrictEqual(hits(yield* graph.searchIndex), []);

        write("Plurality.md", note("Many people."));
        assert.deepStrictEqual(hits(yield* graph.searchIndex), ["Plurality"]);
      }),
    ),
  );
});

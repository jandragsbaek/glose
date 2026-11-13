import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { CARDS_FOLDER } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/graph.ts";
import { buildGraphView } from "./graphView.ts";
import * as Notes from "./Notes.ts";

const AI_TITLE = "Digital tools should serve deeply held values";
const MINE = "A tool earns its place only by serving something I value";

/** A Note the AI drafted, with a tag the user added in Obsidian. */
const AI_NOTE = [
  "---",
  "glose: note",
  'source: "[[Newport 2019 Digital Minimalism]]"',
  'page: "28"',
  "ai: true",
  "ai-title: true",
  "tags: [values]",
  "---",
  "",
  "> [!ai]",
  "> A tool deserves a place when it serves a value.",
  "",
].join("\n");

/** A Graph folder after setup, holding these files, with the real services over it. */
const withGraph = <A, E>(
  files: Record<string, string>,
  test: (graph: {
    readonly folder: string;
    readonly notes: Notes.Notes["Service"];
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        graphFolder: folder,
        action: "create",
      });
      yield* fs.makeDirectory(path.join(folder, CARDS_FOLDER));
      for (const [name, markdown] of Object.entries(files)) {
        yield* fs.writeFileString(path.join(folder, name), markdown);
      }
      return yield* test({ folder, notes: yield* Notes.Notes });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

const readGraph = (folder: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const names = (yield* fs.readDirectory(folder)).filter((name) => name.endsWith(".md"));
    const files = yield* Effect.forEach(names, (name) =>
      fs
        .readFileString(path.join(folder, name))
        .pipe(Effect.map((markdown) => ({ name: name.slice(0, -3), markdown }))),
    );
    return buildGraphView(files);
  });

it.layer(NodeServices.layer)("Notes.save", (it) => {
  it.effect(
    "renames a rewritten Note, keeps the user's frontmatter, and Links follow the new name",
    () =>
      withGraph(
        {
          [`${AI_TITLE}.md`]: AI_NOTE,
          "Rules beat willpower.md": `See [[${AI_TITLE}|why]] and [[${AI_TITLE}#Values]].\n`,
          [`${CARDS_FOLDER}/Why tools.md`]: `---\nglose: card\nfrom: "[[${AI_TITLE}]]"\n---\nQ\n`,
        },
        ({ folder, notes }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const saved = yield* notes.save({
              id: AI_TITLE,
              title: MINE,
              aiTitle: false,
              page: "28–29",
              body: "In my words: a tool must earn its place.",
              aiNote: false,
            });

            assert.strictEqual(saved, MINE);
            assert.strictEqual(
              yield* fs.readFileString(path.join(folder, `${MINE}.md`)),
              [
                "---",
                "glose: note",
                'source: "[[Newport 2019 Digital Minimalism]]"',
                'page: "28–29"',
                "tags: [ values ]",
                "---",
                "",
                "In my words: a tool must earn its place.",
                "",
              ].join("\n"),
            );
            assert.isFalse(yield* fs.exists(path.join(folder, `${AI_TITLE}.md`)));
            assert.strictEqual(
              yield* fs.readFileString(path.join(folder, "Rules beat willpower.md")),
              `See [[${MINE}|why]] and [[${MINE}#Values]].\n`,
            );
            assert.include(
              yield* fs.readFileString(path.join(folder, CARDS_FOLDER, "Why tools.md")),
              `from: "[[${MINE}]]"`,
            );
            const graph = yield* readGraph(folder);
            const note = graph.nodes.find((node) => node.id === MINE);
            assert.isFalse(note?.aiText);
            assert.isFalse(note?.aiTitle);
            assert.deepStrictEqual(graph.links, [{ from: "Rules beat willpower", to: MINE }]);
          }),
      ),
  );

  it.effect("keeps the AI marks on AI text the user left, corrected or not", () =>
    withGraph({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
      Effect.gen(function* () {
        const saved = yield* notes.save({
          id: AI_TITLE,
          title: AI_TITLE,
          aiTitle: true,
          page: null,
          body: "My paragraph.\n\n> [!ai]\n> A tool deserves its place when it serves a value.",
          aiNote: false,
        });

        assert.strictEqual(saved, AI_TITLE);
        const note = (yield* readGraph(folder)).nodes[0];
        assert.isTrue(note?.aiText);
        assert.isTrue(note?.aiTitle);
        assert.isNull(note?.page);
      }),
    ),
  );

  it.effect("refuses a title another file has, in any case, and changes nothing", () =>
    withGraph(
      { [`${AI_TITLE}.md`]: AI_NOTE, "Rules beat willpower.md": "Mine.\n" },
      ({ folder, notes }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const error = yield* notes
            .save({
              id: AI_TITLE,
              title: "rules beat willpower",
              aiTitle: false,
              page: null,
              body: "Mine.",
              aiNote: false,
            })
            .pipe(Effect.flip);

          assert.strictEqual(error._tag, "NoteNameTaken");
          assert.strictEqual(
            yield* fs.readFileString(path.join(folder, `${AI_TITLE}.md`)),
            AI_NOTE,
          );
        }),
    ),
  );

  it.effect("changes the case of a title in place", () =>
    withGraph({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const lower = AI_TITLE.toLowerCase();
        const saved = yield* notes.save({
          id: AI_TITLE,
          title: lower,
          aiTitle: true,
          page: "28",
          body: "> [!ai]\n> A tool deserves a place when it serves a value.",
          aiNote: false,
        });

        assert.strictEqual(saved, lower);
        assert.deepStrictEqual(
          (yield* fs.readDirectory(folder)).filter((name) => name.endsWith(".md")),
          [`${lower}.md`],
        );
      }),
    ),
  );
});

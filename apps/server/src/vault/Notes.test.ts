import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { CARDS_FOLDER } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/services.ts";
import { buildGraphView } from "./graphView.ts";
import * as Notes from "./Notes.ts";

const AI_TITLE = "Digital tools should serve deeply held values";
const MINE = "A tool earns its place only by serving something I value";

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

const TODAY = "2026-11-19";
const NOON = new Date(2026, 10, 19, 12).getTime();

const withVault = <A, E>(
  files: Record<string, string>,
  test: (vault: {
    readonly folder: string;
    readonly notes: Notes.Notes["Service"];
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(NOON);
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        vaultFolder: folder,
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
      withVault(
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
                `updated: ${TODAY}`,
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
    withVault({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
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
    withVault(
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
    withVault({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
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

const ARENDT = "---\nglose: source\nauthor-family: Arendt\ntitle: The Human Condition\n---\n";

it.layer(NodeServices.layer)("Notes.grow and Notes.tend", (it) => {
  it.effect("set Growth and the day tended, and leave the text and other fields as written", () =>
    withVault({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* notes.grow(AI_TITLE, "sapling");
        yield* notes.tend(AI_TITLE);

        const markdown = yield* fs.readFileString(path.join(folder, `${AI_TITLE}.md`));
        assert.strictEqual(
          markdown,
          AI_NOTE.replace("tags: [values]\n", "tags: [ values ]\ngrowth: sapling\n").replace(
            "---\n\n",
            `tended: ${TODAY}\n---\n\n`,
          ),
        );
        const note = (yield* readGraph(folder)).nodes[0];
        assert.strictEqual(note?.growth, "sapling");
        assert.strictEqual(note?.tended, TODAY);
      }),
    ),
  );

  it.effect("refuses a Source, which has no Growth", () =>
    withVault({ "Arendt 1958 The Human Condition.md": ARENDT }, ({ notes }) =>
      Effect.gen(function* () {
        const error = yield* notes.tend("Arendt 1958 The Human Condition").pipe(Effect.flip);
        assert.strictEqual(error._tag, "NoteNotFound");
      }),
    ),
  );
});

it.layer(NodeServices.layer)("Notes.setProperty", (it) => {
  it.effect("sets, changes and removes the user's own fields, and leaves the text as written", () =>
    withVault(
      { [`${AI_TITLE}.md`]: AI_NOTE.replace("---\n\n", "updated: 2026-11-01\n---\n\n") },
      ({ folder, notes }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          yield* notes.setProperty({ id: AI_TITLE, key: "tags", value: ["values", "tools"] });
          yield* notes.setProperty({ id: AI_TITLE, key: "reread", value: true });
          yield* notes.setProperty({ id: AI_TITLE, key: "due", value: "2026-12-01" });
          yield* notes.setProperty({ id: AI_TITLE, key: "course", value: "42" });
          yield* notes.setProperty({ id: AI_TITLE, key: "reread", value: null });

          const markdown = yield* fs.readFileString(path.join(folder, `${AI_TITLE}.md`));
          assert.include(markdown, "updated: 2026-11-01\n");
          assert.notInclude(markdown, "reread");
          assert.isTrue(
            markdown.endsWith(
              "---\n\n> [!ai]\n> A tool deserves a place when it serves a value.\n",
            ),
          );
          const properties = (yield* readGraph(folder)).nodes[0]?.properties ?? [];
          assert.deepStrictEqual(
            properties
              .filter((property) => !property.locked)
              .map(({ key, kind, value }) => [key, kind, value]),
            [
              ["page", "text", "28"],
              ["tags", "list", ["values", "tools"]],
              ["updated", "date", "2026-11-01"],
              ["due", "date", "2026-12-01"],
              ["course", "text", "42"],
            ],
          );
        }),
    ),
  );

  it.effect("refuses the fields Glose keeps and fields it cannot show, on Notes and Sources", () =>
    withVault(
      {
        [`${AI_TITLE}.md`]: AI_NOTE.replace("tags: [values]", "meta:\n  by: me"),
        "Arendt 1958 The Human Condition.md": ARENDT,
      },
      ({ folder, notes }) =>
        Effect.gen(function* () {
          const refused = (id: string, key: string) =>
            notes.setProperty({ id, key, value: "x" }).pipe(
              Effect.flip,
              Effect.map((error) => error._tag),
            );
          assert.strictEqual(yield* refused(AI_TITLE, "source"), "PropertyRefused");
          assert.strictEqual(yield* refused(AI_TITLE, "meta"), "PropertyRefused");
          assert.strictEqual(
            yield* refused("Arendt 1958 The Human Condition", "title"),
            "PropertyRefused",
          );

          yield* notes.setProperty({
            id: "Arendt 1958 The Human Condition",
            key: "tags",
            value: ["political"],
          });
          const source = (yield* readGraph(folder)).nodes.find((node) => node.kind === "source");
          assert.deepStrictEqual(source?.properties.at(-1), {
            key: "tags",
            kind: "list",
            value: ["political"],
            locked: false,
          });
        }),
    ),
  );
});

it.layer(NodeServices.layer)("Notes.createPerson", (it) => {
  it.effect("keeps a Person's own page field when its text is saved", () =>
    withVault(
      { "Cal Newport.md": "---\nglose: person\nfamily: Newport\npage: home\n---\n\nOld.\n" },
      ({ folder, notes }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          yield* notes.save({
            id: "Cal Newport",
            title: "Cal Newport",
            aiTitle: false,
            page: null,
            body: "New.",
            aiNote: false,
          });
          const written = yield* fs.readFileString(path.join(folder, "Cal Newport.md"));
          assert.include(written, "page: home");
          assert.include(written, "New.");
        }),
    ),
  );

  it.effect("saves a Note's Location as written, even the word keep", () =>
    withVault({ [`${AI_TITLE}.md`]: AI_NOTE }, ({ folder, notes }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* notes.save({
          id: AI_TITLE,
          title: AI_TITLE,
          aiTitle: true,
          page: "keep",
          body: "> [!ai]\n> A tool deserves a place when it serves a value.",
          aiNote: false,
        });
        const written = yield* fs.readFileString(path.join(folder, `${AI_TITLE}.md`));
        assert.include(written, `page: "keep"`);
      }),
    ),
  );

  it.effect("writes a Person file named given name first, and refuses a name that is taken", () =>
    withVault({ "cal newport.md": "Mine.\n" }, ({ folder, notes }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const name = yield* notes.createPerson({ family: "Csikszentmihalyi", given: "Mihaly" });

        assert.strictEqual(name, "Mihaly Csikszentmihalyi");
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, "Mihaly Csikszentmihalyi.md")),
          [
            "---",
            "glose: person",
            "family: Csikszentmihalyi",
            "given: Mihaly",
            `created: ${TODAY}`,
            `updated: ${TODAY}`,
            "---",
            "",
          ].join("\n"),
        );
        const taken = yield* notes
          .createPerson({ family: "Newport", given: "Cal" })
          .pipe(Effect.flip);
        assert.strictEqual(taken._tag, "NoteNameTaken");
      }),
    ),
  );
});

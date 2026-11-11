import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as Graph from "../graph/Graph.ts";
import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/graph.ts";
import * as Cards from "./Cards.ts";

const NOTE = "Attention residue lowers performance after switching";

/** A Graph folder after setup, with the real services over it. */
const withGraph = <A, E>(
  test: (graph: {
    readonly folder: string;
    readonly cards: Cards.Cards["Service"];
    /** Writes a file in the Cards folder, as another editor would. */
    readonly writeCard: (name: string, markdown: string) => Effect.Effect<void, unknown>;
    readonly readCard: (name: string) => Effect.Effect<string, unknown>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path | Graph.Graph>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    const cardsFolder = path.join(folder, "Cards");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        graphFolder: folder,
        action: "create",
      });
      return yield* test({
        folder,
        cards: yield* Cards.Cards,
        writeCard: (name, markdown) =>
          fs
            .makeDirectory(cardsFolder, { recursive: true })
            .pipe(Effect.andThen(fs.writeFileString(path.join(cardsFolder, name), markdown))),
        readCard: (name) => fs.readFileString(path.join(cardsFolder, name)),
      });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

const ID = /^c-[0-9a-f]{8}$/;

it.layer(NodeServices.layer)("Cards", (it) => {
  it.effect("writes an AI-written Card as Markdown that other editors can read", () =>
    withGraph(({ cards, readCard }) =>
      Effect.gen(function* () {
        const card = yield* cards.create({
          from: NOTE,
          question: "What does attention residue do?",
          answer: "It lowers performance on the next task after a switch.",
          ai: true,
        });

        assert.strictEqual(card.file, "What does attention residue do");
        assert.match(card.id ?? "", ID);
        assert.deepInclude(card, { from: NOTE, ai: true });
        assert.strictEqual(
          yield* readCard("What does attention residue do.md"),
          [
            "---",
            "glose: card",
            `id: ${card.id}`,
            `from: "[[${NOTE}]]"`,
            "ai: true",
            "---",
            "",
            "What does attention residue do?",
            "",
            "---",
            "",
            "It lowers performance on the next task after a switch.",
            "",
          ].join("\n"),
        );
      }),
    ),
  );

  it.effect("names a Card after its question, without clashing with any case of a name", () =>
    withGraph(({ cards, writeCard }) =>
      Effect.gen(function* () {
        yield* writeCard("what is flow.md", "Not a Card, but the name is taken.");
        const text = { from: NOTE, question: "What is flow?", answer: "", ai: false };
        const second = yield* cards.create(text);
        const third = yield* cards.create(text);
        const symbols = yield* cards.create({ ...text, question: "???" });

        assert.strictEqual(second.file, "What is flow 2");
        assert.strictEqual(third.file, "What is flow 3");
        // A question with nothing a file name may hold is named by its id.
        assert.strictEqual(symbols.file, symbols.id);
      }),
    ),
  );

  it.effect("reads Cards written or changed by hand, and skips other files", () =>
    withGraph(({ cards, writeCard }) =>
      Effect.gen(function* () {
        yield* writeCard(
          "Labour.md",
          [
            "---",
            "glose: card",
            'from: "[[Folder/Arendt 1958 The Human Condition#Labour|Arendt]]"',
            "---",
            "What does labour leave behind?",
            "---",
            "Nothing: it is consumed.",
            "",
            "---",
            "",
            "A rule inside the answer stays in it.",
          ].join("\n"),
        );
        yield* writeCard("No answer.md", "---\nglose: card\n---\n\nName three kinds of note.\n");
        yield* writeCard(
          "Callout.md",
          "---\nglose: card\n---\n\n> [!ai]\n> Who found attention residue?\n\n---\n\nLeroy.\n",
        );
        yield* writeCard("A note.md", "---\nglose: note\n---\n\nNot a Card.\n");
        yield* writeCard("Broken.md", "---\nglose: card\nfrom: [[\n---\n\nQuestion?\n");

        const first = yield* cards.list;
        assert.deepStrictEqual(first, [
          {
            file: "Callout",
            id: null,
            from: null,
            question: "> [!ai]\n> Who found attention residue?",
            answer: "Leroy.",
            ai: true,
          },
          {
            file: "Labour",
            id: null,
            from: "Arendt 1958 The Human Condition",
            question: "What does labour leave behind?",
            answer: "Nothing: it is consumed.\n\n---\n\nA rule inside the answer stays in it.",
            ai: false,
          },
          {
            file: "No answer",
            id: null,
            from: null,
            question: "Name three kinds of note.",
            answer: "",
            ai: false,
          },
        ]);

        // A later edit in another editor shows on the next read.
        yield* writeCard("No answer.md", "---\nglose: card\nai: true\n---\n\nName four kinds.\n");
        const second = yield* cards.list;
        assert.deepInclude(second[2], { question: "Name four kinds.", ai: true });
      }),
    ),
  );

  it.effect("edits a Card and keeps what the user added by hand", () =>
    withGraph(({ cards, writeCard, readCard }) =>
      Effect.gen(function* () {
        yield* writeCard(
          "Flow.md",
          [
            "---",
            "glose: card",
            "# Written in Obsidian",
            `from: "[[${NOTE}]]"`,
            "tags: [psychology]",
            "ai: true",
            "---",
            "",
            "What is flow?",
            "",
            "---",
            "",
            "Absorption.",
            "",
          ].join("\n"),
        );

        const edited = yield* cards.update({
          file: "Flow",
          question: "When does flow happen?",
          answer: "When challenge meets skill.",
        });
        // An edit alone does not make AI text the user's own.
        assert.isTrue(edited.ai);
        // A Card made by hand gets its id when Glose first writes it.
        assert.match(edited.id ?? "", ID);

        const cleared = yield* cards.clearAiMark("Flow");
        assert.isFalse(cleared.ai);
        assert.strictEqual(cleared.id, edited.id);
        assert.strictEqual(
          yield* readCard("Flow.md"),
          [
            "---",
            "glose: card",
            "# Written in Obsidian",
            `from: "[[${NOTE}]]"`,
            "tags: [psychology]",
            `id: ${edited.id}`,
            "---",
            "",
            "When does flow happen?",
            "",
            "---",
            "",
            "When challenge meets skill.",
            "",
          ].join("\n"),
        );
      }),
    ),
  );

  it.effect("deletes a Card, and refuses a name outside the Cards folder", () =>
    withGraph(({ cards, folder }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const card = yield* cards.create({ from: NOTE, question: "Q?", answer: "A.", ai: false });
        yield* cards.remove(card.file);
        assert.deepStrictEqual(yield* cards.list, []);

        yield* fs.writeFileString(path.join(folder, "Note.md"), "---\nglose: card\n---\n\nQ?\n");
        for (const file of ["../Note", card.file]) {
          const exit = yield* Effect.exit(cards.update({ file, question: "Q?", answer: "" }));
          assert.isTrue(Exit.isFailure(exit), file);
        }
        assert.isTrue(yield* fs.exists(path.join(folder, "Note.md")));
      }),
    ),
  );

  it.effect("keeps Cards out of the Graph's Notes", () =>
    withGraph(({ cards }) =>
      Effect.gen(function* () {
        yield* cards.create({ from: NOTE, question: "Q?", answer: "A.", ai: false });
        assert.deepStrictEqual((yield* (yield* Graph.Graph).read).nodes, []);
      }),
    ),
  );
});

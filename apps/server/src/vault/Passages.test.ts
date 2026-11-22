import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as Settings from "../settings/Settings.ts";
import { ARENDT } from "../testkit/sources.ts";
import { layerServices, makeDirs } from "../testkit/services.ts";
import * as Passages from "./Passages.ts";
import * as Sources from "./Sources.ts";

const SOURCE = "Arendt 1958 The Human Condition";

const withPassages = <A, E>(
  test: (vault: {
    readonly folder: string;
    readonly passages: Passages.Passages["Service"];
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        vaultFolder: folder,
        action: "create",
      });
      yield* (yield* Sources.Sources).create(ARENDT);
      return yield* test({ folder, passages: yield* Passages.Passages });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

it.layer(NodeServices.layer)("Passages", (it) => {
  it.effect("keeps a book's Passages as quote files and lists them in the book's order", () =>
    withPassages(({ folder, passages }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* passages.create({
          source: SOURCE,
          page: "152",
          words: "Labour leaves nothing behind.",
          yourWords: "",
        });
        const first = yield* passages.create({
          source: SOURCE,
          page: "47",
          words:
            "The human condition comprehends more than the conditions\nunder which life has been given to man.",
          yourWords: "Her widest claim.",
        });
        yield* passages.create({ source: SOURCE, page: null, words: "Action", yourWords: "" });

        assert.strictEqual(first.id, `${SOURCE} p. 47 The human condition comprehends more than`);
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, "Passages", `${first.id}.md`)),
          [
            "---",
            "glose: passage",
            `source: "[[${SOURCE}]]"`,
            'page: "47"',
            `created: ${first.created}`,
            "---",
            "",
            "> The human condition comprehends more than the conditions",
            "> under which life has been given to man.",
            "",
            "Her widest claim.",
            "",
          ].join("\n"),
        );
        const listed = yield* passages.list(SOURCE);
        assert.deepStrictEqual(
          listed.map((passage) => [passage.page, passage.words, passage.yourWords]),
          [
            [
              "47",
              "The human condition comprehends more than the conditions\nunder which life has been given to man.",
              "Her widest claim.",
            ],
            ["152", "Labour leaves nothing behind.", ""],
            [null, "Action", ""],
          ],
        );
      }),
    ),
  );

  it.effect("knows the Notes that cite a Passage, updates their footnotes, and keeps it", () =>
    withPassages(({ folder, passages }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const passage = yield* passages.create({
          source: SOURCE,
          page: "152",
          words: "Labour leaves nothing behnd.",
          yourWords: "",
        });
        const note = path.join(folder, "Labour is consumed.md");
        yield* fs.writeFileString(
          note,
          [
            "---",
            "glose: note",
            "---",
            "",
            "What labour makes is used up.",
            "",
            `[^q1]: “Labour leaves nothing behnd.” [[${passage.id}|p. 152]]`,
            "[^own]: A footnote of my own.",
            "",
          ].join("\n"),
        );

        assert.deepStrictEqual((yield* passages.get(passage.id)).usedBy, ["Labour is consumed"]);
        const refused = yield* Effect.exit(passages.remove(passage.id));
        assert.isTrue(
          Exit.isFailure(refused) && JSON.stringify(refused.cause).includes("BookPassageInUse"),
        );

        const updated = yield* passages.update({
          id: passage.id,
          page: "152–153",
          words: "Labour leaves nothing behind.",
          yourWords: "Fixed a typo.",
        });
        assert.strictEqual(updated.id, passage.id);
        assert.include(
          yield* fs.readFileString(note),
          `[^q1]: “Labour leaves nothing behind.” [[${passage.id}|p. 152–153]]\n[^own]: A footnote of my own.`,
        );

        const unused = yield* passages.create({
          source: SOURCE,
          page: "9",
          words: "Plurality",
          yourWords: "",
        });
        yield* passages.remove(unused.id);
        assert.deepStrictEqual(
          (yield* passages.list(SOURCE)).map(({ id }) => id),
          [passage.id],
        );
      }),
    ),
  );
});

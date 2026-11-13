import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import type { SourceDetails } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import * as Settings from "../settings/Settings.ts";
import { layerServices, makeDirs } from "../testkit/graph.ts";
import * as Sources from "./Sources.ts";

const ARENDT: SourceDetails = {
  familyName: "Arendt",
  givenName: "Hannah",
  title: "The Human Condition",
  firstPublished: 1958,
  edition: "2nd",
  editionYear: 1998,
  publisher: "University of Chicago Press",
  translator: null,
};

/** A Graph folder after setup, with the real services over it. */
const withGraph = <A, E>(
  test: (graph: {
    readonly folder: string;
    readonly sources: Sources.Sources["Service"];
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const path = yield* Path.Path;
    const folder = path.join(dirs.homeDir, "Glose");
    return yield* Effect.gen(function* () {
      yield* (yield* Settings.Settings).completeSetup({
        language: "en",
        graphFolder: folder,
        action: "create",
      });
      return yield* test({ folder, sources: yield* Sources.Sources });
    }).pipe(Effect.provide(layerServices(dirs)));
  }).pipe(Effect.scoped);

it.layer(NodeServices.layer)("Sources", (it) => {
  it.effect("writes a new Source as Markdown that other editors can read", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* TestClock.setTime(new Date(2026, 10, 13, 9, 30).getTime());
        const created = yield* sources.create(ARENDT);
        const markdown = yield* fs.readFileString(path.join(folder, `${created.id}.md`));

        assert.strictEqual(created.id, "Arendt 1958 The Human Condition");
        assert.strictEqual(
          markdown,
          [
            "---",
            "glose: source",
            "author-family: Arendt",
            "author-given: Hannah",
            "title: The Human Condition",
            "first-published: 1958",
            "edition: 2nd",
            "edition-year: 1998",
            "publisher: University of Chicago Press",
            "reading-step: free-text",
            "added: 2026-11-13",
            "---",
            "",
          ].join("\n"),
        );
        assert.strictEqual(created.added, new Date(2026, 10, 13).getTime());
      }),
    ),
  );

  it.effect("lists Sources written by hand and skips other Markdown files", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fs.writeFileString(
          path.join(folder, "Kierkegaard 1843 Frygt og Bæven.md"),
          "---\nglose: source\nauthor-family: Kierkegaard\ntitle: Frygt og Bæven\nfirst-published: 1843\nreading-step: probe\nreading-start: catch-up\nadded: 2026-09-14\n---\n\nAbraham tier.\n",
        );
        yield* fs.writeFileString(
          path.join(folder, "The leap of faith.md"),
          "# The leap of faith\n",
        );
        yield* fs.writeFileString(path.join(folder, "Broken.md"), "---\nglose: [source\n---\n");
        yield* fs.writeFileString(
          path.join(folder, "No author.md"),
          '---\nglose: source\nauthor-family: ""\ntitle: Anonymous\n---\n',
        );

        const listed = yield* sources.list;

        assert.deepStrictEqual(
          listed.map(({ modified: _modified, ...source }) => source),
          [
            {
              id: "Kierkegaard 1843 Frygt og Bæven",
              familyName: "Kierkegaard",
              givenName: null,
              title: "Frygt og Bæven",
              firstPublished: 1843,
              edition: null,
              editionYear: null,
              publisher: null,
              translator: null,
              readingStep: "probe",
              readingStart: "catch-up",
              freeText: "Abraham tier.",
              added: new Date(2026, 8, 14).getTime(),
            },
          ],
        );
      }),
    ),
  );

  it.effect("counts a Source without an added date from its file", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(folder, "Arendt 1958 The Human Condition.md");
        yield* fs.writeFileString(
          file,
          "---\nglose: source\nauthor-family: Arendt\ntitle: The Human Condition\nadded: someday\n---\n",
        );
        const info = yield* fs.stat(file);
        const fileTimes = [info.birthtime, info.mtime].flatMap((time) =>
          Option.toArray(time).map((date) => date.getTime()),
        );

        const source = yield* sources.get("Arendt 1958 The Human Condition");

        assert.include(fileTimes, source.added);
      }),
    ),
  );

  it.effect("keeps file names valid on Windows and refuses names that differ only in case", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fs.writeFileString(path.join(folder, "Kierkegaard 1843 Frygt og Bæven.MD"), "");
        const takenByExtension = yield* sources
          .create({
            ...ARENDT,
            familyName: "Kierkegaard",
            title: "Frygt og Bæven",
            firstPublished: 1843,
          })
          .pipe(Effect.flip);
        const heidegger = yield* sources.create({
          ...ARENDT,
          familyName: "Heidegger",
          title: 'What is "Being"? A/B: notes.',
          firstPublished: 1927,
        });
        const taken = yield* sources
          .create({ ...ARENDT, title: "THE HUMAN CONDITION" })
          .pipe(Effect.andThen(sources.create(ARENDT)), Effect.flip);

        assert.strictEqual(heidegger.id, "Heidegger 1927 What is Being A B notes");
        assert.strictEqual(taken._tag, "SourceNameTaken");
        assert.strictEqual(takenByExtension._tag, "SourceNameTaken");
      }),
    ),
  );

  it.effect("refuses an id that is a path, not a file name", () =>
    withGraph(({ sources }) =>
      Effect.gen(function* () {
        const error = yield* sources.get("../app-data/settings").pipe(Effect.flip);
        assert.strictEqual(error._tag, "SourceNotFound");
      }),
    ),
  );

  it.effect("saves Free text and moves to Extraction only when the step is finished", () =>
    withGraph(({ sources }) =>
      Effect.gen(function* () {
        const { id } = yield* sources.create(ARENDT);
        const draft = yield* sources.saveFreeText({
          id,
          freeText: "Labour, work, action.",
          finish: false,
        });
        const finished = yield* sources.saveFreeText({
          id,
          freeText: draft.freeText,
          finish: true,
        });
        const reread = yield* sources.get(id);

        assert.deepStrictEqual(
          [draft.readingStep, finished.readingStep, reread.freeText],
          ["free-text", "extraction", "Labour, work, action."],
        );
      }),
    ),
  );

  it.effect("keeps the answer to where the user is with the book, which sets the first step", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const writer = yield* sources.create(ARENDT);
        const written = yield* sources.chooseStart({ id: writer.id, start: "write" });
        const markdown = yield* fs.readFileString(path.join(folder, `${writer.id}.md`));
        const prober = yield* sources.create({ ...ARENDT, title: "Between Past and Future" });
        const probed = yield* sources.chooseStart({ id: prober.id, start: "catch-up" });

        assert.include(markdown, "reading-step: free-text\nreading-start: write\n");
        assert.deepStrictEqual(
          [written.readingStep, probed.readingStep, (yield* sources.get(prober.id)).readingStart],
          ["free-text", "probe", "catch-up"],
        );
      }),
    ),
  );

  it.effect("moves a Source on in the order its start gives", () =>
    withGraph(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const prober = yield* sources.create(ARENDT);
        yield* sources.chooseStart({ id: prober.id, start: "catch-up" });
        // A second click, or a step another window took, changes nothing.
        const stale = yield* sources.advance({ id: prober.id, from: "extraction" });
        const extraction = yield* sources.advance({ id: prober.id, from: "probe" });
        const done = yield* sources.advance({ id: prober.id, from: "extraction" });
        const markdown = yield* fs.readFileString(path.join(folder, `${prober.id}.md`));

        assert.deepStrictEqual(
          [stale.readingStep, extraction.readingStep, done.readingStep],
          ["probe", "extraction", "done"],
        );
        assert.include(markdown, "reading-step: done\nreading-start: catch-up\n");

        // A Source that starts with writing, or from before the question, goes on to the Probe.
        const writer = yield* sources.create({ ...ARENDT, title: "Between Past and Future" });
        yield* sources.saveFreeText({ id: writer.id, freeText: "", finish: true });
        const probe = yield* sources.advance({ id: writer.id, from: "extraction" });
        assert.strictEqual(probe.readingStep, "probe");
      }),
    ),
  );
});

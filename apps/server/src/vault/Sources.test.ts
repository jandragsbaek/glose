import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { BOOK_TEXT_DETAILS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";

import { ARENDT, withVault } from "../testkit/sources.ts";

it.layer(NodeServices.layer)("Sources", (it) => {
  it.effect("writes a new Source as Markdown that other editors can read", () =>
    withVault(({ folder, sources }) =>
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
            "updated: 2026-11-13",
            "---",
            "",
          ].join("\n"),
        );
        assert.strictEqual(created.added, new Date(2026, 10, 13).getTime());
      }),
    ),
  );

  it.effect("lists Sources written by hand and skips other Markdown files", () =>
    withVault(({ folder, sources }) =>
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
              ...BOOK_TEXT_DETAILS,
              hasText: false,
              videoLink: null,
              videoFile: null,
              readingPlace: null,
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
    withVault(({ folder, sources }) =>
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
    withVault(({ folder, sources }) =>
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
    withVault(({ sources }) =>
      Effect.gen(function* () {
        const error = yield* sources.get("../app-data/settings").pipe(Effect.flip);
        assert.strictEqual(error._tag, "SourceNotFound");
      }),
    ),
  );

  it.effect("saves Free text and moves to Extraction only when the step is finished", () =>
    withVault(({ sources }) =>
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
    withVault(({ folder, sources }) =>
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

  it.effect("keeps the fields the user added by hand when it saves a Source", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(folder, "Arendt 1958 The Human Condition.md");
        yield* fs.writeFileString(
          file,
          "---\nglose: source\nauthor-family: Arendt\ntitle: The Human Condition\nadded: 2026-09-14\ntags: [politics]\nshelf: home # by the desk\n---\n",
        );
        yield* TestClock.setTime(new Date(2026, 10, 19, 9, 0).getTime());
        yield* sources.chooseStart({ id: "Arendt 1958 The Human Condition", start: "write" });

        assert.strictEqual(
          yield* fs.readFileString(file),
          [
            "---",
            "glose: source",
            "author-family: Arendt",
            "title: The Human Condition",
            "reading-step: free-text",
            "reading-start: write",
            "added: 2026-09-14",
            "updated: 2026-11-19",
            "tags: [ politics ]",
            "shelf: home # by the desk",
            "---",
            "",
          ].join("\n"),
        );
      }),
    ),
  );

  it.effect("moves a Source on in the order its start gives", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const prober = yield* sources.create(ARENDT);
        yield* sources.chooseStart({ id: prober.id, start: "catch-up" });
        const stale = yield* sources.advance({ id: prober.id, from: "extraction" });
        const extraction = yield* sources.advance({ id: prober.id, from: "probe" });
        const done = yield* sources.advance({ id: prober.id, from: "extraction" });
        const markdown = yield* fs.readFileString(path.join(folder, `${prober.id}.md`));

        assert.deepStrictEqual(
          [stale.readingStep, extraction.readingStep, done.readingStep],
          ["probe", "extraction", "done"],
        );
        assert.include(markdown, "reading-step: done\nreading-start: catch-up\n");

        const writer = yield* sources.create({ ...ARENDT, title: "Between Past and Future" });
        yield* sources.saveFreeText({ id: writer.id, freeText: "", finish: true });
        const probe = yield* sources.advance({ id: writer.id, from: "extraction" });
        assert.strictEqual(probe.readingStep, "probe");
      }),
    ),
  );

  it.effect("imports a Course lesson with its text, and marks a Passage in that text", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* TestClock.setTime(new Date(2026, 10, 17, 9, 0).getTime());
        const lesson = yield* sources.importText({
          ...BOOK_TEXT_DETAILS,
          kind: "lesson",
          familyName: "Lindqvist",
          givenName: "Anna",
          title: "Retrieval before generation",
          firstPublished: 2026,
          edition: null,
          editionYear: null,
          publisher: null,
          translator: null,
          container: "Practical AI Engineering",
          part: "2.3",
          markdown: "# Retrieval\r\n\r\nA model answers from training.\r\n",
        });

        assert.strictEqual(lesson.id, "Lindqvist 2026 2.3 Retrieval before generation");
        assert.deepStrictEqual(
          [lesson.kind, lesson.readingStep, lesson.hasText],
          ["lesson", "read", true],
        );
        const sourceFile = yield* fs.readFileString(path.join(folder, `${lesson.id}.md`));
        assert.include(sourceFile, "kind: lesson\n");
        assert.include(sourceFile, 'container: Practical AI Engineering\npart: "2.3"\n');
        assert.strictEqual(
          yield* sources.articleText(lesson.id),
          "# Retrieval\n\nA model answers from training.\n",
        );

        const marked = yield* sources.markPassage({
          id: lesson.id,
          paragraph: 1,
          start: 2,
          end: 7,
        });
        assert.strictEqual(marked.passage, "1.1");
        assert.include(
          yield* fs.readFileString(path.join(folder, "Articles", `${lesson.id}.md`)),
          "A ==model== answers",
        );
        const overlap = yield* sources
          .markPassage({ id: lesson.id, paragraph: 1, start: 0, end: 10 })
          .pipe(Effect.flip);
        assert.strictEqual(
          overlap._tag === "PassageRefused" ? overlap.reason : overlap._tag,
          "overlap",
        );

        const stale = yield* sources
          .setPassageWords({ id: lesson.id, passage: "1.1", words: "Mine.", text: "another word" })
          .pipe(Effect.flip);
        assert.strictEqual(stale._tag, "PassageRefused", "a save for words that moved is refused");
        const twin = yield* sources
          .setPassageWords({ id: lesson.id, passage: "1.1", words: "Mine.", text: "model", at: 9 })
          .pipe(Effect.flip);
        assert.strictEqual(
          twin._tag,
          "PassageRefused",
          "the same words elsewhere are another Passage",
        );
        const worded = yield* sources.setPassageWords({
          id: lesson.id,
          passage: "1.1",
          words: "Mine.",
          text: "model",
        });
        assert.include(worded.markdown, "==model==[^glose-1]");

        yield* Effect.all(
          [
            sources.setPlace({ id: lesson.id, place: 1 }),
            sources.saveFreeText({ id: lesson.id, freeText: "Notes kept.", finish: false }),
          ],
          { concurrency: "unbounded" },
        );
        const both = yield* sources.get(lesson.id);
        assert.deepStrictEqual(
          [both.readingPlace, both.freeText],
          [1, "Notes kept."],
          "two saves at once both land",
        );
        const placed = yield* sources.setPlace({ id: lesson.id, place: 1 });
        assert.strictEqual(placed.readingPlace, 1);
        const listed = yield* sources.list;
        assert.deepStrictEqual(
          listed.map((source) => source.id),
          [lesson.id],
          "the text in Articles/ is not a Source",
        );
      }),
    ),
  );

  it.effect("moves an Article from reading to the step the user chooses", () =>
    withVault(({ sources }) =>
      Effect.gen(function* () {
        const article = yield* sources.importText({
          ...ARENDT,
          ...BOOK_TEXT_DETAILS,
          kind: "article",
          title: "Reflections on Little Rock",
          markdown: "Text.",
        });
        const probed = yield* sources.chooseStart({ id: article.id, start: "probe" });
        assert.strictEqual(probed.readingStep, "probe");
        const extraction = yield* sources.advance({ id: probed.id, from: "probe" });
        assert.strictEqual(extraction.readingStep, "extraction");
        const book = yield* sources.create(ARENDT);
        const refused = yield* sources.articleText(book.id).pipe(Effect.flip);
        assert.strictEqual(refused._tag, "PassageRefused");
      }),
    ),
  );

  it.effect("adds a Video with its watch page, and its watch notes lead to Extraction", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* TestClock.setTime(new Date(2026, 10, 18, 9, 30).getTime());
        const video = yield* sources.addVideo({
          familyName: "Sinek",
          givenName: "Simon",
          title: "Start with why",
          firstPublished: 2009,
          container: "TEDx Talks",
          url: "https://youtu.be/u4ZoJKF_VuA?si=share&t=42",
        });
        const notes = "[0:42](https://www.youtube.com/watch?v=u4ZoJKF_VuA&t=42s) People buy why.";
        const watched = yield* sources.saveFreeText({
          id: video.id,
          freeText: notes,
          finish: true,
        });
        const markdown = yield* fs.readFileString(path.join(folder, `${video.id}.md`));

        assert.strictEqual(video.id, "Sinek 2009 Start with why");
        assert.deepStrictEqual(
          [video.kind, video.readingStep, video.hasText, watched.readingStep],
          ["video", "free-text", false, "extraction"],
        );
        assert.strictEqual(
          markdown,
          [
            "---",
            "glose: source",
            "kind: video",
            "author-family: Sinek",
            "author-given: Simon",
            "title: Start with why",
            "first-published: 2009",
            "container: TEDx Talks",
            "url: https://www.youtube.com/watch?v=u4ZoJKF_VuA",
            "reading-step: extraction",
            "added: 2026-11-18",
            "updated: 2026-11-18",
            "---",
            "",
            notes,
            "",
          ].join("\n"),
        );
      }),
    ),
  );

  it.effect("refuses a Video whose address is not a YouTube video, and writes no file", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const refused = yield* Effect.flip(
          sources.addVideo({
            familyName: "Sinek",
            givenName: null,
            title: "Start with why",
            firstPublished: 2009,
            container: null,
            url: "https://vimeo.com/76979871",
          }),
        );

        assert.strictEqual(refused._tag, "VideoNotFound");
        assert.deepStrictEqual(
          (yield* fs.readDirectory(folder)).filter((name) => name.endsWith(".md")),
          [],
        );
      }),
    ),
  );
});

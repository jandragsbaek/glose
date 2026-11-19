import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { BOOK_TEXT_DETAILS } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import { ARENDT, withVault } from "../testkit/sources.ts";

it.layer(NodeServices.layer)("Sources: a course day's video", (it) => {
  const LESSON = {
    ...BOOK_TEXT_DETAILS,
    kind: "lesson",
    familyName: "Lindqvist",
    givenName: "Anna",
    title: "Agents and tools",
    firstPublished: 2026,
    edition: null,
    editionYear: null,
    publisher: null,
    translator: null,
    container: "Practical AI Engineering",
    part: "3.3",
    markdown: "# Agents\n\nAn agent is a model in a loop.\n",
  } as const;

  it.effect("keeps a course day's video link with its lesson, and changes or removes it", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const lesson = yield* sources.importText({
          ...LESSON,
          videoLink: "https://mega.dev/members/week-3/day-3",
        });
        const file = path.join(folder, `${lesson.id}.md`);

        assert.strictEqual(lesson.videoLink, "https://mega.dev/members/week-3/day-3");
        assert.include(
          yield* fs.readFileString(file),
          "video-link: https://mega.dev/members/week-3/day-3\n",
        );

        const changed = yield* sources.setLessonVideo({
          id: lesson.id,
          link: "https://mega.dev/members/w3d3",
          removeFile: false,
        });
        assert.strictEqual(changed.videoLink, "https://mega.dev/members/w3d3");

        const removed = yield* sources.setLessonVideo({
          id: lesson.id,
          link: null,
          removeFile: false,
        });
        assert.strictEqual(removed.videoLink, null);
        assert.notInclude(yield* fs.readFileString(file), "video-link");
      }),
    ),
  );

  it.effect("refuses a video for a Source that is not a Course lesson", () =>
    withVault(({ sources }) =>
      Effect.gen(function* () {
        const book = yield* sources.create(ARENDT);
        const refused = yield* Effect.flip(
          sources.setLessonVideo({ id: book.id, link: "https://example.com/v", removeFile: false }),
        );
        assert.strictEqual(refused._tag, "NotALesson");
      }),
    ),
  );

  it.effect("saves a course day's video file outside the git backup, and removes it again", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fs.writeFileString(path.join(folder, ".gitignore"), "*.glose-tmp");
        const lesson = yield* sources.importText(LESSON);
        const bytes = new TextEncoder().encode("not really a video");

        const saved = yield* sources.saveLessonVideoFile({
          id: lesson.id,
          name: "Agents in 20 minutes.MP4",
          body: Stream.make(bytes.slice(0, 5), bytes.slice(5)),
        });

        const stored = path.join(folder, "Course videos", `${lesson.id}.mp4`);
        assert.strictEqual(saved.videoFile, `${lesson.id}.mp4`);
        assert.strictEqual(yield* sources.lessonVideoFile(lesson.id), stored);
        assert.deepStrictEqual(yield* fs.readFile(stored), bytes);
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, ".gitignore")),
          "*.glose-tmp\n/Course videos/\n",
        );

        yield* sources.saveLessonVideoFile({
          id: lesson.id,
          name: "again.webm",
          body: Stream.make(bytes),
        });
        assert.deepStrictEqual(yield* fs.readDirectory(path.join(folder, "Course videos")), [
          `${lesson.id}.webm`,
        ]);
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, ".gitignore")),
          "*.glose-tmp\n/Course videos/\n",
        );

        const cleared = yield* sources.setLessonVideo({
          id: lesson.id,
          link: null,
          removeFile: true,
        });
        assert.strictEqual(cleared.videoFile, null);
        assert.deepStrictEqual(yield* fs.readDirectory(path.join(folder, "Course videos")), []);
      }),
    ),
  );

  it.effect("refuses a file that is not a video, and stores nothing", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const lesson = yield* sources.importText(LESSON);
        const refused = yield* Effect.flip(
          sources.saveLessonVideoFile({
            id: lesson.id,
            name: "notes.pdf",
            body: Stream.make(new Uint8Array([1])),
          }),
        );
        assert.strictEqual(refused._tag, "NotAVideoFile");
        assert.isFalse(yield* fs.exists(path.join(folder, "Course videos")));
      }),
    ),
  );

  it.effect("never serves or removes a video file the Source names outside its own", () =>
    withVault(({ folder, sources }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const lesson = yield* sources.importText(LESSON);
        const file = path.join(folder, `${lesson.id}.md`);
        const outside = path.join(folder, "keep.mp4");
        yield* fs.writeFileString(outside, "not the lesson's");
        const markdown = yield* fs.readFileString(file);
        yield* fs.writeFileString(
          file,
          markdown.replace("reading-step:", 'video-file: "../keep.mp4"\nreading-step:'),
        );

        const refused = yield* Effect.flip(sources.lessonVideoFile(lesson.id));
        assert.strictEqual(refused._tag, "SourceNotFound");
        yield* sources.setLessonVideo({ id: lesson.id, link: null, removeFile: true });
        assert.isTrue(yield* fs.exists(outside));
      }),
    ),
  );
});

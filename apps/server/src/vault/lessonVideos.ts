import {
  COURSE_VIDEOS_DIR,
  courseVideoExtension,
  NotALesson,
  type SetLessonVideo,
  type Source,
  SourceNotFound,
  StorageError,
  type VaultFolderNotSet,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import type * as Path from "effect/Path";
import type * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import { ignoreCourseVideos, NotAVideoFile, ownVideoFile } from "./courseVideoFiles.ts";
import type { SourceFileContent } from "./sourceFile.ts";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const lessonVideos = ({
  fs,
  path,
  vaultFolder,
  get,
  writeSource,
  writing,
}: {
  readonly fs: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly vaultFolder: Effect.Effect<string, VaultFolderNotSet | StorageError>;
  readonly get: (
    id: string,
  ) => Effect.Effect<Source, SourceNotFound | VaultFolderNotSet | StorageError>;
  readonly writeSource: (
    folder: string,
    id: string,
    content: SourceFileContent,
  ) => Effect.Effect<Source, unknown>;
  readonly writing: Semaphore.Semaphore;
}) => {
  const lessonOf = Effect.fn("Sources.lessonOf")(function* (id: string) {
    const source = yield* get(id);
    if (source.kind !== "lesson") return yield* new NotALesson({ id });
    return source;
  });

  return {
    setLessonVideo: Effect.fn("Sources.setLessonVideo")(
      function* ({ id, link, removeFile }: SetLessonVideo) {
        const source = yield* lessonOf(id);
        const folder = yield* vaultFolder;
        const stored = ownVideoFile(id, source.videoFile);
        if (removeFile && stored !== null) {
          yield* fs
            .remove(path.join(folder, COURSE_VIDEOS_DIR, stored), { force: true })
            .pipe(Effect.mapError(storageError));
        }
        return yield* writeSource(folder, id, {
          ...source,
          videoLink: link,
          videoFile: removeFile ? null : source.videoFile,
        }).pipe(Effect.mapError(storageError));
      },
      (effect) => writing.withPermit(effect),
    ),

    saveLessonVideoFile: Effect.fn("Sources.saveLessonVideoFile")(function* ({
      id,
      name,
      body,
    }: {
      readonly id: string;
      readonly name: string;
      readonly body: Stream.Stream<Uint8Array, unknown>;
    }) {
      const extension = courseVideoExtension(name);
      if (extension === null) return yield* new NotAVideoFile({ name });
      yield* lessonOf(id);
      const folder = yield* vaultFolder;
      const videos = path.join(folder, COURSE_VIDEOS_DIR);
      const fileName = `${id}.${extension}`;
      const target = path.join(videos, fileName);
      const temporary = `${target}.${crypto.randomUUID()}.glose-tmp`;
      const removeTemporary = fs.remove(temporary, { force: true }).pipe(Effect.ignore);
      yield* Effect.gen(function* () {
        yield* fs.makeDirectory(videos, { recursive: true });
        yield* writing.withPermit(ignoreCourseVideos(fs, path, folder));
        yield* body.pipe(Stream.run(fs.sink(temporary)));
      }).pipe(
        Effect.onError(() => removeTemporary),
        Effect.mapError(storageError),
      );
      return yield* writing.withPermit(
        Effect.gen(function* () {
          const source = yield* lessonOf(id);
          yield* fs.rename(temporary, target).pipe(Effect.mapError(storageError));
          const written = yield* writeSource(folder, id, { ...source, videoFile: fileName }).pipe(
            Effect.mapError(storageError),
          );
          const old = ownVideoFile(id, source.videoFile);
          if (old !== null && old !== fileName) {
            yield* fs.remove(path.join(videos, old), { force: true }).pipe(Effect.ignore);
          }
          return written;
        }).pipe(Effect.onError(() => removeTemporary)),
      );
    }),

    lessonVideoFile: Effect.fn("Sources.lessonVideoFile")(function* (id: string) {
      const source = yield* get(id);
      const folder = yield* vaultFolder;
      const stored = ownVideoFile(id, source.videoFile);
      if (stored === null) return yield* new SourceNotFound({ id });
      return path.join(folder, COURSE_VIDEOS_DIR, stored);
    }),
  };
};

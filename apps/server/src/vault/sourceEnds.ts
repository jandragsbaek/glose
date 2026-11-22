import {
  COURSE_VIDEOS_DIR,
  firstReadingStep,
  type ReadingStart,
  type Source,
  type SourceNotFound,
  StorageError,
  type VaultFolderNotSet,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import type * as Path from "effect/Path";
import type * as Semaphore from "effect/Semaphore";

import { ownVideoFile } from "./courseVideoFiles.ts";
import type { SourceFileContent } from "./sourceFile.ts";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const sourceEnds = ({
  fs,
  path,
  vaultFolder,
  get,
  writeSource,
  fileOf,
  articleOf,
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
  readonly fileOf: (folder: string, id: string) => string;
  readonly articleOf: (folder: string, id: string) => string;
  readonly writing: Semaphore.Semaphore;
}) => ({
  startOver: Effect.fn("Sources.startOver")(
    function* ({ id, start }: { readonly id: string; readonly start: ReadingStart | null }) {
      const source = yield* get(id);
      const folder = yield* vaultFolder;
      const readingStart = source.kind === "book" ? start : null;
      return yield* writeSource(folder, id, {
        ...source,
        readingStart,
        readingStep: firstReadingStep(readingStart, source.kind),
      }).pipe(Effect.mapError(storageError));
    },
    (effect) => writing.withPermit(effect),
  ),

  remove: Effect.fn("Sources.remove")(
    function* (id: string) {
      const source = yield* get(id);
      const folder = yield* vaultFolder;
      const video = ownVideoFile(id, source.videoFile);
      yield* Effect.gen(function* () {
        if (video !== null) {
          yield* fs.remove(path.join(folder, COURSE_VIDEOS_DIR, video), { force: true });
        }
        yield* fs.remove(articleOf(folder, id), { force: true });
        yield* fs.remove(fileOf(folder, id));
      }).pipe(Effect.mapError(storageError));
    },
    (effect) => writing.withPermit(effect),
  ),
});

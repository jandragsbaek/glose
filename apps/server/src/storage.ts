import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";

/**
 * Writes beside the target, then renames over it, so a crash or a sync client (Dropbox) never
 * sees a half-written file.
 */
export const writeFileAtomic = Effect.fn("writeFileAtomic")(function* (
  fs: FileSystem.FileSystem,
  file: string,
  content: string,
  options?: { readonly mode?: number },
) {
  const temporary = `${file}.glose-tmp`;
  yield* fs.writeFileString(temporary, content, options);
  yield* fs.rename(temporary, file);
});

import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";

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

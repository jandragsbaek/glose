import { COURSE_VIDEOS_DIR, courseVideoExtension } from "@glose/contracts";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import type * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { writeFileAtomic } from "../storage.ts";

export class NotAVideoFile extends Schema.TaggedError<NotAVideoFile>()("NotAVideoFile", {
  name: Schema.String,
}) {}

const IGNORE_VIDEOS = `/${COURSE_VIDEOS_DIR}/`;

export const ownVideoFile = (id: string, name: string | null): string | null => {
  const extension = name === null ? null : courseVideoExtension(name);
  return extension !== null && name === `${id}.${extension}` ? name : null;
};

export const ignoreCourseVideos = Effect.fn("ignoreCourseVideos")(function* (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  folder: string,
) {
  const ignore = path.join(folder, ".gitignore");
  if (yield* fs.exists(ignore)) {
    const text = yield* fs.readFileString(ignore);
    if (text.split(/\r?\n/).some((line) => line.trim() === IGNORE_VIDEOS)) return;
    const end = text === "" || text.endsWith("\n") ? "" : "\n";
    yield* writeFileAtomic(fs, ignore, `${text}${end}${IGNORE_VIDEOS}\n`);
  } else if (yield* fs.exists(path.join(folder, ".git"))) {
    yield* writeFileAtomic(fs, ignore, `${IGNORE_VIDEOS}\n`);
  }
});

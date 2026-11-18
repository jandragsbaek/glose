import { parseArticle } from "@glose/contracts";

import {
  comparePart,
  detailsFromMarkdown,
  lessonTitle,
  partByOrder,
  partFromName,
} from "../domain/importText.ts";
import type { FromFiles, Origin } from "./CourseFields.tsx";
import type { Lesson } from "./LessonTable.tsx";

export const pathOf = (file: File) =>
  (file as File & { readonly webkitRelativePath?: string }).webkitRelativePath || file.name;

interface ReadLesson {
  readonly name: string;
  readonly path: string;
  readonly markdown: string;
}

export const lessonBatch = (
  read: ReadonlyArray<ReadLesson>,
  files: ReadonlyArray<File>,
  perWeek: number,
) => {
  const lessons = read.map((file, index): Lesson => {
    const named = partFromName(file.name);
    return {
      key: `${index}:${file.path}`,
      name: file.name,
      path: file.path,
      markdown: file.markdown,
      order: index,
      partByName: named !== null,
      part: named ?? partByOrder(index, perWeek),
      title: lessonTitle(file.name, file.markdown),
      words: parseArticle(file.markdown).words,
      state: "new",
      id: null,
    };
  });
  const first = detailsFromMarkdown(read[0]!.markdown);
  const path = pathOf(files[0]!);
  const folder = path.includes("/") ? path.split("/")[0]! : null;
  const found: Record<FromFiles, { readonly value: string; readonly origin: Origin }> = {
    name:
      first.container !== null
        ? { value: first.container, origin: "file" }
        : { value: folder ?? "", origin: "folder" },
    family: { value: first.family ?? "", origin: "file" },
    given: { value: first.given ?? "", origin: "file" },
    year:
      first.year !== null
        ? { value: first.year, origin: "file" }
        : { value: String(new Date().getFullYear()), origin: "guess" },
  };
  return {
    lessons: [...lessons].sort((a, b) => comparePart(a.part, b.part)),
    folder,
    found,
  };
};

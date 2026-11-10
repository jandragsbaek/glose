import {
  GraphFolderNotSet,
  type Source,
  type SourceDetails,
  SourceNameTaken,
  SourceNotFound,
  StorageError,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { isFileName, sameFileName, toFileName } from "./fileName.ts";
import { parseSourceFile, renderSourceFile, type SourceFileContent } from "./sourceFile.ts";

type GraphError = GraphFolderNotSet | StorageError;

export class Sources extends Context.Service<
  Sources,
  {
    readonly list: Effect.Effect<ReadonlyArray<Source>, GraphError>;
    readonly get: (id: string) => Effect.Effect<Source, SourceNotFound | GraphError>;
    readonly create: (
      details: SourceDetails,
    ) => Effect.Effect<Source, SourceNameTaken | GraphError>;
    readonly saveFreeText: (input: {
      readonly id: string;
      readonly freeText: string;
      readonly finish: boolean;
    }) => Effect.Effect<Source, SourceNotFound | GraphError>;
  }
>()("glose/Sources") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;

  const graphFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { graphFolder } }) =>
      graphFolder === null ? Effect.fail(new GraphFolderNotSet()) : Effect.succeed(graphFolder),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}${MARKDOWN}`);

  const readSource = Effect.fn("Sources.readSource")(function* (folder: string, id: string) {
    const file = fileOf(folder, id);
    const markdown = yield* fs.readFileString(file);
    const info = yield* fs.stat(file);
    return parseSourceFile(markdown).pipe(
      Option.map((content): Source => ({
        id,
        ...content,
        modified: Option.getOrElse(info.mtime, () => new Date(0)).getTime(),
      })),
    );
  });

  const markdownNames = Effect.fn("Sources.markdownNames")(function* (folder: string) {
    const entries = yield* fs.readDirectory(folder);
    return entries
      .filter((entry) => entry.endsWith(MARKDOWN))
      .map((entry) => entry.slice(0, -MARKDOWN.length));
  });

  const writeSource = Effect.fn("Sources.writeSource")(function* (
    folder: string,
    id: string,
    content: SourceFileContent,
  ) {
    yield* writeFileAtomic(fs, fileOf(folder, id), renderSourceFile(content));
    const written = yield* readSource(folder, id);
    if (Option.isNone(written)) return yield* Effect.die(`Source ${id} did not read back.`);
    return written.value;
  });

  const get = Effect.fn("Sources.get")(function* (id: string) {
    const folder = yield* graphFolder;
    const notFound = new SourceNotFound({ id });
    if (!isFileName(id)) return yield* notFound;
    if (!(yield* fs.exists(fileOf(folder, id)).pipe(Effect.mapError(storageError)))) {
      return yield* notFound;
    }
    const source = yield* readSource(folder, id).pipe(Effect.mapError(storageError));
    return yield* Option.match(source, {
      onNone: () => Effect.fail(notFound),
      onSome: Effect.succeed,
    });
  });

  return Sources.of({
    list: Effect.gen(function* () {
      const folder = yield* graphFolder;
      const names = yield* markdownNames(folder).pipe(Effect.mapError(storageError));
      const sources = yield* Effect.forEach(names, (name) => readSource(folder, name), {
        concurrency: 8,
      }).pipe(Effect.mapError(storageError));
      return sources
        .flatMap((source) => Option.toArray(source))
        .sort((a, b) => b.modified - a.modified);
    }),

    get,

    create: Effect.fn("Sources.create")(function* (details) {
      const folder = yield* graphFolder;
      const id = toFileName(
        [details.familyName, details.firstPublished, details.title]
          .filter((part) => part !== null)
          .join(" "),
      );
      // Every entry counts, whatever its case or extension case: on macOS and Windows
      // "Name.MD" and "name.md" are the same file.
      const existing = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
      if (id === "" || existing.some((entry) => sameFileName(entry, `${id}${MARKDOWN}`))) {
        return yield* new SourceNameTaken({ fileName: `${id}${MARKDOWN}` });
      }
      return yield* writeSource(folder, id, {
        ...details,
        readingStep: "free-text",
        freeText: "",
      }).pipe(Effect.mapError(storageError));
    }),

    saveFreeText: Effect.fn("Sources.saveFreeText")(function* ({ id, freeText, finish }) {
      const source = yield* get(id);
      const folder = yield* graphFolder;
      const readingStep =
        finish && source.readingStep === "free-text" ? "extraction" : source.readingStep;
      return yield* writeSource(folder, id, { ...source, freeText, readingStep }).pipe(
        Effect.mapError(storageError),
      );
    }),
  });
});

export const layer = Layer.effect(Sources, make);

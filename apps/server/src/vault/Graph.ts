import { PASSAGES_FOLDER, VaultFolderNotSet, type GraphView, StorageError } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as Settings from "../settings/Settings.ts";
import { buildGraphView } from "./graphView.ts";
import { parsePassageFile } from "./passageFile.ts";

export class Graph extends Context.Service<
  Graph,
  {
    readonly read: Effect.Effect<GraphView, VaultFolderNotSet | StorageError>;
  }
>()("glose/Graph") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;

  const readPassages = Effect.fn("Graph.readPassages")(function* (folder: string) {
    if (!(yield* fs.exists(folder))) return [];
    const entries = (yield* fs.readDirectory(folder)).filter(
      (entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."),
    );
    const read = yield* Effect.forEach(
      entries,
      (entry) =>
        fs.readFileString(path.join(folder, entry)).pipe(
          Effect.map((markdown) => {
            const file = parsePassageFile(markdown);
            return file === null
              ? []
              : [{ id: entry.slice(0, -MARKDOWN.length), source: file.source }];
          }),
        ),
      { concurrency: 16 },
    );
    return read.flat();
  });

  return Graph.of({
    read: Effect.gen(function* () {
      const { vaultFolder } = (yield* settings.get).settings;
      if (vaultFolder === null) return yield* new VaultFolderNotSet();
      const entries = yield* fs.readDirectory(vaultFolder).pipe(Effect.mapError(storageError));
      const names = entries.filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));
      const files = yield* Effect.forEach(
        names,
        (entry) =>
          fs
            .readFileString(path.join(vaultFolder, entry))
            .pipe(Effect.map((markdown) => ({ name: entry.slice(0, -MARKDOWN.length), markdown }))),
        { concurrency: 16 },
      ).pipe(Effect.mapError(storageError));
      const passages = yield* readPassages(path.join(vaultFolder, PASSAGES_FOLDER)).pipe(
        Effect.mapError(storageError),
      );
      return { ...buildGraphView(files), passages };
    }).pipe(Effect.withSpan("Graph.read")),
  });
});

export const layer = Layer.effect(Graph, make);

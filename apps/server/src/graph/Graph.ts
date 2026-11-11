import { GraphFolderNotSet, type GraphView, StorageError } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as Settings from "../settings/Settings.ts";
import { buildGraphView } from "./graphView.ts";

export class Graph extends Context.Service<
  Graph,
  {
    /** Every Markdown file in the Graph folder and the Links between them, read afresh. */
    readonly read: Effect.Effect<GraphView, GraphFolderNotSet | StorageError>;
  }
>()("glose/Graph") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;

  return Graph.of({
    read: Effect.gen(function* () {
      const { graphFolder } = (yield* settings.get).settings;
      if (graphFolder === null) return yield* new GraphFolderNotSet();
      const entries = yield* fs.readDirectory(graphFolder).pipe(Effect.mapError(storageError));
      // The folder is flat, as the Sources are; subfolders are not read yet.
      const names = entries.filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));
      const files = yield* Effect.forEach(
        names,
        (entry) =>
          fs
            .readFileString(path.join(graphFolder, entry))
            .pipe(Effect.map((markdown) => ({ name: entry.slice(0, -MARKDOWN.length), markdown }))),
        { concurrency: 16 },
      ).pipe(Effect.mapError(storageError));
      return buildGraphView(files);
    }).pipe(Effect.withSpan("Graph.read")),
  });
});

export const layer = Layer.effect(Graph, make);

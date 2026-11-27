import {
  type GraphPassage,
  type GraphSearchIndex,
  type GraphView,
  indexNodes,
  PASSAGES_FOLDER,
  StorageError,
  VaultFolderNotSet,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import * as Settings from "../settings/Settings.ts";
import { assembleGraphView, type ParsedFile, parseGraphFile } from "./graphView.ts";
import { parsePassageFile } from "./passageFile.ts";

type GraphError = VaultFolderNotSet | StorageError;

export class Graph extends Context.Service<
  Graph,
  {
    readonly read: Effect.Effect<GraphView, GraphError>;
    readonly searchIndex: Effect.Effect<GraphSearchIndex, GraphError>;
  }
>()("glose/Graph") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

interface Parsed<A> {
  readonly stamp: string;
  readonly value: A;
}

interface Folder<A> {
  readonly files: Map<string, Parsed<A>>;
  names: ReadonlyArray<string>;
}

const emptyFolder = <A>(): Folder<A> => ({ files: new Map(), names: [] });

const stampOf = (stats: NodeFS.BigIntStats) =>
  `${stats.ino}:${stats.size}:${stats.mtimeNs}:${stats.ctimeNs}`;

const isMissing = (cause: unknown) =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";

const utf8 = new TextDecoder();

const readIfPresent = (file: string): string | null => {
  try {
    return utf8.decode(NodeFS.readFileSync(file));
  } catch (cause) {
    if (isMissing(cause)) return null;
    throw cause;
  }
};

const markdownNames = (folder: string): ReadonlyArray<string> =>
  NodeFS.readdirSync(folder).filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));

const refresh = <A>(
  folder: string,
  cached: Folder<A>,
  parse: (name: string, markdown: string) => A,
): boolean => {
  const names: Array<string> = [];
  let changed = false;
  for (const entry of markdownNames(folder)) {
    const file = NodePath.join(folder, entry);
    const stats = NodeFS.statSync(file, { bigint: true, throwIfNoEntry: false });
    if (stats === undefined || !stats.isFile()) continue;
    const stamp = stampOf(stats);
    if (cached.files.get(entry)?.stamp !== stamp) {
      const markdown = readIfPresent(file);
      if (markdown === null) continue;
      cached.files.set(entry, { stamp, value: parse(entry.slice(0, -MARKDOWN.length), markdown) });
      changed = true;
    }
    names.push(entry);
  }
  if (names.length !== cached.files.size) {
    const present = new Set(names);
    for (const entry of cached.files.keys()) if (!present.has(entry)) cached.files.delete(entry);
    changed = true;
  }
  if (!changed && names.some((entry, at) => cached.names[at] !== entry)) changed = true;
  cached.names = names;
  return changed;
};

const parsePassage = (id: string, markdown: string): GraphPassage | null => {
  const file = parsePassageFile(markdown);
  return file === null ? null : { id, source: file.source };
};

interface Cache {
  readonly vault: string;
  readonly notes: Folder<ParsedFile>;
  readonly passages: Folder<GraphPassage | null>;
  view: GraphView | null;
}

const emptyCache = (vault: string): Cache => ({
  vault,
  notes: emptyFolder(),
  passages: emptyFolder(),
  view: null,
});

const valuesOf = <A>(folder: Folder<A>) =>
  folder.names.flatMap((entry) => {
    const parsed = folder.files.get(entry);
    return parsed === undefined ? [] : [parsed.value];
  });

const viewOf = (cache: Cache): GraphView => {
  const { notes, passages } = cache;
  const notesChanged = refresh(cache.vault, notes, (name, markdown) =>
    parseGraphFile({ name, markdown }),
  );
  let passagesChanged: boolean;
  try {
    passagesChanged = refresh(NodePath.join(cache.vault, PASSAGES_FOLDER), passages, parsePassage);
  } catch (cause) {
    if (!isMissing(cause)) throw cause;
    passagesChanged = passages.names.length > 0;
    passages.files.clear();
    passages.names = [];
  }
  if (cache.view !== null && !notesChanged && !passagesChanged) return cache.view;
  cache.view = {
    ...assembleGraphView(valuesOf(notes)),
    passages: valuesOf(passages).filter((passage) => passage !== null),
  };
  return cache.view;
};

export const make = Effect.gen(function* () {
  const settings = yield* Settings.Settings;
  const scope = yield* Effect.scope;
  const reading = yield* Semaphore.make(1);

  let cache = emptyCache("");
  let index: GraphSearchIndex | null = null;

  const update = Effect.gen(function* () {
    const { vaultFolder } = (yield* settings.get).settings;
    if (vaultFolder === null) return yield* new VaultFolderNotSet();
    if (cache.vault !== vaultFolder) cache = emptyCache(vaultFolder);
    const current = cache;
    return yield* Effect.try({
      try: () => {
        try {
          return viewOf(current);
        } catch (cause) {
          current.view = null;
          throw cause;
        }
      },
      catch: storageError,
    });
  }).pipe(Effect.withSpan("Graph.update"));

  let next: Deferred.Deferred<GraphView, GraphError> | null = null;

  const read = Effect.uninterruptibleMask((restore) =>
    Effect.suspend(() => {
      if (next !== null) return restore(Deferred.await(next));
      const shared = Deferred.makeUnsafe<GraphView, GraphError>();
      next = shared;
      const run = reading.withPermit(
        Effect.suspend(() => {
          if (next === shared) next = null;
          return update;
        }),
      );
      return Effect.forkIn(run, scope).pipe(
        Effect.flatMap((worker) => {
          worker.addObserver((exit) => {
            if (next === shared) next = null;
            Deferred.doneUnsafe(shared, exit);
          });
          return restore(Deferred.await(shared));
        }),
      );
    }),
  ).pipe(Effect.withSpan("Graph.read"));

  return Graph.of({
    read,
    searchIndex: read.pipe(
      Effect.map((view) => {
        if (index === null || index.nodes !== view.nodes) index = indexNodes(view.nodes);
        return index;
      }),
    ),
  });
});

export const layer = Layer.effect(Graph, make);

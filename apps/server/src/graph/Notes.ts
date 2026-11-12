import { GraphFolderNotSet, NoteNameTaken, StorageError } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { sameFileName, toFileName } from "./fileName.ts";
import { type NoteFileContent, renderNoteFile } from "./noteFile.ts";

export class Notes extends Context.Service<
  Notes,
  {
    /**
     * Writes a new Note file named for its title, made file-safe. A name another file has, in
     * any case, is refused: two Notes with one title would be one idea twice.
     */
    readonly create: (
      input: NoteFileContent & { readonly title: string },
    ) => Effect.Effect<string, NoteNameTaken | GraphFolderNotSet | StorageError>;
  }
>()("glose/graph/Notes") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const writing = yield* Semaphore.make(1);

  return Notes.of({
    create: Effect.fn("Notes.create")(
      function* ({ title, ...content }) {
        const { graphFolder } = (yield* settings.get).settings;
        if (graphFolder === null) return yield* new GraphFolderNotSet();
        const name = toFileName(title);
        if (name === "") return yield* new NoteNameTaken({ fileName: title });
        const taken = yield* fs.readDirectory(graphFolder).pipe(Effect.mapError(storageError));
        if (taken.some((entry) => sameFileName(entry, `${name}${MARKDOWN}`))) {
          return yield* new NoteNameTaken({ fileName: name });
        }
        yield* writeFileAtomic(
          fs,
          path.join(graphFolder, `${name}${MARKDOWN}`),
          renderNoteFile(content),
        ).pipe(Effect.mapError(storageError));
        return name;
      },
      (effect) => writing.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Notes, make);

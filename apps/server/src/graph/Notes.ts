import {
  CARDS_FOLDER,
  GraphFolderNotSet,
  NoteNameTaken,
  NoteNotFound,
  type SaveNote,
  StorageError,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { isFileName, sameFileName, toFileName } from "./fileName.ts";
import { editNoteFile, type NoteFileContent, renderNoteFile } from "./noteFile.ts";
import { relinkWikilinks } from "./relink.ts";
import { parseSourceFile } from "./sourceFile.ts";

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
    /**
     * Saves a Note the user edited and returns its file name. A new title renames the file, and
     * every wikilink to it, in the Graph folder and in the Cards, names the new file, as Obsidian
     * does on a rename.
     */
    readonly save: (
      input: SaveNote,
    ) => Effect.Effect<string, NoteNotFound | NoteNameTaken | GraphFolderNotSet | StorageError>;
  }
>()("glose/graph/Notes") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const writing = yield* Semaphore.make(1);

  /** Every Markdown file in a folder that links to `from` links to `to` instead. */
  const relinkFolder = Effect.fn("Notes.relinkFolder")(function* (
    folder: string,
    from: string,
    to: string,
  ) {
    const entries = yield* fs.readDirectory(folder);
    const files = entries.filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));
    yield* Effect.forEach(
      files,
      (entry) =>
        Effect.gen(function* () {
          const file = path.join(folder, entry);
          const markdown = yield* fs.readFileString(file);
          const relinked = relinkWikilinks(markdown, from, to);
          if (relinked !== markdown) yield* writeFileAtomic(fs, file, relinked);
        }),
      { concurrency: 8 },
    );
  });

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

    save: Effect.fn("Notes.save")(
      function* ({ id, title, aiTitle, page, body, aiNote }) {
        const { graphFolder } = (yield* settings.get).settings;
        if (graphFolder === null) return yield* new GraphFolderNotSet();
        if (!isFileName(id)) return yield* new NoteNotFound({ id });
        const file = path.join(graphFolder, `${id}${MARKDOWN}`);
        if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
          return yield* new NoteNotFound({ id });
        }
        const markdown = yield* fs.readFileString(file).pipe(Effect.mapError(storageError));
        // A Source is edited on its own page, not as a Note.
        if (Option.isSome(parseSourceFile(markdown))) return yield* new NoteNotFound({ id });

        const name = toFileName(title);
        if (name === "") return yield* new NoteNameTaken({ fileName: title });
        const entries = yield* fs.readDirectory(graphFolder).pipe(Effect.mapError(storageError));
        const own = `${id}${MARKDOWN}`;
        if (
          entries.some(
            (entry) => sameFileName(entry, `${name}${MARKDOWN}`) && !sameFileName(entry, own),
          )
        ) {
          return yield* new NoteNameTaken({ fileName: name });
        }

        const edited = editNoteFile(markdown, { page, body, aiTitle, aiNote });
        if (edited === null) {
          return yield* new StorageError({ detail: `The frontmatter of ${own} is not YAML.` });
        }
        yield* writeFileAtomic(fs, file, edited).pipe(Effect.mapError(storageError));
        if (name === id) return id;

        yield* fs
          .rename(file, path.join(graphFolder, `${name}${MARKDOWN}`))
          .pipe(Effect.mapError(storageError));
        const cards = path.join(graphFolder, CARDS_FOLDER);
        const folders = (yield* fs.exists(cards).pipe(Effect.mapError(storageError)))
          ? [graphFolder, cards]
          : [graphFolder];
        yield* Effect.forEach(folders, (folder) =>
          relinkFolder(folder, id, name).pipe(Effect.mapError(storageError)),
        );
        return name;
      },
      (effect) => writing.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Notes, make);

import {
  CARDS_FOLDER,
  VaultFolderNotSet,
  NoteNameTaken,
  NoteNotFound,
  type SaveNote,
  StorageError,
  isFileName,
  sameFileName,
  toFileName,
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
import { editNoteFile, type NoteFileContent, renderNoteFile } from "./noteFile.ts";
import { relinkWikilinks } from "./relink.ts";
import { parseSourceFile } from "./sourceFile.ts";

export class Notes extends Context.Service<
  Notes,
  {
    readonly create: (
      input: NoteFileContent & { readonly title: string },
    ) => Effect.Effect<string, NoteNameTaken | VaultFolderNotSet | StorageError>;
    readonly checkName: (
      title: string,
    ) => Effect.Effect<string, NoteNameTaken | VaultFolderNotSet | StorageError>;
    readonly save: (
      input: SaveNote,
    ) => Effect.Effect<string, NoteNotFound | NoteNameTaken | VaultFolderNotSet | StorageError>;
  }
>()("glose/vault/Notes") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const writing = yield* Semaphore.make(1);

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

  const checkName = Effect.fn("Notes.checkName")(function* (title: string) {
    const { vaultFolder } = (yield* settings.get).settings;
    if (vaultFolder === null) return yield* new VaultFolderNotSet();
    const name = toFileName(title);
    if (name === "") return yield* new NoteNameTaken({ fileName: title });
    const taken = yield* fs.readDirectory(vaultFolder).pipe(Effect.mapError(storageError));
    if (taken.some((entry) => sameFileName(entry, `${name}${MARKDOWN}`))) {
      return yield* new NoteNameTaken({ fileName: name });
    }
    return name;
  });

  return Notes.of({
    checkName,

    create: Effect.fn("Notes.create")(
      function* ({ title, ...content }) {
        const { vaultFolder } = (yield* settings.get).settings;
        if (vaultFolder === null) return yield* new VaultFolderNotSet();
        const name = yield* checkName(title);
        yield* writeFileAtomic(
          fs,
          path.join(vaultFolder, `${name}${MARKDOWN}`),
          renderNoteFile(content),
        ).pipe(Effect.mapError(storageError));
        return name;
      },
      (effect) => writing.withPermit(effect),
    ),

    save: Effect.fn("Notes.save")(
      function* ({ id, title, aiTitle, page, body, aiNote }) {
        const { vaultFolder } = (yield* settings.get).settings;
        if (vaultFolder === null) return yield* new VaultFolderNotSet();
        if (!isFileName(id)) return yield* new NoteNotFound({ id });
        const file = path.join(vaultFolder, `${id}${MARKDOWN}`);
        if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
          return yield* new NoteNotFound({ id });
        }
        const markdown = yield* fs.readFileString(file).pipe(Effect.mapError(storageError));
        if (Option.isSome(parseSourceFile(markdown))) return yield* new NoteNotFound({ id });

        const name = toFileName(title);
        if (name === "") return yield* new NoteNameTaken({ fileName: title });
        const entries = yield* fs.readDirectory(vaultFolder).pipe(Effect.mapError(storageError));
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
          .rename(file, path.join(vaultFolder, `${name}${MARKDOWN}`))
          .pipe(Effect.mapError(storageError));
        const cards = path.join(vaultFolder, CARDS_FOLDER);
        const folders = (yield* fs.exists(cards).pipe(Effect.mapError(storageError)))
          ? [vaultFolder, cards]
          : [vaultFolder];
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

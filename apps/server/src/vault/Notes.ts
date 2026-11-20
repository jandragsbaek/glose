import {
  CARDS_FOLDER,
  type Growth,
  isPropertyKey,
  localDay,
  NOTE_FIELDS,
  PropertyRefused,
  type SetProperty,
  VaultFolderNotSet,
  NoteNameTaken,
  NoteNotFound,
  type SaveNote,
  StorageError,
  isFileName,
  sameFileName,
  toFileName,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { propertiesOf } from "./frontmatter.ts";
import {
  editNoteFile,
  type NoteFileContent,
  pageValue,
  renderNoteFile,
  setNoteFields,
} from "./noteFile.ts";
import { relinkWikilinks } from "./relink.ts";
import { FRONTMATTER, parseSourceFile, parseYaml, SOURCE_FIELDS } from "./sourceFile.ts";

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
    readonly grow: (
      id: string,
      growth: Growth,
    ) => Effect.Effect<string, NoteNotFound | VaultFolderNotSet | StorageError>;
    readonly tend: (
      id: string,
    ) => Effect.Effect<string, NoteNotFound | VaultFolderNotSet | StorageError>;
    readonly setProperty: (
      input: SetProperty,
    ) => Effect.Effect<string, NoteNotFound | PropertyRefused | VaultFolderNotSet | StorageError>;
  }
>()("glose/vault/Notes") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

const today = Effect.map(Clock.currentTimeMillis, localDay);

const frontmatterValues = (markdown: string): unknown => {
  const match = FRONTMATTER.exec(markdown);
  return match ? parseYaml(match[1] ?? "") : undefined;
};

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

  const vaultFile = Effect.fn("Notes.vaultFile")(function* (id: string) {
    const { vaultFolder } = (yield* settings.get).settings;
    if (vaultFolder === null) return yield* new VaultFolderNotSet();
    if (!isFileName(id)) return yield* new NoteNotFound({ id });
    const file = path.join(vaultFolder, `${id}${MARKDOWN}`);
    if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
      return yield* new NoteNotFound({ id });
    }
    const markdown = yield* fs.readFileString(file).pipe(Effect.mapError(storageError));
    return { file, markdown, isSource: Option.isSome(parseSourceFile(markdown)) };
  });

  const noteFile = Effect.fn("Notes.noteFile")(function* (id: string) {
    const { file, markdown, isSource } = yield* vaultFile(id);
    if (isSource) return yield* new NoteNotFound({ id });
    return { file, markdown };
  });

  const writeFields = Effect.fn("Notes.writeFields")(function* (
    id: string,
    file: string,
    markdown: string,
    fields: Readonly<Record<string, unknown>>,
  ) {
    const edited = setNoteFields(markdown, fields);
    if (edited === null) {
      return yield* new StorageError({
        detail: `The frontmatter of ${id}${MARKDOWN} is not YAML.`,
      });
    }
    yield* writeFileAtomic(fs, file, edited).pipe(Effect.mapError(storageError));
    return id;
  });

  const setFields = Effect.fn("Notes.setFields")(
    function* (id: string, fields: Readonly<Record<string, string>>) {
      const { file, markdown } = yield* noteFile(id);
      return yield* writeFields(id, file, markdown, fields);
    },
    (effect) => writing.withPermit(effect),
  );

  const setProperty = Effect.fn("Notes.setProperty")(
    function* ({ id, key, value }: SetProperty) {
      const { file, markdown, isSource } = yield* vaultFile(id);
      const owned = isSource ? SOURCE_FIELDS : NOTE_FIELDS;
      if (!isPropertyKey(key) || owned.has(key)) return yield* new PropertyRefused({ key });
      const current = propertiesOf(frontmatterValues(markdown), owned).find(
        (property) => property.key === key,
      );
      if (current?.kind === "other") return yield* new PropertyRefused({ key });
      const written =
        !isSource && key === "page" && typeof value === "string" ? pageValue(value) : value;
      return yield* writeFields(id, file, markdown, { [key]: written });
    },
    (effect) => writing.withPermit(effect),
  );

  return Notes.of({
    checkName,

    grow: (id, growth) => setFields(id, { growth }),

    tend: (id) => Effect.flatMap(today, (day) => setFields(id, { tended: day })),

    setProperty,

    create: Effect.fn("Notes.create")(
      function* ({ title, ...content }) {
        const { vaultFolder } = (yield* settings.get).settings;
        if (vaultFolder === null) return yield* new VaultFolderNotSet();
        const name = yield* checkName(title);
        yield* writeFileAtomic(
          fs,
          path.join(vaultFolder, `${name}${MARKDOWN}`),
          renderNoteFile(content, yield* today),
        ).pipe(Effect.mapError(storageError));
        return name;
      },
      (effect) => writing.withPermit(effect),
    ),

    save: Effect.fn("Notes.save")(
      function* ({ id, title, aiTitle, page, body, aiNote }) {
        const { vaultFolder } = (yield* settings.get).settings;
        if (vaultFolder === null) return yield* new VaultFolderNotSet();
        const { file, markdown } = yield* noteFile(id);

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

        const edited = editNoteFile(markdown, { page, body, aiTitle, aiNote, today: yield* today });
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

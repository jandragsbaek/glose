import {
  type BookPassage,
  BookPassageInUse,
  BookPassageNotFound,
  type CreateBookPassage,
  isFileName,
  isPageNumber,
  linkKey,
  localDay,
  pageOrder,
  passageFileTitle,
  PASSAGES_FOLDER,
  StorageError,
  type SourceNotFound,
  type UpdateBookPassage,
  VaultFolderNotSet,
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
import {
  linkedNames,
  type PassageFile,
  parsePassageFile,
  passageCite,
  refreshFootnotes,
  renderPassageFile,
} from "./passageFile.ts";
import * as Sources from "./Sources.ts";

type VaultError = VaultFolderNotSet | StorageError;

export class Passages extends Context.Service<
  Passages,
  {
    readonly list: (
      source: string,
    ) => Effect.Effect<ReadonlyArray<BookPassage>, SourceNotFound | VaultError>;
    readonly get: (id: string) => Effect.Effect<BookPassage, BookPassageNotFound | VaultError>;
    readonly create: (
      input: CreateBookPassage,
    ) => Effect.Effect<BookPassage, SourceNotFound | VaultError>;
    readonly update: (
      input: UpdateBookPassage,
    ) => Effect.Effect<BookPassage, BookPassageNotFound | VaultError>;
    readonly remove: (
      id: string,
    ) => Effect.Effect<void, BookPassageNotFound | BookPassageInUse | VaultError>;
  }
>()("glose/vault/Passages") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

const numberedPage = (page: string | null): number | null =>
  page !== null && isPageNumber(page) ? pageOrder(page) : null;

interface Kept {
  readonly passage: BookPassage;
  readonly born: number;
}

const inPageOrder = (a: Kept, b: Kept): number => {
  const [pa, pb] = [numberedPage(a.passage.page), numberedPage(b.passage.page)];
  if (pa !== pb) return pa === null ? 1 : pb === null ? -1 : pa - pb;
  return a.born - b.born || a.passage.id.localeCompare(b.passage.id, "en");
};

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const sources = yield* Sources.Sources;
  const writing = yield* Semaphore.make(1);

  const vaultFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { vaultFolder } }) =>
      vaultFolder === null ? Effect.fail(new VaultFolderNotSet()) : Effect.succeed(vaultFolder),
    ),
  );
  const language = settings.get.pipe(Effect.map(({ settings }) => settings.language ?? "en"));
  const folderOf = (vault: string) => path.join(vault, PASSAGES_FOLDER);
  const fileOf = (vault: string, id: string) => path.join(folderOf(vault), `${id}${MARKDOWN}`);

  const markdownFiles = Effect.fn("Passages.markdownFiles")(function* (folder: string) {
    if (!(yield* fs.exists(folder))) return [];
    const entries = yield* fs.readDirectory(folder);
    const names = entries.filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));
    return yield* Effect.forEach(
      names,
      (entry) =>
        fs
          .readFileString(path.join(folder, entry))
          .pipe(Effect.map((markdown) => ({ id: entry.slice(0, -MARKDOWN.length), markdown }))),
      { concurrency: 16 },
    );
  });

  const citingNotes = Effect.fn("Passages.citingNotes")(function* (vault: string) {
    const notes = yield* markdownFiles(vault);
    return notes.map(({ id, markdown }) => ({ id, markdown, links: linkedNames(markdown) }));
  });

  const allPassages = Effect.fn("Passages.all")(function* (vault: string) {
    const files = yield* markdownFiles(folderOf(vault));
    const parsed = files.flatMap(({ id, markdown }) => {
      const file = parsePassageFile(markdown);
      return file === null ? [] : [{ id, file }];
    });
    return yield* Effect.forEach(parsed, (found) =>
      fs.stat(fileOf(vault, found.id)).pipe(
        Effect.map((info) => ({
          ...found,
          born:
            Option.getOrNull(info.birthtime)?.getTime() ??
            Option.getOrNull(info.mtime)?.getTime() ??
            0,
        })),
      ),
    );
  });

  const withUse = (
    id: string,
    file: PassageFile,
    notes: ReadonlyArray<{ readonly id: string; readonly links: ReadonlySet<string> }>,
  ): BookPassage => ({
    id,
    source: file.source,
    page: file.page,
    words: file.words,
    yourWords: file.yourWords,
    created: file.created,
    usedBy: notes.filter((note) => note.links.has(linkKey(id))).map((note) => note.id),
  });

  const read = Effect.fn("Passages.read")(function* (vault: string, id: string) {
    const notFound = new BookPassageNotFound({ id });
    if (!isFileName(id)) return yield* notFound;
    const file = fileOf(vault, id);
    if (!(yield* fs.exists(file).pipe(Effect.mapError(storageError)))) return yield* notFound;
    const parsed = parsePassageFile(
      yield* fs.readFileString(file).pipe(Effect.mapError(storageError)),
    );
    if (parsed === null) return yield* notFound;
    const notes = yield* citingNotes(vault).pipe(Effect.mapError(storageError));
    return { passage: withUse(id, parsed, notes), file: parsed, notes };
  });

  const freeId = Effect.fn("Passages.freeId")(function* (
    vault: string,
    source: string,
    page: string | null,
    words: string,
  ) {
    const taken = new Set((yield* markdownFiles(folderOf(vault))).map(({ id }) => linkKey(id)));
    const wordCount = words.split(/\s+/).filter((word) => word !== "").length;
    for (let more = 0; more <= wordCount; more++) {
      const id = passageFileTitle(source, page, words, more);
      if (!taken.has(linkKey(id))) return id;
    }
    const base = passageFileTitle(source, page, words, wordCount);
    let n = 2;
    while (taken.has(linkKey(`${base} ${n}`))) n++;
    return `${base} ${n}`;
  });

  return Passages.of({
    list: Effect.fn("Passages.list")(function* (asked) {
      const source = yield* sources.get(asked);
      const vault = yield* vaultFolder;
      const passages = yield* allPassages(vault).pipe(Effect.mapError(storageError));
      const notes = yield* citingNotes(vault).pipe(Effect.mapError(storageError));
      return passages
        .filter(({ file }) => linkKey(file.source) === linkKey(source.id))
        .map(({ id, file, born }) => ({ passage: withUse(id, file, notes), born }))
        .sort(inPageOrder)
        .map(({ passage }) => passage);
    }),

    get: Effect.fn("Passages.get")(function* (id) {
      return (yield* read(yield* vaultFolder, id)).passage;
    }),

    create: Effect.fn("Passages.create")(
      function* ({ source: asked, page, words, yourWords }) {
        const source = yield* sources.get(asked);
        const vault = yield* vaultFolder;
        const file: PassageFile = {
          source: source.id,
          page,
          words,
          yourWords,
          created: localDay(yield* Clock.currentTimeMillis),
        };
        const id = yield* Effect.gen(function* () {
          yield* fs.makeDirectory(folderOf(vault), { recursive: true });
          const id = yield* freeId(vault, source.id, page, words);
          yield* writeFileAtomic(fs, fileOf(vault, id), renderPassageFile(file));
          return id;
        }).pipe(Effect.mapError(storageError));
        return withUse(id, file, []);
      },
      (effect) => writing.withPermit(effect),
    ),

    update: Effect.fn("Passages.update")(
      function* ({ id, page, words, yourWords }) {
        const vault = yield* vaultFolder;
        const found = yield* read(vault, id);
        const file: PassageFile = { ...found.file, page, words, yourWords };
        const cite = passageCite(id, page, words, yield* language);
        yield* Effect.gen(function* () {
          yield* writeFileAtomic(fs, fileOf(vault, id), renderPassageFile(file));
          for (const note of found.notes) {
            if (!note.links.has(linkKey(id))) continue;
            const refreshed = refreshFootnotes(note.markdown, id, cite);
            if (refreshed !== note.markdown) {
              yield* writeFileAtomic(fs, path.join(vault, `${note.id}${MARKDOWN}`), refreshed);
            }
          }
        }).pipe(Effect.mapError(storageError));
        return { ...found.passage, page, words, yourWords };
      },
      (effect) => writing.withPermit(effect),
    ),

    remove: Effect.fn("Passages.remove")(
      function* (id) {
        const vault = yield* vaultFolder;
        const { passage } = yield* read(vault, id);
        if (passage.usedBy.length > 0) {
          return yield* new BookPassageInUse({ id, notes: passage.usedBy });
        }
        yield* fs.remove(fileOf(vault, id)).pipe(Effect.mapError(storageError));
      },
      (effect) => writing.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Passages, make);

import {
  type Card,
  CardNotFound,
  CARDS_FOLDER,
  type CardText,
  GraphFolderNotSet,
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
import * as NodeCrypto from "node:crypto";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { type CardFileContent, editCardFile, parseCardFile, renderCardFile } from "./cardFile.ts";

type GraphError = GraphFolderNotSet | StorageError;

export class Cards extends Context.Service<
  Cards,
  {
    readonly list: Effect.Effect<ReadonlyArray<Card>, GraphError>;
    readonly create: (
      input: CardText & { readonly from: string | null; readonly ai: boolean },
    ) => Effect.Effect<Card, GraphError>;
    readonly update: (
      input: CardText & { readonly file: string },
    ) => Effect.Effect<Card, CardNotFound | GraphError>;
    readonly clearAiMark: (file: string) => Effect.Effect<Card, CardNotFound | GraphError>;
    readonly ensureId: (file: string) => Effect.Effect<Card, CardNotFound | GraphError>;
    readonly remove: (file: string) => Effect.Effect<void, CardNotFound | GraphError>;
  }
>()("glose/cards/Cards") {}

const MARKDOWN = ".md";
const NAME_ROOM = 112;

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

const newId = () => `c-${NodeCrypto.randomBytes(4).toString("hex")}`;

interface Indexed {
  readonly stamp: string;
  readonly card: Card | null;
}

const toCard = (file: string, content: CardFileContent): Card => ({ file, ...content });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;

  let index: { folder: string; files: Map<string, Indexed> } = { folder: "", files: new Map() };
  const reading = yield* Semaphore.make(1);
  const writing = yield* Semaphore.make(1);

  const cardsFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { graphFolder } }) =>
      graphFolder === null
        ? Effect.fail(new GraphFolderNotSet())
        : Effect.succeed(path.join(graphFolder, CARDS_FOLDER)),
    ),
  );

  const fileOf = (folder: string, file: string) => path.join(folder, `${file}${MARKDOWN}`);

  const stampOf = (info: FileSystem.File.Info) =>
    `${Option.getOrElse(info.mtime, () => new Date(0)).getTime()}:${info.size}`;

  const readCard = Effect.fn("Cards.readCard")(function* (folder: string, file: string) {
    const markdown = yield* fs.readFileString(fileOf(folder, file));
    return Option.getOrNull(Option.map(parseCardFile(markdown), (card) => toCard(file, card)));
  });

  const list = Effect.gen(function* () {
    const folder = yield* cardsFolder;
    if (index.folder !== folder) index = { folder, files: new Map() };
    const files = index.files;
    if (!(yield* fs.exists(folder))) {
      files.clear();
      return [];
    }
    const names = (yield* fs.readDirectory(folder))
      .filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."))
      .map((entry) => entry.slice(0, -MARKDOWN.length));
    const present = new Set(names);
    for (const name of files.keys()) if (!present.has(name)) files.delete(name);
    yield* Effect.forEach(
      names,
      (name) =>
        Effect.gen(function* () {
          const stamp = stampOf(yield* fs.stat(fileOf(folder, name)));
          if (files.get(name)?.stamp === stamp) return;
          files.set(name, { stamp, card: yield* readCard(folder, name) });
        }),
      { concurrency: 16, discard: true },
    );
    return names
      .sort((a, b) => a.localeCompare(b, "en"))
      .flatMap((name) => {
        const card = files.get(name)?.card;
        return card === null || card === undefined ? [] : [card];
      });
  }).pipe(
    Effect.mapError(storageError),
    (effect) => reading.withPermit(effect),
    Effect.withSpan("Cards.list"),
  );

  const freeName = (question: string, id: string, taken: ReadonlyArray<string>) => {
    const base = toFileName(question).slice(0, NAME_ROOM).trimEnd() || id;
    const free = (name: string) =>
      !taken.some((entry) => sameFileName(entry, `${name}${MARKDOWN}`));
    if (free(base)) return base;
    for (let n = 2; ; n += 1) if (free(`${base} ${n}`)) return `${base} ${n}`;
  };

  const write = Effect.fn("Cards.write")(function* (folder: string, file: string, text: string) {
    yield* writeFileAtomic(fs, fileOf(folder, file), text).pipe(Effect.mapError(storageError));
    const card = yield* readCard(folder, file).pipe(Effect.mapError(storageError));
    if (card === null) return yield* Effect.die(`Card ${file} did not read back.`);
    return card;
  });

  const existing = Effect.fn("Cards.existing")(function* (file: string) {
    const folder = yield* cardsFolder;
    const notFound = new CardNotFound({ file });
    if (!isFileName(file)) return yield* notFound;
    const target = fileOf(folder, file);
    if (!(yield* fs.exists(target).pipe(Effect.mapError(storageError)))) return yield* notFound;
    const markdown = yield* fs.readFileString(target).pipe(Effect.mapError(storageError));
    return { folder, markdown, notFound };
  });

  const edit = Effect.fn("Cards.edit")(
    function* (file: string, change: { readonly text?: CardText; readonly clearAiMark?: boolean }) {
      const { folder, markdown, notFound } = yield* existing(file);
      const card = Option.getOrNull(parseCardFile(markdown));
      if (card === null) return yield* notFound;
      const ids = card.id === null ? new Set((yield* list).map((other) => other.id)) : null;
      let id = card.id ?? newId();
      while (ids?.has(id)) id = newId();
      const edited = editCardFile(markdown, { ...change, ...(card.id === null ? { id } : {}) });
      if (Option.isNone(edited)) return yield* notFound;
      return yield* write(folder, file, edited.value);
    },
    (effect) => writing.withPermit(effect),
  );

  return Cards.of({
    list,

    create: Effect.fn("Cards.create")(
      function* ({ from, question, answer, ai }) {
        const folder = yield* cardsFolder;
        const cards = yield* list;
        const ids = new Set(cards.map((card) => card.id));
        let id = newId();
        while (ids.has(id)) id = newId();
        yield* fs.makeDirectory(folder, { recursive: true }).pipe(Effect.mapError(storageError));
        const taken = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
        const file = freeName(question, id, taken);
        return yield* write(folder, file, renderCardFile({ id, from, question, answer, ai }));
      },
      (effect) => writing.withPermit(effect),
    ),

    update: ({ file, question, answer }) => edit(file, { text: { question, answer } }),

    clearAiMark: (file) => edit(file, { clearAiMark: true }),

    ensureId: Effect.fn("Cards.ensureId")(function* (file: string) {
      const card = (yield* list).find((other) => other.file === file);
      if (card === undefined) return yield* new CardNotFound({ file });
      return card.id === null ? yield* edit(file, {}) : card;
    }),

    remove: Effect.fn("Cards.remove")(
      function* (file: string) {
        const { folder } = yield* existing(file);
        yield* fs.remove(fileOf(folder, file)).pipe(Effect.mapError(storageError));
      },
      (effect) => writing.withPermit(effect),
    ),
  });
});

export const layer = Layer.effect(Cards, make);

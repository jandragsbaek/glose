import {
  BOOK_TEXT_DETAILS,
  GraphFolderNotSet,
  hasOwnText,
  type ImportText,
  markPassage,
  parseArticle,
  PassageRefused,
  type PassageEdit,
  removePassage,
  setPassageWords,
  type ReadingStart,
  nextReadingStep,
  type ReadingStep,
  type Source,
  type SourceDetails,
  SourceNameTaken,
  SourceNotFound,
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
    readonly chooseStart: (input: {
      readonly id: string;
      readonly start: ReadingStart;
    }) => Effect.Effect<Source, SourceNotFound | GraphError>;
    readonly advance: (input: {
      readonly id: string;
      readonly from: ReadingStep;
    }) => Effect.Effect<Source, SourceNotFound | GraphError>;
    readonly importText: (input: ImportText) => Effect.Effect<Source, SourceNameTaken | GraphError>;
    readonly freeId: (
      details: Pick<ImportText, "familyName" | "firstPublished" | "title" | "kind" | "part">,
    ) => Effect.Effect<string | null, GraphError>;
    readonly setPlace: (input: {
      readonly id: string;
      readonly place: number;
    }) => Effect.Effect<Source, SourceNotFound | GraphError>;
    readonly articleText: (
      id: string,
    ) => Effect.Effect<string, SourceNotFound | PassageRefused | GraphError>;
    readonly markPassage: (input: {
      readonly id: string;
      readonly paragraph: number;
      readonly start: number;
      readonly end: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | GraphError>;
    readonly removePassage: (input: {
      readonly id: string;
      readonly passage: string;
      readonly text?: string;
      readonly at?: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | GraphError>;
    readonly setPassageWords: (input: {
      readonly id: string;
      readonly passage: string;
      readonly words: string;
      readonly text?: string;
      readonly at?: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | GraphError>;
  }
>()("glose/Sources") {}

interface Marked {
  readonly markdown: string;
  readonly passage: string | null;
}

const MARKDOWN = ".md";

const NOT_FOUND: PassageEdit = { _tag: "Refused", reason: "not-found" };

const stillThere = (
  markdown: string,
  passage: string,
  text: string | undefined,
  at: number | undefined,
) =>
  text === undefined ||
  parseArticle(markdown).passages.some(
    (other) => other.id === passage && other.text === text && (at === undefined || other.at === at),
  );

export const ARTICLES_DIR = "Articles";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;

  const writing = yield* Semaphore.make(1);

  const graphFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { graphFolder } }) =>
      graphFolder === null ? Effect.fail(new GraphFolderNotSet()) : Effect.succeed(graphFolder),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}${MARKDOWN}`);
  const articleOf = (folder: string, id: string) =>
    path.join(folder, ARTICLES_DIR, `${id}${MARKDOWN}`);

  const readSource = Effect.fn("Sources.readSource")(function* (folder: string, id: string) {
    const file = fileOf(folder, id);
    const markdown = yield* fs.readFileString(file);
    const info = yield* fs.stat(file);
    const modified = Option.getOrElse(info.mtime, () => new Date(0)).getTime();
    const created = Option.getOrNull(info.birthtime)?.getTime() ?? 0;
    const content = parseSourceFile(markdown);
    const hasText =
      Option.isSome(content) && hasOwnText(content.value.kind)
        ? yield* fs.exists(articleOf(folder, id))
        : false;
    return content.pipe(
      Option.map((found): Source => ({
        id,
        ...found,
        hasText,
        modified,
        added: found.added ?? (created > 0 ? created : modified),
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

  const newId = Effect.fn("Sources.newId")(function* (
    folder: string,
    details: {
      readonly familyName: string;
      readonly firstPublished: number | null;
      readonly title: string;
    },
    part: string | null = null,
  ) {
    const id = toFileName(
      [details.familyName, details.firstPublished, part, details.title]
        .filter((piece) => piece !== null)
        .join(" "),
    );
    const existing = yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError));
    if (id === "" || existing.some((entry) => sameFileName(entry, `${id}${MARKDOWN}`))) {
      return yield* new SourceNameTaken({ fileName: `${id}${MARKDOWN}` });
    }
    return id;
  });

  const articleText = Effect.fn("Sources.articleText")(function* (id: string) {
    const source = yield* get(id);
    const folder = yield* graphFolder;
    if (!source.hasText) return yield* new PassageRefused({ reason: "no-text" });
    return yield* fs.readFileString(articleOf(folder, id)).pipe(Effect.mapError(storageError));
  });

  const editArticle = Effect.fn("Sources.editArticle")(
    function* (id: string, edit: (markdown: string) => PassageEdit) {
      const markdown = yield* articleText(id);
      const folder = yield* graphFolder;
      const result = edit(markdown);
      if (result._tag === "Refused") return yield* new PassageRefused({ reason: result.reason });
      if (result.markdown !== markdown) {
        yield* writeFileAtomic(fs, articleOf(folder, id), result.markdown).pipe(
          Effect.mapError(storageError),
        );
      }
      return { markdown: result.markdown, passage: result.passage };
    },
    (effect) => writing.withPermit(effect),
  );

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
      const id = yield* newId(folder, details);
      return yield* writeSource(folder, id, {
        ...details,
        ...BOOK_TEXT_DETAILS,
        readingPlace: null,
        readingStep: "free-text",
        readingStart: null,
        freeText: "",
        added: yield* Clock.currentTimeMillis,
      }).pipe(Effect.mapError(storageError));
    }),

    saveFreeText: Effect.fn("Sources.saveFreeText")(
      function* ({ id, freeText, finish }) {
        const source = yield* get(id);
        const folder = yield* graphFolder;
        const readingStep =
          finish && source.readingStep === "free-text"
            ? nextReadingStep(source.readingStart, "free-text")
            : source.readingStep;
        return yield* writeSource(folder, id, { ...source, freeText, readingStep }).pipe(
          Effect.mapError(storageError),
        );
      },
      (effect) => writing.withPermit(effect),
    ),

    chooseStart: Effect.fn("Sources.chooseStart")(
      function* ({ id, start }) {
        const source = yield* get(id);
        const folder = yield* graphFolder;
        const readingStep =
          source.readingStep === "read"
            ? nextReadingStep(start, "read", source.kind)
            : start !== "write" && source.readingStep === "free-text"
              ? "probe"
              : source.readingStep;
        return yield* writeSource(folder, id, { ...source, readingStart: start, readingStep }).pipe(
          Effect.mapError(storageError),
        );
      },
      (effect) => writing.withPermit(effect),
    ),

    advance: Effect.fn("Sources.advance")(
      function* ({ id, from }) {
        const source = yield* get(id);
        if (source.readingStep !== from) return source;
        const folder = yield* graphFolder;
        return yield* writeSource(folder, id, {
          ...source,
          readingStep: nextReadingStep(source.readingStart, from, source.kind),
        }).pipe(Effect.mapError(storageError));
      },
      (effect) => writing.withPermit(effect),
    ),

    freeId: Effect.fn("Sources.freeId")(function* (details) {
      const folder = yield* graphFolder;
      return yield* newId(folder, details, details.kind === "lesson" ? details.part : null).pipe(
        Effect.catchTags({ SourceNameTaken: () => Effect.succeed(null) }),
      );
    }),

    importText: Effect.fn("Sources.importText")(function* ({ markdown, ...details }) {
      const folder = yield* graphFolder;
      const id = yield* newId(folder, details, details.kind === "lesson" ? details.part : null);
      const articles = path.join(folder, ARTICLES_DIR);
      if (yield* fs.exists(articleOf(folder, id)).pipe(Effect.mapError(storageError))) {
        return yield* new SourceNameTaken({ fileName: `${ARTICLES_DIR}/${id}${MARKDOWN}` });
      }
      yield* fs.makeDirectory(articles, { recursive: true }).pipe(Effect.mapError(storageError));
      yield* writeFileAtomic(fs, articleOf(folder, id), markdown.replace(/\r\n/g, "\n")).pipe(
        Effect.mapError(storageError),
      );
      return yield* writeSource(folder, id, {
        ...details,
        kind: details.kind === "book" ? "article" : details.kind,
        readingPlace: null,
        readingStep: "read",
        readingStart: null,
        freeText: "",
        added: yield* Clock.currentTimeMillis,
      }).pipe(Effect.mapError(storageError));
    }),

    setPlace: Effect.fn("Sources.setPlace")(
      function* ({ id, place }) {
        const source = yield* get(id);
        if (source.readingPlace === place) return source;
        const folder = yield* graphFolder;
        return yield* writeSource(folder, id, { ...source, readingPlace: place }).pipe(
          Effect.mapError(storageError),
        );
      },
      (effect) => writing.withPermit(effect),
    ),

    articleText,

    markPassage: ({ id, paragraph, start, end }) =>
      editArticle(id, (markdown) => markPassage(markdown, paragraph, start, end)),

    removePassage: ({ id, passage, text, at }) =>
      editArticle(id, (markdown) =>
        stillThere(markdown, passage, text, at) ? removePassage(markdown, passage) : NOT_FOUND,
      ),

    setPassageWords: ({ id, passage, words, text, at }) =>
      editArticle(id, (markdown) =>
        stillThere(markdown, passage, text, at)
          ? setPassageWords(markdown, passage, words)
          : NOT_FOUND,
      ),
  });
});

export const layer = Layer.effect(Sources, make);

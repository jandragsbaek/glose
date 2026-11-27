import {
  type AddVideo,
  BOOK_TEXT_DETAILS,
  VaultFolderNotSet,
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
  type SetLessonVideo,
  type SourceDetails,
  NotALesson,
  SourceNameTaken,
  SourceNotFound,
  StorageError,
  fileNameKey,
  isFileName,
  toFileName,
  videoAddress,
  VideoNotFound,
  youtubeId,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import type { NotAVideoFile } from "./courseVideoFiles.ts";
import { writeKeepingFields } from "./frontmatter.ts";
import { lessonVideos } from "./lessonVideos.ts";
import { sourceEnds } from "./sourceEnds.ts";
import {
  parseSourceFile,
  renderSourceFile,
  SOURCE_FIELDS,
  type SourceFileContent,
} from "./sourceFile.ts";

type VaultError = VaultFolderNotSet | StorageError;

export class Sources extends Context.Service<
  Sources,
  {
    readonly list: Effect.Effect<ReadonlyArray<Source>, VaultError>;
    readonly get: (id: string) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly create: (
      details: SourceDetails,
    ) => Effect.Effect<Source, SourceNameTaken | VaultError>;
    readonly saveFreeText: (input: {
      readonly id: string;
      readonly freeText: string;
      readonly finish: boolean;
    }) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly chooseStart: (input: {
      readonly id: string;
      readonly start: ReadingStart;
    }) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly startOver: (input: {
      readonly id: string;
      readonly start: ReadingStart | null;
    }) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly remove: (id: string) => Effect.Effect<void, SourceNotFound | VaultError>;
    readonly advance: (input: {
      readonly id: string;
      readonly from: ReadingStep;
    }) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly importText: (input: ImportText) => Effect.Effect<Source, SourceNameTaken | VaultError>;
    readonly addVideo: (
      input: AddVideo,
    ) => Effect.Effect<Source, SourceNameTaken | VideoNotFound | VaultError>;
    readonly setLessonVideo: (
      input: SetLessonVideo,
    ) => Effect.Effect<Source, SourceNotFound | NotALesson | VaultError>;
    readonly saveLessonVideoFile: (input: {
      readonly id: string;
      readonly name: string;
      readonly body: Stream.Stream<Uint8Array, unknown>;
    }) => Effect.Effect<Source, SourceNotFound | NotALesson | NotAVideoFile | VaultError>;
    readonly lessonVideoFile: (id: string) => Effect.Effect<string, SourceNotFound | VaultError>;
    readonly freeId: (
      details: Pick<ImportText, "familyName" | "firstPublished" | "title" | "kind" | "part">,
    ) => Effect.Effect<string | null, VaultError>;
    readonly setPlace: (input: {
      readonly id: string;
      readonly place: number;
    }) => Effect.Effect<Source, SourceNotFound | VaultError>;
    readonly articleText: (
      id: string,
    ) => Effect.Effect<string, SourceNotFound | PassageRefused | VaultError>;
    readonly markPassage: (input: {
      readonly id: string;
      readonly paragraph: number;
      readonly start: number;
      readonly end: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | VaultError>;
    readonly removePassage: (input: {
      readonly id: string;
      readonly passage: string;
      readonly text?: string;
      readonly at?: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | VaultError>;
    readonly setPassageWords: (input: {
      readonly id: string;
      readonly passage: string;
      readonly words: string;
      readonly text?: string;
      readonly at?: number;
    }) => Effect.Effect<Marked, SourceNotFound | PassageRefused | VaultError>;
  }
>()("glose/Sources") {}

interface Marked {
  readonly markdown: string;
  readonly passage: string | null;
}

const MARKDOWN = ".md";

const MAYBE_SOURCE = /glose["']?\s*:\s*["']?source/;

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

  const vaultFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { vaultFolder } }) =>
      vaultFolder === null ? Effect.fail(new VaultFolderNotSet()) : Effect.succeed(vaultFolder),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}${MARKDOWN}`);
  const articleOf = (folder: string, id: string) =>
    path.join(folder, ARTICLES_DIR, `${id}${MARKDOWN}`);

  const readSource = Effect.fn("Sources.readSource")(function* (folder: string, id: string) {
    const file = fileOf(folder, id);
    const markdown = yield* fs.readFileString(file);
    if (!MAYBE_SOURCE.test(markdown)) return Option.none<Source>();
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

  const isFile = (file: string) =>
    fs.stat(file).pipe(
      Effect.map((info) => info.type === "File"),
      Effect.orElseSucceed(() => false),
    );

  const listedSource = (folder: string, id: string) =>
    readSource(folder, id).pipe(
      Effect.catch((error) =>
        isFile(fileOf(folder, id)).pipe(
          Effect.flatMap((file) => (file ? Effect.fail(error) : Effect.succeed(Option.none()))),
        ),
      ),
    );

  const writeSource = Effect.fn("Sources.writeSource")(function* (
    folder: string,
    id: string,
    content: SourceFileContent,
  ) {
    yield* writeKeepingFields(
      fs,
      fileOf(folder, id),
      renderSourceFile(content),
      SOURCE_FIELDS,
      false,
    );
    const written = yield* readSource(folder, id);
    if (Option.isNone(written)) return yield* Effect.die(`Source ${id} did not read back.`);
    return written.value;
  });

  const get = Effect.fn("Sources.get")(function* (id: string) {
    const folder = yield* vaultFolder;
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
    const wanted = fileNameKey(`${id}${MARKDOWN}`);
    if (id === "" || existing.some((entry) => fileNameKey(entry) === wanted)) {
      return yield* new SourceNameTaken({ fileName: `${id}${MARKDOWN}` });
    }
    return id;
  });

  const articleText = Effect.fn("Sources.articleText")(function* (id: string) {
    const source = yield* get(id);
    const folder = yield* vaultFolder;
    if (!source.hasText) return yield* new PassageRefused({ reason: "no-text" });
    return yield* fs.readFileString(articleOf(folder, id)).pipe(Effect.mapError(storageError));
  });

  const editArticle = Effect.fn("Sources.editArticle")(
    function* (id: string, edit: (markdown: string) => PassageEdit) {
      const markdown = yield* articleText(id);
      const folder = yield* vaultFolder;
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
      const folder = yield* vaultFolder;
      const names = (yield* fs.readDirectory(folder).pipe(Effect.mapError(storageError)))
        .filter((entry) => entry.endsWith(MARKDOWN))
        .map((entry) => entry.slice(0, -MARKDOWN.length));
      const sources = yield* Effect.forEach(names, (name) => listedSource(folder, name), {
        concurrency: 16,
      }).pipe(Effect.mapError(storageError));
      return sources
        .flatMap((source) => Option.toArray(source))
        .sort((a, b) => b.modified - a.modified);
    }),

    get,

    create: Effect.fn("Sources.create")(function* (details) {
      const folder = yield* vaultFolder;
      const id = yield* newId(folder, details);
      return yield* writeSource(folder, id, {
        ...details,
        ...BOOK_TEXT_DETAILS,
        videoLink: null,
        videoFile: null,
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
        const folder = yield* vaultFolder;
        const readingStep =
          finish && source.readingStep === "free-text"
            ? nextReadingStep(source.readingStart, "free-text", source.kind)
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
        const folder = yield* vaultFolder;
        const readingStep =
          source.readingStep === "read"
            ? nextReadingStep(start, "read", source.kind)
            : start !== "write" && source.readingStep === "free-text"
              ? nextReadingStep(start, "free-text")
              : source.readingStep;
        return yield* writeSource(folder, id, { ...source, readingStart: start, readingStep }).pipe(
          Effect.mapError(storageError),
        );
      },
      (effect) => writing.withPermit(effect),
    ),

    ...sourceEnds({ fs, path, vaultFolder, get, writeSource, fileOf, articleOf, writing }),

    advance: Effect.fn("Sources.advance")(
      function* ({ id, from }) {
        const source = yield* get(id);
        if (source.readingStep !== from) return source;
        const folder = yield* vaultFolder;
        return yield* writeSource(folder, id, {
          ...source,
          readingStep: nextReadingStep(source.readingStart, from, source.kind),
        }).pipe(Effect.mapError(storageError));
      },
      (effect) => writing.withPermit(effect),
    ),

    freeId: Effect.fn("Sources.freeId")(function* (details) {
      const folder = yield* vaultFolder;
      const id = yield* newId(
        folder,
        details,
        details.kind === "lesson" ? details.part : null,
      ).pipe(Effect.catchTags({ SourceNameTaken: () => Effect.succeed(null) }));
      if (id === null) return null;
      const article = yield* fs.exists(articleOf(folder, id)).pipe(Effect.mapError(storageError));
      return article ? null : id;
    }),

    importText: Effect.fn("Sources.importText")(function* ({ markdown, videoLink, ...details }) {
      const folder = yield* vaultFolder;
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
        kind: hasOwnText(details.kind) ? details.kind : "article",
        videoLink: details.kind === "lesson" ? (videoLink ?? null) : null,
        videoFile: null,
        readingPlace: null,
        readingStep: "read",
        readingStart: null,
        freeText: "",
        added: yield* Clock.currentTimeMillis,
      }).pipe(Effect.mapError(storageError));
    }),

    addVideo: Effect.fn("Sources.addVideo")(function* ({ url, container, ...details }) {
      const video = youtubeId(url);
      if (video === null) return yield* new VideoNotFound({ reason: "not-youtube" });
      const folder = yield* vaultFolder;
      const id = yield* newId(folder, details);
      return yield* writeSource(folder, id, {
        ...BOOK_TEXT_DETAILS,
        edition: null,
        editionYear: null,
        publisher: null,
        translator: null,
        ...details,
        kind: "video",
        container,
        url: videoAddress(video),
        videoLink: null,
        videoFile: null,
        readingPlace: null,
        readingStep: "free-text",
        readingStart: null,
        freeText: "",
        added: yield* Clock.currentTimeMillis,
      }).pipe(Effect.mapError(storageError));
    }),

    setPlace: Effect.fn("Sources.setPlace")(
      function* ({ id, place }) {
        const source = yield* get(id);
        if (source.readingPlace === place) return source;
        const folder = yield* vaultFolder;
        return yield* writeSource(folder, id, { ...source, readingPlace: place }).pipe(
          Effect.mapError(storageError),
        );
      },
      (effect) => writing.withPermit(effect),
    ),

    ...lessonVideos({ fs, path, vaultFolder, get, writeSource, writing }),

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

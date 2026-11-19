import {
  AI_TRY_WORDS,
  type AskTryWords,
  VaultFolderNotSet,
  keepTryWords,
  MAX_SUGGESTED_WORDS,
  linkKey,
  POSTS_FOLDER,
  PublicationExists,
  PublicationNotReady,
  type PublicationRecord,
  postFileName,
  renderBlogPost,
  resolveReferences,
  type SaveWritingProject,
  SiteFolderNotSet,
  SiteFolderUnavailable,
  StorageError,
  WRITING_FOLDER,
  type WritingProject,
  type WritingProjectFields,
  WritingProjectNameTaken,
  WritingProjectNotFound,
  WritingReview,
  WritingReviewUnavailable,
  isFileName,
  sameFileName,
  toFileName,
  TryWords,
  TryWordsUnavailable,
  tryWordCount,
  localDay,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as ChatGpt from "../chatgpt/ChatGpt.ts";
import { Responses } from "../chatgpt/Responses.ts";
import { askStructured, strictObject } from "../chatgpt/structured.ts";
import * as Graph from "../vault/Graph.ts";
import * as Sources from "../vault/Sources.ts";
import * as Settings from "../settings/Settings.ts";
import { writeFileAtomic } from "../storage.ts";
import { writeKeepingFields } from "../vault/frontmatter.ts";
import {
  parseWritingFile,
  renderWritingFile,
  WRITING_FIELDS,
  type WritingFileContent,
} from "./writingFile.ts";

type VaultError = VaultFolderNotSet | StorageError;

export class Writing extends Context.Service<
  Writing,
  {
    readonly list: Effect.Effect<ReadonlyArray<WritingProject>, VaultError>;
    readonly get: (
      id: string,
    ) => Effect.Effect<WritingProject, WritingProjectNotFound | VaultError>;
    readonly create: (
      fields: WritingProjectFields,
    ) => Effect.Effect<WritingProject, WritingProjectNameTaken | VaultError>;
    readonly save: (
      input: SaveWritingProject,
    ) => Effect.Effect<
      WritingProject,
      WritingProjectNotFound | WritingProjectNameTaken | VaultError
    >;
    readonly publish: (input: {
      readonly id: string;
      readonly replace: boolean;
    }) => Effect.Effect<
      PublicationRecord,
      | WritingProjectNotFound
      | SiteFolderNotSet
      | SiteFolderUnavailable
      | PublicationExists
      | PublicationNotReady
      | VaultError
    >;
    readonly review: (
      id: string,
    ) => Effect.Effect<
      WritingReview,
      WritingProjectNotFound | WritingReviewUnavailable | VaultError
    >;
    readonly tryWords: (input: AskTryWords) => Effect.Effect<TryWords, TryWordsUnavailable>;
  }
>()("glose/Writing") {}

const MARKDOWN = ".md";

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

const NOTE_CHARS = 600;
const MAX_NOTES = 250;

export const REVIEW_INSTRUCTIONS = `You help a person who writes a blog post in their own words, using the Notes in their Graph (a personal knowledge base of Notes made from books they read). Every Note has a Source.

You never write, rewrite, shorten or continue their prose. You give no example sentences and no new wording. You only point at their text, at their Notes, and ask questions.

Read the post. A Reference in it looks like [[Note title]] or [[Note title]]{p. 64}; it cites that Note.

Return three lists:
- claims: sentences that state a fact, number or idea from a Source (research, a statistic, a book's thesis) but have no Reference. Do not flag the writer's own opinions or experiences. At most 6.
- suggestions: Notes from the list that support, extend or argue against a passage that does not cite them yet. Use the exact Note title from the list as noteId. At most 6, the most useful first.
- questions: questions about the argument that the writer should answer before publishing: a gap, an unclear claim, a missing counter-argument, an ending that does not land. At most 4.

For each item, excerpt is a short phrase copied exactly, character for character, from the post (at most 12 words), so the app can find it. For a question about the whole post, excerpt is null.
Each reason and question is one short sentence, at most 25 words, in the language of the post.`;

const REVIEW_SCHEMA = strictObject({
  claims: {
    type: "array",
    items: strictObject({ excerpt: { type: "string" }, reason: { type: "string" } }),
  },
  suggestions: {
    type: "array",
    items: strictObject({
      excerpt: { type: "string" },
      noteId: { type: "string" },
      reason: { type: "string" },
    }),
  },
  questions: {
    type: "array",
    items: strictObject({
      excerpt: { type: ["string", "null"] },
      question: { type: "string" },
    }),
  },
});

const decodeReview = Schema.decodeUnknownEffect(Schema.fromJsonString(WritingReview));

export const TRY_WORDS_INSTRUCTIONS = `You help a person who writes in their own words. They chose a word, or a few words, in one of their sentences and want other ways to say just that part.

You never write, rewrite or continue their sentence. You suggest only what could stand in place of the chosen words.

Suggest up to ${MAX_SUGGESTED_WORDS} replacements. Each one:
- replaces only the chosen words, so the sentence still reads correctly with it in their place (grammar, tense, number, article);
- keeps the tone of the sentence, and keeps its meaning or offers a nearby shade of it;
- is at most ${AI_TRY_WORDS} words, with no quotes and none of the words around it;
- is not one of the tries the writer already has;
- is in the language of the sentence.

The most useful replacement comes first.`;

const TRY_WORDS_SCHEMA = strictObject({
  words: { type: "array", items: { type: "string" } },
});

const decodeTryWords = Schema.decodeUnknownEffect(Schema.fromJsonString(TryWords));

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const settings = yield* Settings.Settings;
  const graph = yield* Graph.Graph;
  const sources = yield* Sources.Sources;
  const chatGpt = yield* ChatGpt.ChatGpt;
  const responses = yield* Responses;

  const writingFolder = settings.get.pipe(
    Effect.flatMap(({ settings: { vaultFolder } }) =>
      vaultFolder === null
        ? Effect.fail(new VaultFolderNotSet())
        : Effect.succeed(path.join(vaultFolder, WRITING_FOLDER)),
    ),
  );

  const fileOf = (folder: string, id: string) => path.join(folder, `${id}${MARKDOWN}`);

  const read = Effect.fn("Writing.read")(function* (folder: string, id: string) {
    const file = fileOf(folder, id);
    const markdown = yield* fs.readFileString(file);
    const info = yield* fs.stat(file);
    const modified = Option.getOrElse(info.mtime, () => new Date(0)).getTime();
    return parseWritingFile(markdown).pipe(
      Option.map((content): WritingProject => ({ id, ...content, modified })),
    );
  });

  const names = Effect.fn("Writing.names")(function* (folder: string) {
    if (!(yield* fs.exists(folder))) return [];
    const entries = yield* fs.readDirectory(folder);
    return entries.filter((entry) => entry.endsWith(MARKDOWN) && !entry.startsWith("."));
  });

  const write = Effect.fn("Writing.write")(function* (
    folder: string,
    id: string,
    content: WritingFileContent,
    from: string = id,
  ) {
    yield* fs.makeDirectory(folder, { recursive: true });
    yield* writeKeepingFields(
      fs,
      fileOf(folder, id),
      renderWritingFile(content),
      WRITING_FIELDS,
      true,
      fileOf(folder, from),
    );
    const written = yield* read(folder, id);
    if (Option.isNone(written))
      return yield* Effect.die(`Writing project ${id} did not read back.`);
    return written.value;
  });

  const get = Effect.fn("Writing.get")(function* (id: string) {
    const folder = yield* writingFolder;
    const notFound = new WritingProjectNotFound({ id });
    if (!isFileName(id)) return yield* notFound;
    if (!(yield* fs.exists(fileOf(folder, id)).pipe(Effect.mapError(storageError)))) {
      return yield* notFound;
    }
    const project = yield* read(folder, id).pipe(Effect.mapError(storageError));
    return yield* Option.match(project, {
      onNone: () => Effect.fail(notFound),
      onSome: Effect.succeed,
    });
  });

  const freeName = Effect.fn("Writing.freeName")(function* (
    folder: string,
    title: string,
    current: string | null,
  ) {
    const id = toFileName(title);
    const existing = yield* names(folder).pipe(Effect.mapError(storageError));
    const taken = existing.some(
      (entry) =>
        sameFileName(entry, `${id}${MARKDOWN}`) &&
        (current === null || !sameFileName(entry, `${current}${MARKDOWN}`)),
    );
    if (id === "" || taken)
      return yield* new WritingProjectNameTaken({ fileName: `${id}${MARKDOWN}` });
    return id;
  });

  const aiAccess = chatGpt.accessToken.pipe(
    Effect.mapError((error): "failed" | "off" =>
      error.reason === "unavailable" ? "failed" : "off",
    ),
    Effect.flatMap((token) =>
      responses.models(token).pipe(
        Effect.mapError(() => "failed" as const),
        Effect.flatMap((models) => {
          const model = models[0]?.slug;
          return model === undefined
            ? Effect.fail("failed" as const)
            : Effect.succeed({ token, model });
        }),
      ),
    ),
  );

  const resolve = Effect.fn("Writing.resolve")(function* (body: string) {
    const view = yield* graph.read;
    const all = yield* sources.list;
    return resolveReferences(body, view.nodes, all);
  });

  return Writing.of({
    list: Effect.gen(function* () {
      const folder = yield* writingFolder;
      const entries = yield* names(folder).pipe(Effect.mapError(storageError));
      const projects = yield* Effect.forEach(
        entries,
        (entry) => read(folder, entry.slice(0, -MARKDOWN.length)),
        { concurrency: 8 },
      ).pipe(Effect.mapError(storageError));
      return projects
        .flatMap((project) => Option.toArray(project))
        .sort((a, b) => b.modified - a.modified);
    }),

    get,

    create: Effect.fn("Writing.create")(function* (fields) {
      const folder = yield* writingFolder;
      const id = yield* freeName(folder, fields.title, null);
      return yield* write(folder, id, { ...fields, published: null }).pipe(
        Effect.mapError(storageError),
      );
    }),

    save: Effect.fn("Writing.save")(function* ({ id, ...fields }) {
      const project = yield* get(id);
      const folder = yield* writingFolder;
      const wanted = toFileName(fields.title);
      const next =
        wanted === "" || sameFileName(wanted, id) ? id : yield* freeName(folder, fields.title, id);
      const saved = yield* write(
        folder,
        next,
        { ...fields, published: project.published },
        id,
      ).pipe(Effect.mapError(storageError));
      if (next !== id) yield* fs.remove(fileOf(folder, id)).pipe(Effect.mapError(storageError));
      return saved;
    }),

    publish: Effect.fn("Writing.publish")(function* ({ id, replace }) {
      const project = yield* get(id);
      if (project.type !== "blog-post") {
        return yield* new PublicationNotReady({ type: project.type });
      }
      const { siteFolder } = (yield* settings.get).settings;
      if (siteFolder === undefined || siteFolder === null) return yield* new SiteFolderNotSet();
      const source = path.join(siteFolder, POSTS_FOLDER[0]);
      const isFolder = yield* fs.stat(source).pipe(
        Effect.map((info) => info.type === "Directory"),
        Effect.orElseSucceed(() => false),
      );
      if (!isFolder) {
        const found = yield* fs.exists(siteFolder).pipe(Effect.orElseSucceed(() => false));
        return yield* new SiteFolderUnavailable({
          path: siteFolder,
          reason: found ? "not-bridgetown" : "not-found",
        });
      }
      const date = project.published?.date ?? localDay(yield* Clock.currentTimeMillis);
      const posts = path.join(siteFolder, ...POSTS_FOLDER);
      const file = path.join(posts, postFileName(date, project.title));
      if (!replace && (yield* fs.exists(file).pipe(Effect.mapError(storageError)))) {
        return yield* new PublicationExists({ file });
      }
      const references = yield* resolve(project.body);
      const record: PublicationRecord = { date, file };
      yield* Effect.gen(function* () {
        yield* fs.makeDirectory(posts, { recursive: true });
        yield* writeFileAtomic(fs, file, renderBlogPost(project, references, date));
      }).pipe(
        Effect.mapError(
          () => new SiteFolderUnavailable({ path: siteFolder, reason: "not-writable" }),
        ),
      );
      const folder = yield* writingFolder;
      yield* write(folder, project.id, { ...project, published: record }).pipe(
        Effect.mapError(storageError),
      );
      return record;
    }),

    review: Effect.fn("Writing.review")(function* (id) {
      const project = yield* get(id);
      const view = yield* graph.read;
      const references = resolveReferences(project.body, view.nodes, yield* sources.list);
      const cited = new Set(
        references.flatMap((reference) =>
          reference.noteId === null ? [] : [linkKey(reference.noteId)],
        ),
      );
      const citedSources = new Set(
        references.flatMap((reference) =>
          reference.source === null ? [] : [linkKey(reference.source.id)],
        ),
      );
      const notes = view.nodes
        .filter((node) => node.kind === "note")
        .sort(
          (a, b) =>
            Number(citedSources.has(linkKey(b.sourceId ?? ""))) -
            Number(citedSources.has(linkKey(a.sourceId ?? ""))),
        )
        .slice(0, MAX_NOTES);

      const { token, model } = yield* aiAccess.pipe(
        Effect.mapError((reason) => new WritingReviewUnavailable({ reason })),
      );
      const failed = () => new WritingReviewUnavailable({ reason: "failed" });

      const input = [
        `=== The post: ${project.title} (language: ${project.language}) ===`,
        project.body,
        "",
        "=== Notes in the Graph ===",
        ...notes.map(
          (node) =>
            `--- ${node.id} ---\n${
              node.body.length > NOTE_CHARS ? `${node.body.slice(0, NOTE_CHARS)} […]` : node.body
            }`,
        ),
      ].join("\n");
      const answer = yield* askStructured(responses, {
        token,
        model,
        instructions: REVIEW_INSTRUCTIONS,
        input,
        name: "writing_review",
        schema: REVIEW_SCHEMA,
        decode: decodeReview,
      }).pipe(
        Effect.tapError((error) => Effect.logWarning("Writing review failed", error)),
        Effect.mapError(failed),
      );

      const noteIds = new Map(notes.map((node) => [linkKey(node.id), node.id]));
      const found = (excerpt: string) => excerpt.trim() !== "" && project.body.includes(excerpt);
      return {
        claims: answer.claims.filter((claim) => found(claim.excerpt)),
        suggestions: answer.suggestions.flatMap((suggestion) => {
          const noteId = noteIds.get(linkKey(suggestion.noteId));
          return noteId === undefined || cited.has(linkKey(noteId)) || !found(suggestion.excerpt)
            ? []
            : [{ ...suggestion, noteId }];
        }),
        questions: answer.questions.map((question) => ({
          ...question,
          excerpt: question.excerpt !== null && found(question.excerpt) ? question.excerpt : null,
        })),
      };
    }),

    tryWords: Effect.fn("Writing.tryWords")(function* (input) {
      if (tryWordCount(input.text) > AI_TRY_WORDS) {
        return yield* new TryWordsUnavailable({ reason: "too-long" });
      }
      const { token, model } = yield* aiAccess.pipe(
        Effect.mapError((reason) => new TryWordsUnavailable({ reason })),
      );
      const answer = yield* askStructured(responses, {
        token,
        model,
        instructions: TRY_WORDS_INSTRUCTIONS,
        input: [
          `=== The sentence (language: ${input.language}) ===`,
          input.sentence,
          "",
          "=== The chosen words ===",
          input.text,
          "",
          "=== The tries the writer already has ===",
          ...input.tries,
        ].join("\n"),
        name: "try_words",
        schema: TRY_WORDS_SCHEMA,
        decode: decodeTryWords,
      }).pipe(
        Effect.tapError((error) => Effect.logWarning("Try words failed", error)),
        Effect.mapError(() => new TryWordsUnavailable({ reason: "failed" })),
      );
      return { words: keepTryWords(answer.words, input.text, input.tries) };
    }),
  });
});

export const layer = Layer.effect(Writing, make);

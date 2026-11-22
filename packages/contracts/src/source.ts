import * as Schema from "effect/Schema";

export const ReadingStep = Schema.Literals([
  "free-text",
  "read",
  "passages",
  "extraction",
  "probe",
  "done",
]);
export type ReadingStep = typeof ReadingStep.Type;

export const ReadingStart = Schema.Literals(["reading", "write", "probe", "catch-up"]);
export type ReadingStart = typeof ReadingStart.Type;

export type WorkStep = Exclude<ReadingStep, "done">;

export const SourceKind = Schema.Literals(["book", "article", "lesson", "video"]);
export type SourceKind = typeof SourceKind.Type;

export const ArticleType = Schema.Literals(["paper", "web", "press"]);
export type ArticleType = typeof ArticleType.Type;

export const hasOwnText = (kind: SourceKind): boolean => kind === "article" || kind === "lesson";

export const citedByContainer = (kind: SourceKind): boolean => kind !== "book";

export const readingStepsOf = (
  start: ReadingStart | null,
  kind: SourceKind = "book",
): ReadonlyArray<WorkStep> =>
  kind === "video"
    ? ["free-text", "extraction", "probe"]
    : hasOwnText(kind)
      ? start === "probe" || start === "catch-up"
        ? ["read", "probe", "extraction"]
        : ["read", "extraction", "probe"]
      : start === "probe" || start === "catch-up"
        ? ["probe", "extraction"]
        : start === "reading"
          ? ["passages", "extraction", "probe"]
          : ["free-text", "extraction", "probe"];

export const firstReadingStep = (start: ReadingStart | null, kind: SourceKind): WorkStep =>
  readingStepsOf(start, kind)[0] ?? "free-text";

export const nextReadingStep = (
  start: ReadingStart | null,
  step: ReadingStep,
  kind: SourceKind = "book",
): ReadingStep => {
  const steps = readingStepsOf(start, kind);
  if (step === "done") return "done";
  const index = steps.indexOf(step);
  return index === -1 ? (steps[0] ?? "done") : (steps[index + 1] ?? "done");
};

const Text = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));
const OptionalText = Schema.NullOr(Text);
const Year = Schema.NullOr(
  Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: -3000, maximum: 9999 }))),
);

export const SourceDetails = Schema.Struct({
  familyName: Text,
  givenName: OptionalText,
  title: Text,
  firstPublished: Year,
  edition: OptionalText,
  editionYear: Year,
  publisher: OptionalText,
  translator: OptionalText,
});
export type SourceDetails = typeof SourceDetails.Type;

export const TextDetails = Schema.Struct({
  kind: SourceKind,
  articleType: Schema.NullOr(ArticleType),
  otherAuthors: Schema.Array(Text),
  container: OptionalText,
  published: OptionalText,
  volume: OptionalText,
  issue: OptionalText,
  pages: OptionalText,
  url: OptionalText,
  doi: OptionalText,
  accessed: OptionalText,
  part: OptionalText,
});
export type TextDetails = typeof TextDetails.Type;

export const BOOK_TEXT_DETAILS: TextDetails = {
  kind: "book",
  articleType: null,
  otherAuthors: [],
  container: null,
  published: null,
  volume: null,
  issue: null,
  pages: null,
  url: null,
  doi: null,
  accessed: null,
  part: null,
};

export const Source = Schema.Struct({
  id: Schema.String,
  ...SourceDetails.fields,
  ...TextDetails.fields,
  hasText: Schema.Boolean,
  videoLink: Schema.NullOr(Schema.String),
  videoFile: Schema.NullOr(Schema.String),
  readingPlace: Schema.NullOr(Schema.Int),
  readingStep: ReadingStep,
  readingStart: Schema.NullOr(ReadingStart),
  freeText: Schema.String,
  modified: Schema.Number,
  added: Schema.Number,
});
export type Source = typeof Source.Type;

export const SourceRef = Schema.Struct({ id: Schema.String });

export const SaveFreeText = Schema.Struct({
  id: Schema.String,
  freeText: Schema.String,
  finish: Schema.Boolean,
});

export const ChooseReadingStart = Schema.Struct({
  id: Schema.String,
  start: ReadingStart,
});

export const AdvanceReading = Schema.Struct({ id: Schema.String, from: ReadingStep });

export const StartSourceOver = Schema.Struct({
  id: Schema.String,
  start: Schema.NullOr(ReadingStart),
});
export type StartSourceOver = typeof StartSourceOver.Type;

export const SourceFootprint = Schema.Struct({
  notes: Schema.Array(Schema.String),
  writing: Schema.Array(Schema.String),
  linkedFrom: Schema.Array(Schema.String),
  passages: Schema.Int,
  probeQuestions: Schema.NullOr(Schema.Int),
  extraction: Schema.Boolean,
  setAside: Schema.Int,
});
export type SourceFootprint = typeof SourceFootprint.Type;

export const SetReadingPlace = Schema.Struct({ id: Schema.String, place: Schema.Int });

export const WebLink = Schema.Trim.pipe(
  Schema.check(Schema.isPattern(/^https?:\/\/[^\s/$.?#][^\s]*$/i)),
);

export const ImportText = Schema.Struct({
  ...SourceDetails.fields,
  ...TextDetails.fields,
  markdown: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  videoLink: Schema.optionalKey(Schema.NullOr(WebLink)),
});
export type ImportText = typeof ImportText.Type;

export const AddVideo = Schema.Struct({
  familyName: Text,
  givenName: OptionalText,
  title: Text,
  firstPublished: Year,
  container: OptionalText,
  url: Text,
});
export type AddVideo = typeof AddVideo.Type;

export const SetLessonVideo = Schema.Struct({
  id: Schema.String,
  link: Schema.NullOr(WebLink),
  removeFile: Schema.Boolean,
});
export type SetLessonVideo = typeof SetLessonVideo.Type;

export const COURSE_VIDEO_PATH = "/course-video";
export const COURSE_VIDEOS_DIR = "Course videos";
export const COURSE_VIDEO_TYPES = ["mp4", "m4v", "webm", "mov", "ogv"] as const;

export const courseVideoExtension = (name: string): string | null => {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? null;
  return extension !== null && (COURSE_VIDEO_TYPES as ReadonlyArray<string>).includes(extension)
    ? extension
    : null;
};

export class NotALesson extends Schema.TaggedError<NotALesson>()("NotALesson", {
  id: Schema.String,
}) {}

export const ArticleText = Schema.Struct({ markdown: Schema.String });
export type ArticleText = typeof ArticleText.Type;

export const MarkPassage = Schema.Struct({
  id: Schema.String,
  paragraph: Schema.Int,
  start: Schema.Int,
  end: Schema.Int,
});

export const PassageRef = Schema.Struct({
  id: Schema.String,
  passage: Schema.String,
  text: Schema.optionalKey(Schema.String),
  at: Schema.optionalKey(Schema.Int),
});

export const SetPassageWords = Schema.Struct({
  ...PassageRef.fields,
  words: Schema.String,
});

export const MarkedPassage = Schema.Struct({
  markdown: Schema.String,
  passage: Schema.NullOr(Schema.String),
});

export class PassageRefused extends Schema.TaggedError<PassageRefused>()("PassageRefused", {
  reason: Schema.Literals(["not-found", "empty", "overlap", "no-text"]),
}) {}

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", {
  id: Schema.String,
}) {}

export class SourceInUse extends Schema.TaggedError<SourceInUse>()("SourceInUse", {
  id: Schema.String,
  notes: Schema.Array(Schema.String),
  writing: Schema.Array(Schema.String),
}) {}

export class SourceNameTaken extends Schema.TaggedError<SourceNameTaken>()("SourceNameTaken", {
  fileName: Schema.String,
}) {}

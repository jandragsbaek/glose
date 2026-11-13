import * as Schema from "effect/Schema";

/** Steps of the Reading Stage for one Source, in order. */
export const ReadingStep = Schema.Literals(["free-text", "extraction", "probe", "done"]);
export type ReadingStep = typeof ReadingStep.Type;

/**
 * How the user starts the Reading Stage, from their answer to "Where are you with this book?":
 * `write` starts with the Free text; `probe` and `catch-up` start with the Probe, `catch-up`
 * for a book read long ago or only in part, so the Probe explains more.
 */
export const ReadingStart = Schema.Literals(["write", "probe", "catch-up"]);
export type ReadingStart = typeof ReadingStart.Type;

/** A step of the Reading Stage that has a page of its own. */
export type WorkStep = Exclude<ReadingStep, "done">;

/**
 * The steps of a Source in the order its start gives them. A Source with no start (the user has
 * not answered, or it is from before the question) follows `write`.
 */
export const readingStepsOf = (start: ReadingStart | null): ReadonlyArray<WorkStep> =>
  start === "probe" || start === "catch-up"
    ? ["probe", "extraction"]
    : ["free-text", "extraction", "probe"];

/** The step after this one for a Source with this start; `done` after the last. */
export const nextReadingStep = (start: ReadingStart | null, step: ReadingStep): ReadingStep => {
  const steps = readingStepsOf(start);
  if (step === "done") return "done";
  const index = steps.indexOf(step);
  return index === -1 ? (steps[0] ?? "done") : (steps[index + 1] ?? "done");
};

const Text = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));
const OptionalText = Schema.NullOr(Text);
const Year = Schema.NullOr(
  Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: -3000, maximum: 9999 }))),
);

/** Bibliographic data of a book Source. A Citation needs all of it; missing fields are warned about. */
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

export const Source = Schema.Struct({
  /** The Markdown file's name without `.md`; unique in the Graph folder. */
  id: Schema.String,
  ...SourceDetails.fields,
  readingStep: ReadingStep,
  /** Null until the user answers; Sources from before the question have none. */
  readingStart: Schema.NullOr(ReadingStart),
  freeText: Schema.String,
  /** Last change of the file, in epoch milliseconds. */
  modified: Schema.Number,
  /**
   * When the Source was added, in epoch milliseconds: the `added` date in its frontmatter, else
   * the file's creation time, else its last change.
   */
  added: Schema.Number,
});
export type Source = typeof Source.Type;

export const SourceRef = Schema.Struct({ id: Schema.String });

export const SaveFreeText = Schema.Struct({
  id: Schema.String,
  freeText: Schema.String,
  /** Ends the Free text step and moves the Source to Extraction. */
  finish: Schema.Boolean,
});

export const ChooseReadingStart = Schema.Struct({
  id: Schema.String,
  start: ReadingStart,
});

/** Moves a Source on from this step; nothing happens when it is at another step already. */
export const AdvanceReading = Schema.Struct({ id: Schema.String, from: ReadingStep });

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", {
  id: Schema.String,
}) {}

/** Another file already has this name, compared without regard to case. */
export class SourceNameTaken extends Schema.TaggedError<SourceNameTaken>()("SourceNameTaken", {
  fileName: Schema.String,
}) {}

import * as Schema from "effect/Schema";

/** Steps of the Reading Stage for one Source, in order. */
export const ReadingStep = Schema.Literals(["free-text", "extraction", "probe", "done"]);
export type ReadingStep = typeof ReadingStep.Type;

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
  freeText: Schema.String,
  /** Last change of the file, in epoch milliseconds. */
  modified: Schema.Number,
});
export type Source = typeof Source.Type;

export const SourceRef = Schema.Struct({ id: Schema.String });

export const SaveFreeText = Schema.Struct({
  id: Schema.String,
  freeText: Schema.String,
  /** Ends the Free text step and moves the Source to Extraction. */
  finish: Schema.Boolean,
});

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", {
  id: Schema.String,
}) {}

/** Another file already has this name, compared without regard to case. */
export class SourceNameTaken extends Schema.TaggedError<SourceNameTaken>()("SourceNameTaken", {
  fileName: Schema.String,
}) {}

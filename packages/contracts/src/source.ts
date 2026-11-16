import * as Schema from "effect/Schema";

export const ReadingStep = Schema.Literals(["free-text", "extraction", "probe", "done"]);
export type ReadingStep = typeof ReadingStep.Type;

export const ReadingStart = Schema.Literals(["write", "probe", "catch-up"]);
export type ReadingStart = typeof ReadingStart.Type;

export type WorkStep = Exclude<ReadingStep, "done">;

export const readingStepsOf = (start: ReadingStart | null): ReadonlyArray<WorkStep> =>
  start === "probe" || start === "catch-up"
    ? ["probe", "extraction"]
    : ["free-text", "extraction", "probe"];

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
  id: Schema.String,
  ...SourceDetails.fields,
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

export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", {
  id: Schema.String,
}) {}

export class SourceNameTaken extends Schema.TaggedError<SourceNameTaken>()("SourceNameTaken", {
  fileName: Schema.String,
}) {}

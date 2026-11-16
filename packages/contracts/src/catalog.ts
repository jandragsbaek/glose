import * as Schema from "effect/Schema";

import { SourceDetails } from "./source.ts";

export const CatalogSearch = Schema.Struct({
  query: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});

export const CatalogRecord = Schema.Struct({
  id: Schema.String,
  details: SourceDetails,
});
export type CatalogRecord = typeof CatalogRecord.Type;

export class CatalogUnavailable extends Schema.TaggedError<CatalogUnavailable>()(
  "CatalogUnavailable",
  { detail: Schema.String },
) {}

import * as Schema from "effect/Schema";

import { SourceDetails } from "./source.ts";

export const CatalogSearch = Schema.Struct({
  query: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});

/**
 * One work found in the Catalog, with the edition that best matches the search. Its details fill
 * the Add Source form; the user checks them against their copy before the Source is written.
 */
export const CatalogRecord = Schema.Struct({
  /** The Catalog's own key for the work. */
  id: Schema.String,
  details: SourceDetails,
});
export type CatalogRecord = typeof CatalogRecord.Type;

/** The Catalog did not answer, or answered with something Glose cannot read. */
export class CatalogUnavailable extends Schema.TaggedError<CatalogUnavailable>()(
  "CatalogUnavailable",
  { detail: Schema.String },
) {}

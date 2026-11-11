import type { SourceDetails } from "@glose/contracts";

export type FieldName = keyof SourceDetails;

/** The Add Source form as typed: one string per field, empty when not filled in. */
export type FormValues = Readonly<Record<FieldName, string>>;

export const EMPTY_FORM: FormValues = {
  familyName: "",
  givenName: "",
  title: "",
  firstPublished: "",
  edition: "",
  editionYear: "",
  publisher: "",
  translator: "",
};

export const FIELD_NAMES = Object.keys(EMPTY_FORM) as ReadonlyArray<FieldName>;

export const formValuesOf = (details: SourceDetails): FormValues => ({
  familyName: details.familyName,
  givenName: details.givenName ?? "",
  title: details.title,
  firstPublished: details.firstPublished === null ? "" : String(details.firstPublished),
  edition: details.edition ?? "",
  editionYear: details.editionYear === null ? "" : String(details.editionYear),
  publisher: details.publisher ?? "",
  translator: details.translator ?? "",
});

/**
 * Fills the form from a Catalog record without losing the user's own typing. A field is
 * replaced when it is empty or an earlier Catalog fill wrote it and the user has not edited it
 * since; anything else is the user's. `filled` names the fields the Catalog now holds; `kept`
 * names typed fields that differ from the record.
 */
export const fillFromCatalog = (
  current: FormValues,
  filledBefore: ReadonlyArray<FieldName>,
  record: FormValues,
): {
  readonly values: FormValues;
  readonly filled: ReadonlyArray<FieldName>;
  readonly kept: ReadonlyArray<FieldName>;
} => {
  const values = { ...current };
  const filled: Array<FieldName> = [];
  const kept: Array<FieldName> = [];
  for (const name of FIELD_NAMES) {
    if (current[name].trim() === "" || filledBefore.includes(name)) {
      values[name] = record[name];
      if (record[name] !== "") filled.push(name);
    } else if (current[name] !== record[name]) {
      kept.push(name);
    }
  }
  return { values, filled, kept };
};

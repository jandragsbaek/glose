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
 * replaced when it is empty or still holds what the previous Catalog fill put there; anything
 * the user typed or changed stays. `kept` names the fields that stayed.
 */
export const fillFromCatalog = (
  current: FormValues,
  previousFill: FormValues | null,
  record: FormValues,
): { readonly values: FormValues; readonly kept: ReadonlyArray<FieldName> } => {
  const values = { ...current };
  const kept: Array<FieldName> = [];
  for (const name of FIELD_NAMES) {
    const typed = current[name].trim() !== "" && current[name] !== previousFill?.[name];
    if (typed) {
      if (current[name] !== record[name]) kept.push(name);
    } else {
      values[name] = record[name];
    }
  }
  return { values, kept };
};

/** A field shows "from the Catalog" while it still holds the value the Catalog gave. */
export const isFromCatalog = (
  values: FormValues,
  fill: FormValues | null,
  name: FieldName,
): boolean => fill !== null && values[name] !== "" && values[name] === fill[name];

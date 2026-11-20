import * as Schema from "effect/Schema";

export const PROPERTY_KINDS = ["text", "list", "number", "checkbox", "date", "other"] as const;

export const PropertyKind = Schema.Literals(PROPERTY_KINDS);
export type PropertyKind = typeof PropertyKind.Type;

export const PropertyValue = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Array(Schema.String),
]);
export type PropertyValue = typeof PropertyValue.Type;

export const NoteProperty = Schema.Struct({
  key: Schema.String,
  kind: PropertyKind,
  value: PropertyValue,
  locked: Schema.Boolean,
});
export type NoteProperty = typeof NoteProperty.Type;

export const SetProperty = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  value: Schema.NullOr(PropertyValue),
});
export type SetProperty = typeof SetProperty.Type;

export class PropertyRefused extends Schema.TaggedError<PropertyRefused>()("PropertyRefused", {
  key: Schema.String,
}) {}

export const NOTE_FIELDS: ReadonlySet<string> = new Set(["glose", "source", "ai", "ai-title"]);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isPropertyKey = (key: string): boolean =>
  key.trim() === key && key !== "" && key.length <= 100 && !/[\n\r]/.test(key);

export const propertyKind = (value: unknown): PropertyKind => {
  if (value === null || value === undefined) return "text";
  if (typeof value === "boolean") return "checkbox";
  if (typeof value === "number") return Number.isFinite(value) ? "number" : "other";
  if (typeof value === "string") return DAY.test(value) ? "date" : "text";
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return "list";
  return "other";
};

import {
  type GraphFolderNotSet,
  type Session,
  SessionEntry,
  SessionKind as SessionKindSchema,
  StorageError,
} from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export type GraphError = GraphFolderNotSet | StorageError;

export const SessionRecord = Schema.Struct({
  version: Schema.Literal(2),
  id: Schema.String,
  kind: SessionKindSchema,
  subject: Schema.String,
  model: Schema.NullOr(Schema.String),
  created: Schema.Number,
  entries: Schema.Array(SessionEntry),
  items: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
  decisions: Schema.optionalKey(Schema.Array(Schema.String)),
});
export type SessionRecord = typeof SessionRecord.Type;

const RecordJson = Schema.fromJsonString(SessionRecord);
const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));
const decodeRecordFields = Schema.decodeUnknownEffect(SessionRecord);
export const encodeRecord = Schema.encodeEffect(RecordJson);

const upgrade = (json: unknown): unknown => {
  if (typeof json !== "object" || json === null || !("version" in json)) return json;
  if (json.version !== 1 || !("sourceId" in json)) return json;
  const { sourceId, ...rest } = json;
  return { ...rest, version: 2, subject: sourceId };
};

export const decodeRecord = (text: string) =>
  decodeJson(text).pipe(Effect.map(upgrade), Effect.flatMap(decodeRecordFields));

export const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const viewOf = (record: SessionRecord): Session => ({
  id: record.id,
  kind: record.kind,
  subject: record.subject,
  model: record.model,
  created: record.created,
  entries: record.entries,
  working: false,
  draft: "",
  problem: null,
});

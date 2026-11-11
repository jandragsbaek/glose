import * as Schema from "effect/Schema";

/** What a Session is for. Each kind has its own AI rules and tools. */
export const SessionKind = Schema.Literals(["extraction"]);
export type SessionKind = typeof SessionKind.Type;

/** The tools an agent can call, named for the user. */
export const SessionTool = Schema.Literals(["read-source", "list-sources"]);
export type SessionTool = typeof SessionTool.Type;

/** One visible step of a Session, in order. */
export const SessionEntry = Schema.Union([
  Schema.TaggedStruct("UserMessage", { text: Schema.String }),
  Schema.TaggedStruct("AiMessage", { text: Schema.String }),
  Schema.TaggedStruct("ToolUse", { tool: SessionTool }),
]);
export type SessionEntry = typeof SessionEntry.Type;

/** Why the last turn of a Session stopped before the AI answered. */
export const SessionProblem = Schema.Literals([
  /** No ChatGPT connection, or it no longer works. */
  "not-connected",
  /** The user did not allow Glose to use their ChatGPT plan. */
  "plan-not-allowed",
  /** The user's ChatGPT plan, or Glose's share of it, is used up for now. */
  "usage-limit",
  /** This account or workspace cannot use its ChatGPT plan in other apps. */
  "not-eligible",
  /** ChatGPT could not be reached, or answered with a temporary error. */
  "unavailable",
  "failed",
]);
export type SessionProblem = typeof SessionProblem.Type;

export const Session = Schema.Struct({
  id: Schema.String,
  kind: SessionKind,
  /** The Source the Session works on. */
  sourceId: Schema.String,
  /** The ChatGPT model of the last turn; null before the first. */
  model: Schema.NullOr(Schema.String),
  /** Start time, in epoch milliseconds. */
  created: Schema.Number,
  entries: Schema.Array(SessionEntry),
  /** True while the AI works on a turn. */
  working: Schema.Boolean,
  /** The AI's answer as it arrives, before it becomes an entry. */
  draft: Schema.String,
  problem: Schema.NullOr(SessionProblem),
});
export type Session = typeof Session.Type;

export const SessionRef = Schema.Struct({ id: Schema.String });

export const FindSession = Schema.Struct({ kind: SessionKind, sourceId: Schema.String });

export const SendMessage = Schema.Struct({
  id: Schema.String,
  text: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});

export class SessionNotFound extends Schema.TaggedError<SessionNotFound>()("SessionNotFound", {
  id: Schema.String,
}) {}

/** The AI is still working on the last turn. */
export class SessionBusy extends Schema.TaggedError<SessionBusy>()("SessionBusy", {
  id: Schema.String,
}) {}

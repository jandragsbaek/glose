import * as Schema from "effect/Schema";

import { CardScore } from "./cardScore.ts";

/**
 * What a Session is for. Each kind has its own AI rules and tools. `extraction` turns a Source
 * into Notes; `card-extraction` turns a Note into Cards.
 */
export const SessionKind = Schema.Literals(["extraction", "card-extraction"]);
export type SessionKind = typeof SessionKind.Type;

/** The tools an agent can call, named for the user. */
export const SessionTool = Schema.Literals([
  "read-source",
  "list-sources",
  "read-note",
  "list-cards",
]);
export type SessionTool = typeof SessionTool.Type;

/** What the user did with a Card the AI proposed. */
export const ProposalState = Schema.Literals(["open", "kept", "dropped"]);
export type ProposalState = typeof ProposalState.Type;

/** A Card the AI proposed in Card Extraction. It is a Card only once the user keeps it. */
export const CardProposal = Schema.Struct({
  /** Unique in its Session. */
  id: Schema.String,
  question: Schema.String,
  answer: Schema.String,
  state: ProposalState,
  /** The Card file a kept proposal became. */
  card: Schema.NullOr(Schema.String),
  /** The proposed words against the Checks; Sessions from before Checks have none. */
  score: Schema.optionalKey(CardScore),
});
export type CardProposal = typeof CardProposal.Type;

/** One visible step of a Session, in order. */
export const SessionEntry = Schema.Union([
  Schema.TaggedStruct("UserMessage", { text: Schema.String }),
  Schema.TaggedStruct("AiMessage", { text: Schema.String }),
  Schema.TaggedStruct("ToolUse", { tool: SessionTool }),
  /** A passage of the Note that the user chose to make Cards from. */
  Schema.TaggedStruct("Passage", { text: Schema.String }),
  Schema.TaggedStruct("CardProposals", { proposals: Schema.Array(CardProposal) }),
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
  /** The Graph file the Session works on: a Source for Extraction, a Note for Card Extraction. */
  subject: Schema.String,
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

export const FindSession = Schema.Struct({ kind: SessionKind, subject: Schema.String });

const Passage = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const StartSession = Schema.Struct({
  ...FindSession.fields,
  /** Card Extraction from a passage of the Note instead of the whole Note. */
  passage: Schema.optionalKey(Passage),
});

/** The user chose another passage of the Note to make Cards from. */
export const SendPassage = Schema.Struct({ id: Schema.String, passage: Passage });

/** Keeps a proposed Card, with the user's changes, as a Card file. */
export const KeepProposal = Schema.Struct({
  id: Schema.String,
  proposal: Schema.String,
  question: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
  answer: Schema.Trim,
});

export const DropProposal = Schema.Struct({ id: Schema.String, proposal: Schema.String });

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

/** No proposed Card with this id is open in the Session. */
export class ProposalNotOpen extends Schema.TaggedError<ProposalNotOpen>()("ProposalNotOpen", {
  id: Schema.String,
  proposal: Schema.String,
}) {}

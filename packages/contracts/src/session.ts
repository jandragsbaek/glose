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
  "search-graph",
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

/** Where a Point comes from: the user's Free text, the AI's knowledge of the Source, or the user. */
export const PointOrigin = Schema.Literals(["free-text", "ai", "user"]);
export type PointOrigin = typeof PointOrigin.Type;

/**
 * What the user did with a Point: open (proposed, not decided), kept (to write), written (a
 * Note file now), or dropped.
 */
export const PointState = Schema.Literals(["open", "kept", "written", "dropped"]);
export type PointState = typeof PointState.Type;

/** A Link the AI proposes from a Point's Note to a Note that exists, and why. */
export const PointLink = Schema.Struct({
  note: Schema.String,
  why: Schema.String,
  /** The written Note holds it. */
  added: Schema.Boolean,
});
export type PointLink = typeof PointLink.Type;

/**
 * A core point of a Source in Extraction: one claim, which becomes a Note's title when the user
 * writes it. The AI proposes Points, or the user adds one in their own words.
 */
export const Point = Schema.Struct({
  /** Unique in its Session, in order of arrival: `p1`, `p2`… The number the user sees. */
  id: Schema.String,
  title: Schema.String,
  origin: PointOrigin,
  /** The words of the Free text the Point comes from, exactly as the user wrote them. */
  quote: Schema.NullOr(Schema.String),
  /** A Note that already says this. */
  repeats: Schema.NullOr(Schema.String),
  /** A Note this Point disagrees with, and how. */
  pullsAgainst: Schema.NullOr(Schema.Struct({ note: Schema.String, why: Schema.String })),
  links: Schema.Array(PointLink),
  /**
   * Note text the AI wrote, with the Point or when the user asked for a new one. AI text: the
   * user's form starts with it, and the Note keeps the AI mark until the user rewrites it.
   */
  draft: Schema.NullOr(Schema.String),
  state: PointState,
  /** The Note file a written Point became. */
  note: Schema.NullOr(Schema.String),
  /** The Location of a written Point in its Source, such as a page. */
  page: Schema.NullOr(Schema.String),
});
export type Point = typeof Point.Type;

/** One visible step of a Session, in order. */
export const SessionEntry = Schema.Union([
  Schema.TaggedStruct("UserMessage", {
    text: Schema.String,
    /** The Point the message is about. */
    about: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("AiMessage", { text: Schema.String }),
  Schema.TaggedStruct("ToolUse", {
    tool: SessionTool,
    /** What the tool used: a Note's name, or the words searched for. */
    detail: Schema.optionalKey(Schema.String),
  }),
  /** A summary of the AI's reasoning before it acted, and how long it took. */
  Schema.TaggedStruct("Thinking", { text: Schema.String, ms: Schema.Number }),
  /** Points the AI proposed, or the user added, in Extraction. */
  Schema.TaggedStruct("Points", { points: Schema.Array(Point) }),
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

const Words = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const SendMessage = Schema.Struct({
  id: Schema.String,
  text: Words,
  /** The Point the message is about. */
  about: Schema.optionalKey(Schema.String),
});

export const PointRef = Schema.Struct({ id: Schema.String, point: Schema.String });

/** Keeps a proposed Point to write, with the user's changes to its words. */
export const KeepPoint = Schema.Struct({ ...PointRef.fields, title: Words });

/** A Point in the user's own words. */
export const AddPoint = Schema.Struct({ id: Schema.String, title: Words });

/** Writes a kept Point as a Note file. */
export const WritePoint = Schema.Struct({
  ...PointRef.fields,
  title: Words,
  /** The Note's text. */
  text: Schema.Trim,
  /**
   * The text is AI text: the AI's draft, edited or not, that the user has not marked as
   * rewritten. The Note keeps it marked; otherwise the text is the user's own words.
   */
  aiText: Schema.Boolean,
  /** The Location in the Source, such as a page; null when not given. */
  page: Schema.NullOr(Words),
  /** The proposed Links the user added. */
  links: Schema.Array(Schema.String),
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

/** No Point with this id is in a state that allows this. */
export class PointNotFound extends Schema.TaggedError<PointNotFound>()("PointNotFound", {
  id: Schema.String,
  point: Schema.String,
}) {}

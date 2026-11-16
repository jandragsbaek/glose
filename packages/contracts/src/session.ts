import * as Schema from "effect/Schema";

import { CardScore } from "./cardScore.ts";

export const SessionKind = Schema.Literals(["extraction", "card-extraction", "probe"]);
export type SessionKind = typeof SessionKind.Type;

export const SessionTool = Schema.Literals([
  "read-source",
  "list-sources",
  "read-note",
  "list-cards",
  "search-graph",
  "list-notes",
  "read-probe",
]);
export type SessionTool = typeof SessionTool.Type;

export const ProposalState = Schema.Literals(["open", "kept", "dropped"]);
export type ProposalState = typeof ProposalState.Type;

export const CardProposal = Schema.Struct({
  id: Schema.String,
  question: Schema.String,
  answer: Schema.String,
  state: ProposalState,
  card: Schema.NullOr(Schema.String),
  score: Schema.optionalKey(CardScore),
});
export type CardProposal = typeof CardProposal.Type;

export const PointOrigin = Schema.Literals(["free-text", "probe", "ai", "user"]);
export type PointOrigin = typeof PointOrigin.Type;

export const PointState = Schema.Literals(["open", "kept", "written", "dropped"]);
export type PointState = typeof PointState.Type;

export const PointLink = Schema.Struct({
  note: Schema.String,
  why: Schema.String,
  added: Schema.Boolean,
});
export type PointLink = typeof PointLink.Type;

export const Point = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  origin: PointOrigin,
  quote: Schema.NullOr(Schema.String),
  repeats: Schema.NullOr(Schema.String),
  pullsAgainst: Schema.NullOr(Schema.Struct({ note: Schema.String, why: Schema.String })),
  links: Schema.Array(PointLink),
  draft: Schema.NullOr(Schema.String),
  state: PointState,
  note: Schema.NullOr(Schema.String),
  page: Schema.NullOr(Schema.String),
});
export type Point = typeof Point.Type;

export const ReasoningVerdict = Schema.Literals(["sound", "partly-sound", "flawed", "none"]);
export type ReasoningVerdict = typeof ReasoningVerdict.Type;

export const ResultVerdict = Schema.Literals(["right", "partly-right", "wrong"]);
export type ResultVerdict = typeof ResultVerdict.Type;

export const TaughtKind = Schema.Literals(["gap", "intro"]);
export type TaughtKind = typeof TaughtKind.Type;

export const SessionEntry = Schema.Union([
  Schema.TaggedStruct("UserMessage", {
    text: Schema.String,
    about: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("AiMessage", { text: Schema.String }),
  Schema.TaggedStruct("ToolUse", {
    tool: SessionTool,
    detail: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("Thinking", { text: Schema.String, ms: Schema.Number }),
  Schema.TaggedStruct("Points", { points: Schema.Array(Point) }),
  Schema.TaggedStruct("Passage", { text: Schema.String }),
  Schema.TaggedStruct("CardProposals", { proposals: Schema.Array(CardProposal) }),
  Schema.TaggedStruct("ProbeQuestion", {
    number: Schema.Number,
    topic: Schema.String,
    text: Schema.String,
    again: Schema.NullOr(Schema.Number),
  }),
  Schema.TaggedStruct("ProbeAnswer", {
    question: Schema.Number,
    reasoning: Schema.String,
    answer: Schema.String,
    teachMe: Schema.Boolean,
  }),
  Schema.TaggedStruct("ProbeJudgment", {
    question: Schema.Number,
    reasoning: ReasoningVerdict,
    reasoningWhy: Schema.String,
    result: ResultVerdict,
    resultWhy: Schema.String,
    quote: Schema.NullOr(Schema.String),
  }),
  Schema.TaggedStruct("ProbeTaught", {
    kind: TaughtKind,
    topic: Schema.String,
    question: Schema.NullOr(Schema.Number),
    text: Schema.String,
  }),
  Schema.TaggedStruct("ProbeCovered", {}),
  Schema.TaggedStruct("ProbeFinished", { at: Schema.Number }),
]);
export type SessionEntry = typeof SessionEntry.Type;

export const SessionProblem = Schema.Literals([
  "not-connected",
  "plan-not-allowed",
  "usage-limit",
  "not-eligible",
  "unavailable",
  "failed",
]);
export type SessionProblem = typeof SessionProblem.Type;

export const Session = Schema.Struct({
  id: Schema.String,
  kind: SessionKind,
  subject: Schema.String,
  model: Schema.NullOr(Schema.String),
  created: Schema.Number,
  entries: Schema.Array(SessionEntry),
  working: Schema.Boolean,
  draft: Schema.String,
  problem: Schema.NullOr(SessionProblem),
});
export type Session = typeof Session.Type;

export const SessionRef = Schema.Struct({ id: Schema.String });

export const FindSession = Schema.Struct({ kind: SessionKind, subject: Schema.String });

const Passage = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()));

export const StartSession = Schema.Struct({
  ...FindSession.fields,
  passage: Schema.optionalKey(Passage),
});

export const SendPassage = Schema.Struct({ id: Schema.String, passage: Passage });

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
  about: Schema.optionalKey(Schema.String),
});

export const AnswerProbe = Schema.Struct({
  id: Schema.String,
  question: Schema.Number,
  reasoning: Schema.Trim,
  answer: Schema.Trim,
  teachMe: Schema.Boolean,
});

export const PointRef = Schema.Struct({ id: Schema.String, point: Schema.String });

export const KeepPoint = Schema.Struct({ ...PointRef.fields, title: Words });

export const AddPoint = Schema.Struct({ id: Schema.String, title: Words });

export const WritePoint = Schema.Struct({
  ...PointRef.fields,
  title: Words,
  text: Schema.Trim,
  aiText: Schema.Boolean,
  page: Schema.NullOr(Words),
  links: Schema.Array(Schema.String),
});

export class SessionNotFound extends Schema.TaggedError<SessionNotFound>()("SessionNotFound", {
  id: Schema.String,
}) {}

export class SessionBusy extends Schema.TaggedError<SessionBusy>()("SessionBusy", {
  id: Schema.String,
}) {}

export class ProposalNotOpen extends Schema.TaggedError<ProposalNotOpen>()("ProposalNotOpen", {
  id: Schema.String,
  proposal: Schema.String,
}) {}

export class QuestionNotOpen extends Schema.TaggedError<QuestionNotOpen>()("QuestionNotOpen", {
  id: Schema.String,
  question: Schema.Number,
}) {}

export class PointNotFound extends Schema.TaggedError<PointNotFound>()("PointNotFound", {
  id: Schema.String,
  point: Schema.String,
}) {}

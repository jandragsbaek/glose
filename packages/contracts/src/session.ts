import * as Schema from "effect/Schema";

import { CardScore } from "./cardScore.ts";
import { ArticleType } from "./source.ts";

export const SessionKind = Schema.Literals([
  "extraction",
  "card-extraction",
  "probe",
  "note-research",
]);
export type SessionKind = typeof SessionKind.Type;

export const SessionTool = Schema.Literals([
  "read-source",
  "list-sources",
  "read-note",
  "list-cards",
  "search-graph",
  "list-notes",
  "read-probe",
  "read-article",
  "search-web",
  "read-web-page",
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

export const PointOrigin = Schema.Literals([
  "free-text",
  "probe",
  "article",
  "passage",
  "ai",
  "user",
]);
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

export const Confidence = Schema.Literals(["sure", "unsure", "guess"]);
export type Confidence = typeof Confidence.Type;

export const ChoiceSelect = Schema.Literals(["one", "many"]);
export type ChoiceSelect = typeof ChoiceSelect.Type;

export const ProbeChoice = Schema.Struct({
  select: ChoiceSelect,
  options: Schema.Array(Schema.String),
  right: Schema.optionalKey(Schema.Array(Schema.Number)),
  tests: Schema.optionalKey(Schema.Array(Schema.NullOr(Schema.String))),
});
export type ProbeChoice = typeof ProbeChoice.Type;

export const ResearchAsk = Schema.Literals(["learn", "back", "check", "bridge"]);
export type ResearchAsk = typeof ResearchAsk.Type;

export const Stance = Schema.Literals(["supports", "pulls-against", "context"]);
export type Stance = typeof Stance.Type;

export const FoundQuote = Schema.Struct({ text: Schema.String, paragraph: Schema.Number });
export type FoundQuote = typeof FoundQuote.Type;

export const FoundPage = Schema.Struct({
  id: Schema.String,
  url: Schema.String,
  title: Schema.String,
  site: Schema.NullOr(Schema.String),
  author: Schema.NullOr(Schema.String),
  published: Schema.NullOr(Schema.String),
  articleType: ArticleType,
  stance: Stance,
  why: Schema.String,
  quotes: Schema.Array(FoundQuote),
  state: ProposalState,
  source: Schema.NullOr(Schema.String),
});
export type FoundPage = typeof FoundPage.Type;

export const ResearchLink = Schema.Struct({ note: Schema.String, why: Schema.String });
export type ResearchLink = typeof ResearchLink.Type;

export const SessionEntry = Schema.Union([
  Schema.TaggedStruct("UserMessage", {
    text: Schema.String,
    about: Schema.optionalKey(Schema.String),
    question: Schema.optionalKey(Schema.Number),
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
    paragraph: Schema.optionalKey(Schema.Number),
    passage: Schema.optionalKey(Schema.String),
    choice: Schema.optionalKey(ProbeChoice),
  }),
  Schema.TaggedStruct("ProbeAnswer", {
    question: Schema.Number,
    reasoning: Schema.String,
    answer: Schema.String,
    teachMe: Schema.Boolean,
    choice: Schema.optionalKey(Schema.Array(Schema.Number)),
    confidence: Schema.optionalKey(Confidence),
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
    paragraph: Schema.optionalKey(Schema.Number),
  }),
  Schema.TaggedStruct("ProbeHintAsked", { question: Schema.Number }),
  Schema.TaggedStruct("ProbeHint", { question: Schema.Number, text: Schema.String }),
  Schema.TaggedStruct("ProbePlan", { topics: Schema.Array(Schema.String) }),
  Schema.TaggedStruct("ProbeFocus", { paragraph: Schema.Number, text: Schema.String }),
  Schema.TaggedStruct("ProbeFocusDone", {
    paragraph: Schema.Number,
    text: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("ProbeCovered", {}),
  Schema.TaggedStruct("ProbeFinished", { at: Schema.Number }),
  Schema.TaggedStruct("ResearchStart", {
    ask: ResearchAsk,
    title: Schema.String,
    text: Schema.optionalKey(Schema.String),
    question: Schema.String,
    notes: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("FoundPages", { pages: Schema.Array(FoundPage) }),
  Schema.TaggedStruct("ResearchLinks", { links: Schema.Array(ResearchLink) }),
  Schema.TaggedStruct("WebSearchOff", {}),
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
  judgment: Schema.optionalKey(Schema.Number),
});

export const AnswerProbe = Schema.Struct({
  id: Schema.String,
  question: Schema.Number,
  reasoning: Schema.Trim,
  answer: Schema.Trim,
  teachMe: Schema.Boolean,
  choice: Schema.optionalKey(Schema.Array(Schema.Number)),
  confidence: Schema.optionalKey(Confidence),
});

export const AskHint = Schema.Struct({ id: Schema.String, question: Schema.Number });

export const PointRef = Schema.Struct({ id: Schema.String, point: Schema.String });

export const GoDeeper = Schema.Struct({ source: Schema.String, passage: Schema.String });

export const AddPassagePoint = Schema.Struct({
  source: Schema.String,
  passage: Schema.String,
  title: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())),
});

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

import * as Schema from "effect/Schema";

export const ChatGptProblem = Schema.Literals([
  "declined",
  "port-busy",
  "timed-out",
  "other-account",
  "expired",
  "failed",
]);
export type ChatGptProblem = typeof ChatGptProblem.Type;

export const ChatGptStatus = Schema.Union([
  Schema.TaggedStruct("Disconnected", {
    email: Schema.NullOr(Schema.String),
    problem: Schema.NullOr(ChatGptProblem),
  }),
  Schema.TaggedStruct("Connecting", {
    authorizeUrl: Schema.String,
  }),
  Schema.TaggedStruct("Connected", {
    email: Schema.String,
    planUsage: Schema.Boolean,
    planNoticeSeen: Schema.Boolean,
  }),
]);
export type ChatGptStatus = typeof ChatGptStatus.Type;

export const ChatGptAccountChoice = Schema.Literals(["saved", "new"]);
export type ChatGptAccountChoice = typeof ChatGptAccountChoice.Type;

export const ConnectChatGpt = Schema.Struct({
  account: ChatGptAccountChoice,
  consent: Schema.Boolean,
});

export const DisconnectResult = Schema.Struct({
  revoked: Schema.Boolean,
});

export const CHATGPT_USAGE_URL = "https://chatgpt.com/settings/usage";

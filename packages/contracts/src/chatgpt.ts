import * as Schema from "effect/Schema";

/** Why the last attempt to connect, or the connection itself, ended. */
export const ChatGptProblem = Schema.Literals([
  /** The user declined in the browser. */
  "declined",
  /** The callback port is in use by another program, such as a Codex sign-in. */
  "port-busy",
  /** No answer from the browser within the time limit. */
  "timed-out",
  /** The browser signed in to another account than the one Glose asked for. */
  "other-account",
  /** The sign-in no longer works (expired, revoked, or disconnected in ChatGPT); sign in again. */
  "expired",
  "failed",
]);
export type ChatGptProblem = typeof ChatGptProblem.Type;

/**
 * The ChatGPT connection of this computer. It is not a login to Glose: it only lets the AI use
 * the user's own ChatGPT plan.
 */
export const ChatGptStatus = Schema.Union([
  Schema.TaggedStruct("Disconnected", {
    /** The account used last, so the user can continue with it. */
    email: Schema.NullOr(Schema.String),
    problem: Schema.NullOr(ChatGptProblem),
  }),
  Schema.TaggedStruct("Connecting", {
    /** The sign-in page; Glose opens it in the browser, and the user can open it again. */
    authorizeUrl: Schema.String,
  }),
  Schema.TaggedStruct("Connected", {
    email: Schema.String,
    /** False when the user signed in but did not allow Glose to use their ChatGPT plan. */
    planUsage: Schema.Boolean,
    /** The one-time confirmation that the AI now uses the user's ChatGPT plan. */
    planNoticeSeen: Schema.Boolean,
  }),
]);
export type ChatGptStatus = typeof ChatGptStatus.Type;

/** `saved` continues with the account used last; `new` signs in to another account. */
export const ChatGptAccountChoice = Schema.Literals(["saved", "new"]);
export type ChatGptAccountChoice = typeof ChatGptAccountChoice.Type;

export const ConnectChatGpt = Schema.Struct({
  account: ChatGptAccountChoice,
  /** Asks the user again for permission to use their ChatGPT plan, after they declined it. */
  consent: Schema.Boolean,
});

export const DisconnectResult = Schema.Struct({
  /** False when OpenAI could not confirm that it ended the sign-in. */
  revoked: Schema.Boolean,
});

/** ChatGPT's own page where the user sees and limits the usage of each app. */
export const CHATGPT_USAGE_URL = "https://chatgpt.com/settings/usage";

import type { SessionEntry, SessionTool } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { type OutputItem, Responses, ResponsesError } from "../chatgpt/Responses.ts";

/** A Responses API input item, as JSON. Output items go back in as input unchanged. */
export type InputItem = Readonly<Record<string, unknown>>;

/** A function the agent may call. What it may do is what the AI may do in that Section. */
export interface AgentTool {
  /** The name the model sees, such as `read_source`. */
  readonly name: string;
  /** The name the user sees in the Session. */
  readonly entry: SessionTool;
  readonly description: string;
  /** JSON Schema of the arguments, strict: every property required, nothing extra. */
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Answers with JSON for the model. A failure is also an answer, never a crash. */
  readonly run: (args: unknown) => Effect.Effect<unknown>;
}

/** Glose's tools reach the model in one namespace, as the ChatGPT plan route requires. */
export const NAMESPACE = "glose";

/** Model calls in one turn, so a confused model cannot loop for ever on the user's plan. */
export const MAX_ROUNDS = 12;

const FunctionCall = Schema.Struct({
  type: Schema.Literal("function_call"),
  call_id: Schema.String,
  name: Schema.String,
  arguments: Schema.String,
  namespace: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
const decodeFunctionCall = Schema.decodeUnknownOption(FunctionCall);

const AssistantMessage = Schema.Struct({
  type: Schema.Literal("message"),
  role: Schema.Literal("assistant"),
  content: Schema.Array(
    Schema.Struct({ type: Schema.String, text: Schema.optionalKey(Schema.String) }),
  ),
});
const decodeAssistantMessage = Schema.decodeUnknownOption(AssistantMessage);

const decodeArguments = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

/**
 * Output items go back without their `id`: with `store: false` OpenAI keeps no items to look
 * up, and the encrypted reasoning travels in the item itself.
 */
const toInput = ({ id: _id, ...item }: OutputItem): InputItem => item;

const messageText = (item: OutputItem) =>
  Option.map(decodeAssistantMessage(item), (message) =>
    message.content
      .filter((part) => part.type === "output_text")
      .map((part) => part.text ?? "")
      .join(""),
  );

export interface Turn {
  readonly token: Redacted.Redacted<string>;
  readonly model: string;
  readonly instructions: string;
  readonly tools: ReadonlyArray<AgentTool>;
  readonly items: ReadonlyArray<InputItem>;
  /** The AI's text as it arrives. */
  readonly onDelta: (delta: string) => Effect.Effect<void>;
  /** A visible step: an AI message or a tool use. */
  readonly onEntry: (entry: SessionEntry) => Effect.Effect<void>;
  /** The whole input so far, after each model call and its tool calls, ready to keep. */
  readonly onItems: (items: ReadonlyArray<InputItem>) => Effect.Effect<void>;
}

/**
 * One agent turn: call the model, run the tools it asks for, and call it again with the
 * results, until it answers without a tool call.
 */
export const runTurn = Effect.fn("agent.runTurn")(function* (turn: Turn) {
  const responses = yield* Responses;
  const tools = new Map(turn.tools.map((tool) => [tool.name, tool]));
  const toolSpec = {
    type: "namespace",
    name: NAMESPACE,
    description: "Glose: the user's Sources and Notes.",
    tools: turn.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    })),
  };
  const items: Array<InputItem> = [...turn.items];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const output: Array<OutputItem> = [];
    let completed = false;
    yield* responses
      .stream(turn.token, {
        model: turn.model,
        instructions: turn.instructions,
        input: items,
        tools: turn.tools.length === 0 ? [] : [toolSpec],
        tool_choice: "auto",
        parallel_tool_calls: false,
        include: ["reasoning.encrypted_content"],
        store: false,
        stream: true,
      })
      .pipe(
        Stream.runForEach((event) => {
          switch (event._tag) {
            case "TextDelta":
              return turn.onDelta(event.delta);
            case "ItemDone":
              output.push(event.item);
              return Option.match(messageText(event.item), {
                onNone: () => Effect.void,
                onSome: (text) => turn.onEntry({ _tag: "AiMessage", text }),
              });
            case "Completed":
              completed = true;
              return Effect.void;
          }
        }),
      );
    if (!completed) {
      return yield* new ResponsesError({ status: null, code: null, detail: "stream ended early" });
    }

    const results: Array<InputItem> = [];
    for (const item of output) {
      const call = decodeFunctionCall(item);
      if (Option.isNone(call)) continue;
      const tool = tools.get(call.value.name);
      if (tool) yield* turn.onEntry({ _tag: "ToolUse", tool: tool.entry });
      const result = tool
        ? yield* Option.match(decodeArguments(call.value.arguments), {
            onNone: () => Effect.succeed({ error: "The arguments are not valid JSON." }),
            onSome: tool.run,
          })
        : { error: `There is no tool named ${call.value.name}.` };
      results.push({
        type: "function_call_output",
        call_id: call.value.call_id,
        output: JSON.stringify(result),
      });
    }

    items.push(...output.map(toInput), ...results);
    yield* turn.onItems([...items]);
    if (results.length === 0) return items;
  }
  return yield* new ResponsesError({ status: null, code: null, detail: "too many tool rounds" });
});

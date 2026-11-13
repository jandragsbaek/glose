import * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";
import type * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { type Responses, ResponsesError } from "./Responses.ts";

/** The text of a finished output item; anything but a message's output text is empty. */
export const outputText = (item: Readonly<Record<string, unknown>>): string => {
  if (item.type !== "message" || !Array.isArray(item.content)) return "";
  return item.content
    .map((part: unknown) =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "output_text" &&
      "text" in part &&
      typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("");
};

/** A JSON schema object whose every property is required, as strict structured output asks. */
export const strictObject = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** One call without tools whose answer is JSON in a strict schema, decoded. */
export const askStructured = Effect.fn("askStructured")(function* <A>(
  responses: Responses["Service"],
  request: {
    readonly token: Redacted.Redacted<string>;
    readonly model: string;
    readonly instructions: string;
    readonly input: string;
    readonly name: string;
    readonly schema: Readonly<Record<string, unknown>>;
    readonly decode: (text: string) => Effect.Effect<A, Schema.SchemaError>;
  },
) {
  let text = "";
  let completed = false;
  yield* responses
    .stream(request.token, {
      model: request.model,
      instructions: request.instructions,
      input: [{ type: "message", role: "user", content: request.input }],
      tools: [],
      tool_choice: "auto",
      parallel_tool_calls: false,
      store: false,
      stream: true,
      text: {
        format: { type: "json_schema", name: request.name, strict: true, schema: request.schema },
      },
    })
    .pipe(
      Stream.runForEach((event) =>
        Effect.sync(() => {
          if (event._tag === "ItemDone") text += outputText(event.item);
          if (event._tag === "Completed") completed = true;
        }),
      ),
    );
  if (!completed) {
    return yield* new ResponsesError({ status: null, code: null, detail: "stream ended early" });
  }
  return yield* request
    .decode(text)
    .pipe(
      Effect.mapError(
        (error) => new ResponsesError({ status: null, code: null, detail: String(error) }),
      ),
    );
});

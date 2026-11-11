import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Sse from "effect/encoding/Sse";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { OpenAi } from "./OpenAi.ts";

/**
 * A Responses API request failed. `code` is OpenAI's machine-readable error code when there is
 * one, such as `subscription_sharing_usage_limit_exceeded`.
 */
export class ResponsesError extends Data.TaggedError("ResponsesError")<{
  readonly status: number | null;
  readonly code: string | null;
  readonly detail: string;
}> {}

/** An output item exactly as the API sent it; the next request sends it back as input. */
export type OutputItem = { readonly type: string } & Readonly<Record<string, unknown>>;

export type ResponseEvent =
  | { readonly _tag: "TextDelta"; readonly delta: string }
  | { readonly _tag: "ItemDone"; readonly item: OutputItem }
  | { readonly _tag: "Completed" };

export interface Model {
  readonly slug: string;
  readonly displayName: string;
}

export class Responses extends Context.Service<
  Responses,
  {
    /** Streams one response. It ends with `Completed`, or fails. */
    readonly stream: (
      token: Redacted.Redacted<string>,
      body: Readonly<Record<string, unknown>>,
    ) => Stream.Stream<ResponseEvent, ResponsesError>;
    /** The models this account may use, in OpenAI's order. */
    readonly models: (
      token: Redacted.Redacted<string>,
    ) => Effect.Effect<ReadonlyArray<Model>, ResponsesError>;
  }
>()("glose/chatgpt/Responses") {}

const ErrorObject = Schema.Struct({
  code: Schema.optionalKey(Schema.NullOr(Schema.String)),
  message: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const StreamEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("response.output_text.delta"), delta: Schema.String }),
  Schema.Struct({
    type: Schema.Literal("response.output_item.done"),
    item: Schema.StructWithRest(Schema.Struct({ type: Schema.String }), [
      Schema.Record(Schema.String, Schema.Unknown),
    ]),
  }),
  Schema.Struct({ type: Schema.Literal("response.completed") }),
  Schema.Struct({
    type: Schema.Literals(["response.failed", "response.incomplete"]),
    response: Schema.Struct({
      error: Schema.optionalKey(Schema.NullOr(ErrorObject)),
      incomplete_details: Schema.optionalKey(Schema.Unknown),
    }),
  }),
  Schema.Struct({ type: Schema.Literal("error"), ...ErrorObject.fields }),
]);
const decodeStreamEvent = Schema.decodeUnknownOption(Schema.fromJsonString(StreamEvent));

/** Error bodies before a stream opens: the API's `{ error }` or the admission layer's `{ detail }`. */
const ErrorBody = Schema.Union([
  Schema.Struct({ error: ErrorObject }),
  Schema.Struct({ detail: Schema.String }),
]);
const decodeErrorBody = Schema.decodeUnknownOption(Schema.fromJsonString(ErrorBody));

const ModelList = Schema.Struct({
  models: Schema.Array(
    Schema.Struct({
      slug: Schema.String,
      display_name: Schema.optionalKey(Schema.String),
      visibility: Schema.optionalKey(Schema.String),
    }),
  ),
});
const decodeModelList = Schema.decodeUnknownEffect(Schema.fromJsonString(ModelList));

const errorFromBody = (status: number, text: string) =>
  Option.match(decodeErrorBody(text), {
    onNone: () => new ResponsesError({ status, code: null, detail: text.slice(0, 500) }),
    onSome: (body) =>
      "error" in body
        ? new ResponsesError({
            status,
            code: body.error.code ?? null,
            detail: body.error.message ?? "",
          })
        : new ResponsesError({ status, code: null, detail: body.detail }),
  });

const transportError = (cause: unknown) =>
  new ResponsesError({ status: null, code: null, detail: String(cause) });

/** One SSE event as zero or one `ResponseEvent`; a failure event fails the stream. */
const toEvents = (data: string): Effect.Effect<ReadonlyArray<ResponseEvent>, ResponsesError> =>
  Option.match(decodeStreamEvent(data), {
    onNone: () => Effect.succeed([]),
    onSome: (event) => {
      switch (event.type) {
        case "response.output_text.delta":
          return Effect.succeed([{ _tag: "TextDelta", delta: event.delta }]);
        case "response.output_item.done":
          return Effect.succeed([{ _tag: "ItemDone", item: event.item }]);
        case "response.completed":
          return Effect.succeed([{ _tag: "Completed" }]);
        case "error":
          return Effect.fail(
            new ResponsesError({
              status: null,
              code: event.code ?? null,
              detail: event.message ?? "",
            }),
          );
        default:
          return Effect.fail(
            new ResponsesError({
              status: null,
              code: event.response.error?.code ?? event.type,
              detail: event.response.error?.message ?? JSON.stringify(event.response),
            }),
          );
      }
    },
  });

export const make = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient;
  const { apiUrl } = yield* OpenAi;

  return Responses.of({
    stream: (token, body) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const response = yield* http
            .execute(
              HttpClientRequest.post(`${apiUrl}/responses`).pipe(
                HttpClientRequest.bearerToken(token),
                HttpClientRequest.accept("text/event-stream"),
                HttpClientRequest.bodyJsonUnsafe(body),
              ),
            )
            .pipe(Effect.mapError(transportError));
          if (response.status !== 200) {
            const text = yield* response.text.pipe(Effect.orElseSucceed(() => ""));
            return yield* errorFromBody(response.status, text);
          }
          return response.stream.pipe(
            Stream.decodeText,
            Stream.pipeThroughChannel(Sse.decode()),
            Stream.mapError(transportError),
            Stream.mapEffect((event) => toEvents(event.data)),
            Stream.flattenIterable,
          );
        }),
      ),

    models: Effect.fn("Responses.models")(function* (token) {
      const response = yield* http
        .execute(
          HttpClientRequest.get(`${apiUrl}/models`).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.acceptJson,
          ),
        )
        .pipe(Effect.mapError(transportError));
      const text = yield* response.text.pipe(Effect.mapError(transportError));
      if (response.status !== 200) return yield* errorFromBody(response.status, text);
      const { models } = yield* decodeModelList(text).pipe(Effect.mapError(transportError));
      return models
        .filter((model) => model.visibility === undefined || model.visibility === "list")
        .map((model) => ({ slug: model.slug, displayName: model.display_name ?? model.slug }));
    }),
  });
});

export const layer = Layer.effect(Responses, make);

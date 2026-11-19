import { COURSE_VIDEO_PATH, courseVideoExtension } from "@glose/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import { Sources } from "./Sources.ts";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
};

export interface ByteRange {
  readonly start: number;
  readonly end: number;
}

export const byteRange = (header: string | undefined, size: number): ByteRange | null | "bad" => {
  if (header === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null || size === 0) return "bad";
  const [, from = "", to = ""] = match;
  if (from === "" && to === "") return "bad";
  const start = from === "" ? Math.max(0, size - Number(to)) : Number(from);
  const end = from === "" || to === "" ? size - 1 : Math.min(Number(to), size - 1);
  return start > end || start >= size ? "bad" : { start, end };
};

const status = (tag: string) =>
  tag === "SourceNotFound"
    ? 404
    : tag === "NotALesson"
      ? 409
      : tag === "NotAVideoFile"
        ? 415
        : tag === "VaultFolderNotSet"
          ? 409
          : 500;

const failed = (error: { readonly _tag: string }) =>
  Effect.succeed(HttpServerResponse.empty({ status: status(error._tag) }));

const idOf = HttpRouter.params.pipe(Effect.map((params) => params.id ?? ""));

const serveVideo = Effect.gen(function* () {
  const sources = yield* Sources;
  const fs = yield* FileSystem.FileSystem;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const file = yield* sources.lessonVideoFile(yield* idOf);
  const size = Number((yield* fs.stat(file)).size);
  const contentType = CONTENT_TYPES[courseVideoExtension(file) ?? ""] ?? "application/octet-stream";
  const range = byteRange(request.headers.range, size);
  if (range === "bad") {
    return HttpServerResponse.empty({
      status: 416,
      headers: { "content-range": `bytes */${size}` },
    });
  }
  if (range === null) {
    return yield* HttpServerResponse.file(file, {
      contentType,
      headers: { "accept-ranges": "bytes", "cache-control": "no-store" },
    });
  }
  return yield* HttpServerResponse.file(file, {
    status: 206,
    contentType,
    offset: range.start,
    bytesToRead: range.end - range.start + 1,
    headers: {
      "accept-ranges": "bytes",
      "cache-control": "no-store",
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}).pipe(
  Effect.catchTags({ PlatformError: () => failed({ _tag: "StorageError" }) }),
  Effect.catch(failed),
);

const saveVideo = Effect.gen(function* () {
  const sources = yield* Sources;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const name = new URL(request.url, "http://glose.local").searchParams.get("name") ?? "";
  yield* sources.saveLessonVideoFile({ id: yield* idOf, name, body: request.stream });
  return HttpServerResponse.empty({ status: 204 });
}).pipe(Effect.catch(failed));

export const layer = Layer.mergeAll(
  HttpRouter.add("GET", `${COURSE_VIDEO_PATH}/:id`, serveVideo),
  HttpRouter.add("PUT", `${COURSE_VIDEO_PATH}/:id`, saveVideo),
);

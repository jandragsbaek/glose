import { assert, describe, it } from "@effect/vitest";
import * as RpcSerialization from "effect/rpc/RpcSerialization";

import { linearNdjson } from "./ndjson.ts";

const bytes = (text: string) => new TextEncoder().encode(text);

const chunked = (data: Uint8Array, size: number) =>
  Array.from({ length: Math.ceil(data.length / size) }, (_, at) =>
    data.subarray(at * size, (at + 1) * size),
  );

describe("linearNdjson", () => {
  it("reads a line that arrives in many chunks, split inside a character", () => {
    const value = { title: "Ærø – små øer", body: "x".repeat(5000) };
    const parser = linearNdjson(1024 * 1024).makeUnsafe();
    const items = chunked(bytes(`${JSON.stringify(value)}\n`), 7).flatMap(parser.decode);
    assert.deepStrictEqual(items, [value]);
  });

  it("reads several lines in one chunk, with Windows line ends and blank lines", () => {
    const parser = linearNdjson(1024).makeUnsafe();
    assert.deepStrictEqual(parser.decode('{"a":1}\r\n\n{"b":2}\n{"c"'), [{ a: 1 }, { b: 2 }]);
    assert.deepStrictEqual(parser.decode(":3}\n"), [{ c: 3 }]);
  });

  it("refuses a line longer than the limit, and a line that is not JSON", () => {
    const long = linearNdjson(10).makeUnsafe();
    assert.throws(() => long.decode('{"a":"0123456789"}\n'), /maximum size of 10/);
    const broken = linearNdjson(1024).makeUnsafe();
    assert.throws(() => broken.decode("{not json}\n"), RpcSerialization.NdjsonDecodeError);
  });

  it("writes lines as Effect's ndjson does", () => {
    const parser = linearNdjson(1024).makeUnsafe();
    assert.strictEqual(parser.encode({ a: 1 }), '{"a":1}\n');
  });
});

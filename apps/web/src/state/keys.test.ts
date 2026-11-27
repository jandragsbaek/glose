import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Reactivity from "effect/reactivity/Reactivity";

import {
  KEYS,
  nodeKeys,
  openSourcePage,
  passageKeys,
  sourceKeys,
  TEXT_KEYS,
  writeThenRefresh,
} from "./keys.ts";

const QUERIES = {
  graph: KEYS.graph,
  sources: KEYS.sources,
  "source a": { source: ["a"] },
  "source b": { source: ["b"] },
  "passages a": { passages: ["a"] },
  "passages b": { passages: ["b"] },
};

const watchQueries = Effect.gen(function* () {
  const reactivity = yield* Reactivity.Reactivity;
  const refreshed = new Set<string>();
  for (const [name, keys] of Object.entries(QUERIES)) {
    reactivity.registerUnsafe(keys, () => refreshed.add(name));
  }
  return () => [...refreshed].sort();
});

const refreshes = (keys: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const refreshed = yield* watchQueries;
    yield* writeThenRefresh(Effect.void, keys);
    return refreshed();
  }).pipe(Effect.provide(Reactivity.layer));

describe("refresh keys", () => {
  it.effect("refresh only the queries that a write changed", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* refreshes(sourceKeys("a")), ["source a", "sources"]);
      assert.deepStrictEqual(yield* refreshes(passageKeys("a")), ["passages a"]);
      assert.deepStrictEqual(yield* refreshes(nodeKeys({ id: "a", kind: "note" })), ["graph"]);
      assert.deepStrictEqual(yield* refreshes(nodeKeys({ id: "a", kind: "source" })), [
        "graph",
        "source a",
        "sources",
      ]);
      assert.deepStrictEqual(yield* refreshes(TEXT_KEYS), ["graph", "passages a", "passages b"]);
    }),
  );

  it.effect("refresh the Graph and the Sources list when the Source page closes", () =>
    Effect.gen(function* () {
      const refreshed = yield* watchQueries;
      const close = openSourcePage();
      yield* writeThenRefresh(Effect.void, [...sourceKeys("a"), ...TEXT_KEYS]);
      assert.deepStrictEqual(refreshed(), ["passages a", "passages b", "source a"]);
      close();
      assert.deepStrictEqual(refreshed(), [
        "graph",
        "passages a",
        "passages b",
        "source a",
        "sources",
      ]);
    }).pipe(Effect.provide(Reactivity.layer)),
  );

  it.effect("refresh at once when a write ends after the Source page closed", () =>
    Effect.gen(function* () {
      const refreshed = yield* watchQueries;
      const close = openSourcePage();
      const saved = yield* Deferred.make<void>();
      const write = yield* Effect.forkChild(
        writeThenRefresh(Deferred.await(saved), sourceKeys("a")),
      );
      close();
      assert.deepStrictEqual(refreshed(), []);
      yield* Deferred.succeed(saved, undefined);
      yield* Fiber.join(write);
      assert.deepStrictEqual(refreshed(), ["source a", "sources"]);
    }).pipe(Effect.provide(Reactivity.layer)),
  );
});

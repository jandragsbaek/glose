import { HEALTH_PATH } from "@glose/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as NodePath from "node:path";

import * as ServerProcess from "./ServerProcess.ts";

// The real server from source, started by plain Node the way the app starts it with Electron.
const serverEntry = NodePath.join(import.meta.dirname, "../../../server/src/bin.ts");

const isReachable = (url: string) =>
  Effect.promise(() =>
    fetch(new URL(HEALTH_PATH, url)).then(
      (response) => response.ok,
      () => false,
    ),
  );

it.live("starts the server, hands back its address, and stops it with the scope", () =>
  Effect.gen(function* () {
    const scope = yield* Scope.make();
    const server = yield* ServerProcess.start({
      executablePath: process.execPath,
      entryPath: serverEntry,
      env: {},
      onUnexpectedExit: (code) => assert.fail(`The server exited on its own (code ${code}).`),
    }).pipe(Scope.provide(scope));

    assert.isTrue(yield* isReachable(server.url));

    yield* Scope.close(scope, Exit.void);
    assert.isFalse(yield* isReachable(server.url));
  }),
);

it.live("fails when the server entry does not exist", () =>
  Effect.gen(function* () {
    const exits: Array<number | null> = [];
    const error = yield* ServerProcess.start({
      executablePath: process.execPath,
      entryPath: NodePath.join(import.meta.dirname, "missing.ts"),
      env: {},
      onUnexpectedExit: (code) => exits.push(code),
    }).pipe(Effect.scoped, Effect.flip);

    assert.strictEqual(error.reason, "exited-before-healthy");
    assert.deepStrictEqual(exits, []);
  }),
);

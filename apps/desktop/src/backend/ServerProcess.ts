import { HEALTH_PATH } from "@glose/contracts";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as NodeChildProcess from "node:child_process";
import * as NodeNet from "node:net";

export class ServerStartError extends Schema.TaggedError<ServerStartError>()("ServerStartError", {
  reason: Schema.Literals([
    "no-free-port",
    "spawn-failed",
    "exited-before-healthy",
    "not-healthy-in-time",
  ]),
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message(): string {
    return `The local server did not start (${this.reason}).`;
  }
}

const HOST = "127.0.0.1";
const HEALTH_POLL_INTERVAL = Duration.millis(100);
const HEALTH_TIMEOUT = Duration.seconds(30);
const STOP_GRACE = Duration.seconds(5);

/** A port the OS just handed out and released; the server binds it a moment later. */
const findFreePort = Effect.callback<number, ServerStartError>((resume) => {
  const probe = NodeNet.createServer();
  probe.once("error", (cause) =>
    resume(Effect.fail(new ServerStartError({ reason: "no-free-port", cause }))),
  );
  probe.listen(0, HOST, () => {
    const address = probe.address();
    probe.close(() =>
      resume(
        address !== null && typeof address === "object"
          ? Effect.succeed(address.port)
          : Effect.fail(new ServerStartError({ reason: "no-free-port" })),
      ),
    );
  });
});

/** Polls until `origin` answers its health check, or fails after the timeout. */
export const waitUntilHealthy = Effect.fn("ServerProcess.waitUntilHealthy")(function* (
  origin: string,
  healthPath: string = HEALTH_PATH,
) {
  const url = new URL(healthPath, origin);
  const notHealthy = (cause?: unknown) =>
    new ServerStartError({ reason: "not-healthy-in-time", cause });
  yield* Effect.tryPromise({
    try: async (signal) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Health check answered ${response.status}.`);
    },
    catch: notHealthy,
  }).pipe(
    Effect.retry(Schedule.spaced(HEALTH_POLL_INTERVAL)),
    Effect.timeoutOrElse({
      duration: HEALTH_TIMEOUT,
      orElse: () => Effect.fail(notHealthy()),
    }),
  );
});

export interface ServerProcessOptions {
  /** Node, or Electron running as Node. */
  readonly executablePath: string;
  readonly entryPath: string;
  /** Added to the environment the server inherits. */
  readonly env: Readonly<Record<string, string>>;
  /** Called when a server that was up exits although nobody stopped it. */
  readonly onUnexpectedExit: (code: number | null) => void;
}

export interface ServerProcess {
  /** Origin the server answers on, e.g. `http://127.0.0.1:51234`. */
  readonly url: string;
  /** Synchronous, so a quit handler that cannot wait still stops the server. */
  readonly stop: () => void;
}

/** Starts the server on a free loopback port, waits until it answers, stops it with the scope. */
export const start: (
  options: ServerProcessOptions,
) => Effect.Effect<ServerProcess, ServerStartError, Scope.Scope> = Effect.fn("ServerProcess.start")(
  function* (options) {
    const port = yield* findFreePort;
    const url = `http://${HOST}:${port}`;
    let stopped = false;

    const child = yield* Effect.try({
      try: () =>
        NodeChildProcess.spawn(options.executablePath, [options.entryPath], {
          env: {
            ...process.env,
            ...options.env,
            GLOSE_HOST: HOST,
            GLOSE_PORT: String(port),
          },
          stdio: ["ignore", "inherit", "inherit"],
        }),
      catch: (cause) => new ServerStartError({ reason: "spawn-failed", cause }),
    });

    // Settles once the process is gone: it exited, or it never started.
    const gone = new Promise<{ readonly exitCode: number | null } | { readonly spawnError: Error }>(
      (resolve) => {
        child.once("exit", (exitCode) => resolve({ exitCode }));
        child.once("error", (spawnError) => resolve({ spawnError }));
      },
    );
    const stop = () => {
      stopped = true;
      child.kill();
    };

    yield* Effect.addFinalizer(() =>
      Effect.promise(() => {
        stop();
        return gone;
      }).pipe(
        Effect.timeoutOrElse({
          duration: STOP_GRACE,
          orElse: () => Effect.sync(() => child.kill("SIGKILL")),
        }),
      ),
    );

    const diedFirst = Effect.promise(() => gone).pipe(
      Effect.flatMap((end) =>
        Effect.fail(
          "spawnError" in end
            ? new ServerStartError({ reason: "spawn-failed", cause: end.spawnError })
            : new ServerStartError({ reason: "exited-before-healthy" }),
        ),
      ),
    );
    yield* Effect.raceFirst(waitUntilHealthy(url), diedFirst);

    void gone.then((end) => {
      if (!stopped && "exitCode" in end) options.onUnexpectedExit(end.exitCode);
    });

    return { url, stop };
  },
);

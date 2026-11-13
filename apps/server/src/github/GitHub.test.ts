import { type GitHubStatus, RemoteRefused } from "@glose/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as HttpClient from "effect/http/HttpClient";
import type * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";

import { Browser } from "../chatgpt/Browser.ts";
import * as ServerConfig from "../config.ts";
import { makeDirs } from "../testkit/graph.ts";
import { GitHub, layer } from "./GitHub.ts";
import { GitHubApi } from "./GitHubApi.ts";

const FAKE = {
  clientId: "Ov23-test",
  deviceCodeUrl: "https://github.test/login/device/code",
  tokenUrl: "https://github.test/login/oauth/access_token",
  apiUrl: "https://api.github.test",
  gitUrl: "https://github.test/",
};

interface Recorded {
  readonly method: string;
  readonly url: string;
  readonly body: string;
}

/** A scripted GitHub: answers queued per method and URL, and every request recorded. */
const withGitHub = <A, E>(
  test: (github: {
    readonly service: GitHub["Service"];
    readonly answer: (method: string, url: string, ...answers: ReadonlyArray<unknown>) => void;
    readonly requests: ReadonlyArray<Recorded>;
    readonly opened: ReadonlyArray<string>;
    readonly savedFile: string;
    readonly status: Effect.Effect<GitHubStatus>;
    /** Writes the sign-in of an earlier start of Glose. */
    readonly signedIn: (login: string, token: string) => Effect.Effect<void, unknown>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  api: typeof FAKE = FAKE,
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const queues = new Map<string, Array<{ status: number; body: unknown }>>();
    const requests: Array<Recorded> = [];
    const opened: Array<string> = [];
    const client = HttpClient.make((request: HttpClientRequest.HttpClientRequest, url) =>
      Effect.sync(() => {
        const target = `${url.origin}${url.pathname}`;
        const body =
          request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "";
        requests.push({ method: request.method, url: target, body });
        const answer = queues.get(`${request.method} ${target}`)?.shift() ?? {
          status: 404,
          body: { message: "Not Found" },
        };
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(answer.body), {
            status: answer.status,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
    // Built in the test's scope: the sign-in fiber lives as long as the service.
    const context = yield* Layer.build(
      layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            Layer.succeed(HttpClient.HttpClient, client),
            Layer.succeed(GitHubApi, api),
            Layer.succeed(Browser, { open: (url) => Effect.sync(() => void opened.push(url)) }),
            ServerConfig.layerTest(dirs),
          ),
        ),
      ),
    );
    const service = Context.get(context, GitHub);
    const savedFile = path.join(dirs.dataDir, "github.json");
    return yield* test({
      service,
      answer: (method, url, ...answers) =>
        queues.set(`${method} ${url}`, [
          ...(queues.get(`${method} ${url}`) ?? []),
          ...answers.map((body) =>
            typeof body === "object" && body !== null && "status" in body
              ? (body as { status: number; body: unknown })
              : { status: 200, body },
          ),
        ]),
      requests,
      opened,
      savedFile,
      status: Stream.runHead(service.status).pipe(Effect.map(Option.getOrThrow)),
      signedIn: (login, token) =>
        fs
          .makeDirectory(dirs.dataDir, { recursive: true })
          .pipe(Effect.andThen(fs.writeFileString(savedFile, JSON.stringify({ login, token })))),
    });
  }).pipe(Effect.scoped);

const DEVICE_CODE = {
  device_code: "device-1",
  user_code: "WDJB-MJHT",
  verification_uri: "https://github.test/login/device",
  expires_in: 900,
  interval: 5,
};

/** Lets the sign-in fiber run up to its next wait. */
const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 20 }));

/** The status once the sign-in ended, one way or the other; saving it takes real file work. */
const ended = (service: GitHub["Service"]) =>
  service.status.pipe(
    Stream.filter((status) => status._tag !== "Connecting"),
    Stream.runHead,
    Effect.map(Option.getOrThrow),
  );

it.layer(NodeServices.layer)("GitHub", (it) => {
  it.effect("connects with a code the user enters on GitHub, and signs git in as them", () =>
    withGitHub(({ service, answer, requests, opened, savedFile, status }) =>
      Effect.gen(function* () {
        answer("POST", FAKE.deviceCodeUrl, DEVICE_CODE);
        answer(
          "POST",
          FAKE.tokenUrl,
          { error: "authorization_pending" },
          { error: "slow_down", interval: 10 },
          { access_token: "gho_token", token_type: "bearer", scope: "repo" },
        );
        answer("GET", `${FAKE.apiUrl}/user`, { login: "jan" });

        yield* service.connect;
        yield* settle;
        assert.deepStrictEqual(yield* status, {
          _tag: "Connecting",
          userCode: "WDJB-MJHT",
          verificationUri: DEVICE_CODE.verification_uri,
        });
        assert.deepStrictEqual(opened, [DEVICE_CODE.verification_uri]);

        const polls = () => requests.filter((request) => request.url === FAKE.tokenUrl).length;
        yield* TestClock.adjust("5 seconds");
        yield* settle;
        yield* TestClock.adjust("5 seconds");
        yield* settle;
        assert.strictEqual(polls(), 2);
        // GitHub asked for a slower pace: the next poll waits 10 seconds.
        yield* TestClock.adjust("5 seconds");
        yield* settle;
        assert.strictEqual(polls(), 2);
        yield* TestClock.adjust("5 seconds");

        assert.deepStrictEqual(yield* ended(service), { _tag: "Connected", login: "jan" });
        const fs = yield* FileSystem.FileSystem;
        const info = yield* fs.stat(savedFile);
        if (process.platform !== "win32") assert.strictEqual(info.mode & 0o777, 0o600);
        assert.deepStrictEqual(yield* service.gitConfig, {
          "http.https://github.test/.extraHeader": `Authorization: Basic ${Buffer.from(
            "jan:gho_token",
          ).toString("base64")}`,
        });
      }),
    ),
  );

  it.effect("stays disconnected, and says why, when the user declines on GitHub", () =>
    withGitHub(({ service, answer }) =>
      Effect.gen(function* () {
        answer("POST", FAKE.deviceCodeUrl, DEVICE_CODE);
        answer("POST", FAKE.tokenUrl, { error: "access_denied" });

        yield* service.connect;
        yield* settle;
        yield* TestClock.adjust("5 seconds");

        assert.deepStrictEqual(yield* ended(service), {
          _tag: "Disconnected",
          problem: "declined",
        });
        assert.deepStrictEqual(yield* service.gitConfig, {});
      }),
    ),
  );

  it.effect("makes a private repository when the user has none of that name", () =>
    withGitHub(({ service, answer, requests, signedIn }) =>
      Effect.gen(function* () {
        yield* signedIn("jan", "gho_token");
        answer("POST", `${FAKE.apiUrl}/user/repos`, {
          status: 201,
          body: { private: true, clone_url: "https://github.test/jan/glose-graph.git" },
        });

        const url = yield* service.repository("glose-graph");

        assert.strictEqual(url, "https://github.test/jan/glose-graph.git");
        const made = requests.find((request) => request.method === "POST");
        assert.include(JSON.parse(made?.body ?? "{}"), { name: "glose-graph", private: true });
      }),
    ),
  );

  it.effect("uses the user's private repository of that name and refuses a public one", () =>
    withGitHub(({ service, answer, requests, signedIn }) =>
      Effect.gen(function* () {
        yield* signedIn("jan", "gho_token");
        answer(
          "GET",
          `${FAKE.apiUrl}/repos/jan/glose-graph`,
          { private: true, clone_url: "https://github.test/jan/glose-graph.git" },
          { private: false, clone_url: "https://github.test/jan/glose-graph.git" },
        );

        assert.strictEqual(
          yield* service.repository("glose-graph"),
          "https://github.test/jan/glose-graph.git",
        );
        const refused = yield* service.repository("glose-graph").pipe(Effect.flip);

        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "public-repository" }));
        assert.isUndefined(requests.find((request) => request.method === "POST"));
      }),
    ),
  );

  it.effect("lists the private repositories the user can read, Graphs first", () =>
    withGitHub(({ service, answer, signedIn }) =>
      Effect.gen(function* () {
        yield* signedIn("jan", "gho_token");
        const repo = (fullName: string, priv: boolean, pushedAt: string | null) => ({
          full_name: fullName,
          private: priv,
          clone_url: `https://github.test/${fullName}.git`,
          owner: { login: fullName.split("/")[0] },
          pushed_at: pushedAt,
        });
        // GitHub sends the latest pushed first.
        answer("GET", `${FAKE.apiUrl}/user/repos`, [
          repo("jan/dotfiles", true, "2026-11-13T08:00:00Z"),
          repo("jan/website", false, "2026-11-12T22:00:00Z"),
          repo("Jan/glose-graph", true, "2026-11-12T21:40:00Z"),
          repo("sample-reader/speciale-graf", true, "2026-11-09T16:05:00Z"),
          repo("jan/empty", true, null),
        ]);
        answer("GET", `${FAKE.apiUrl}/repos/Jan/glose-graph/contents/.glose/settings.json`, {});
        answer(
          "GET",
          `${FAKE.apiUrl}/repos/sample-reader/speciale-graf/contents/.glose/settings.json`,
          {},
        );

        const listed = yield* service.repositories;

        assert.deepStrictEqual(
          listed.map(({ fullName, shared, graph }) => ({ fullName, shared, graph })),
          [
            { fullName: "Jan/glose-graph", shared: false, graph: true },
            { fullName: "sample-reader/speciale-graf", shared: true, graph: true },
            { fullName: "jan/dotfiles", shared: false, graph: false },
            { fullName: "jan/empty", shared: false, graph: false },
          ],
          "no public repository; the owner's name matches without regard to case",
        );
        assert.deepStrictEqual(listed[0], {
          fullName: "Jan/glose-graph",
          owner: "Jan",
          url: "https://github.test/Jan/glose-graph.git",
          shared: false,
          graph: true,
          pushedAt: Date.parse("2026-11-12T21:40:00Z"),
        });
        assert.isNull(listed[3]?.pushedAt);
      }),
    ),
  );

  it.effect("finds an old Graph on a later page of repositories", () =>
    withGitHub(({ service, answer, signedIn }) =>
      Effect.gen(function* () {
        yield* signedIn("jan", "gho_token");
        const repo = (name: string) => ({
          full_name: `jan/${name}`,
          private: true,
          clone_url: `https://github.test/jan/${name}.git`,
          owner: { login: "jan" },
          pushed_at: "2026-11-01T00:00:00Z",
        });
        answer(
          "GET",
          `${FAKE.apiUrl}/user/repos`,
          Array.from({ length: 100 }, (_, i) => repo(`project-${i}`)),
          [repo("glose-graph")],
        );
        answer("GET", `${FAKE.apiUrl}/repos/jan/glose-graph/contents/.glose/settings.json`, {});

        const listed = yield* service.repositories;

        assert.lengthOf(listed, 101);
        assert.deepInclude(listed[0], { fullName: "jan/glose-graph", graph: true });
      }),
    ),
  );

  it.effect("lists nothing without a GitHub sign-in", () =>
    withGitHub(({ service, requests }) =>
      Effect.gen(function* () {
        const refused = yield* service.repositories.pipe(Effect.flip);
        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "github-not-connected" }));
        assert.lengthOf(requests, 0);
      }),
    ),
  );

  it.effect("forgets a sign-in that GitHub no longer accepts", () =>
    withGitHub(({ service, answer, savedFile, signedIn, status }) =>
      Effect.gen(function* () {
        yield* signedIn("jan", "gho_revoked");
        answer("GET", `${FAKE.apiUrl}/repos/jan/glose-graph`, {
          status: 401,
          body: { message: "Bad credentials" },
        });

        const refused = yield* service.repository("glose-graph").pipe(Effect.flip);

        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "github-not-connected" }));
        assert.deepStrictEqual(yield* status, { _tag: "Disconnected", problem: "expired" });
        assert.isFalse(yield* (yield* FileSystem.FileSystem).exists(savedFile));
      }),
    ),
  );

  it.effect("cannot connect in a build without a registered GitHub app", () =>
    withGitHub(
      ({ service, requests, status }) =>
        Effect.gen(function* () {
          yield* service.connect;
          assert.deepStrictEqual(yield* status, { _tag: "Unavailable" });
          assert.lengthOf(requests, 0);
        }),
      { ...FAKE, clientId: "" },
    ),
  );
});

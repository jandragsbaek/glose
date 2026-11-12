import {
  type GitHubProblem,
  type GitHubStatus,
  RemoteRefused,
  StorageError,
} from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import * as FileSystem from "effect/FileSystem";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import type * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import type * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { Browser } from "../chatgpt/Browser.ts";
import * as ServerConfig from "../config.ts";
import { writeFileAtomic } from "../storage.ts";
import { GitHubApi, SCOPE } from "./GitHubApi.ts";

export class GitHub extends Context.Service<
  GitHub,
  {
    /** The status now, then every change. */
    readonly status: Stream.Stream<GitHubStatus>;
    /** Asks GitHub for a code, opens GitHub's page for it, and returns; `status` follows. */
    readonly connect: Effect.Effect<void>;
    readonly cancel: Effect.Effect<void>;
    /** Forgets the sign-in on this computer. GitHub keeps the repository. */
    readonly disconnect: Effect.Effect<void, StorageError>;
    /**
     * The address of the user's private repository of this name, made first when it is missing.
     * A public repository of the name is refused.
     */
    readonly repository: (name: string) => Effect.Effect<string, RemoteRefused>;
    /** Git config that signs git in to GitHub over HTTPS as the connected account, or none. */
    readonly gitConfig: Effect.Effect<Readonly<Record<string, string>>>;
  }
>()("glose/github/GitHub") {}

/** The sign-in of this computer. A GitHub OAuth token does not expire until it is revoked. */
const Saved = Schema.Struct({ login: Schema.String, token: Schema.String });
type Saved = typeof Saved.Type;
const SavedJson = Schema.fromJsonString(Saved);
const decodeSaved = Schema.decodeUnknownEffect(SavedJson);
const encodeSaved = Schema.encodeEffect(SavedJson);

const DeviceCode = Schema.Struct({
  device_code: Schema.String,
  user_code: Schema.String,
  verification_uri: Schema.String,
  expires_in: Schema.Number,
  interval: Schema.Number,
});

/** GitHub answers a poll with 200 and either a token or an OAuth error. */
const PollAnswer = Schema.Struct({
  access_token: Schema.optionalKey(Schema.String),
  error: Schema.optionalKey(Schema.String),
  /** The new, longer wait after `slow_down`, in seconds. */
  interval: Schema.optionalKey(Schema.Number),
});

const decodeDeviceCode = Schema.decodeUnknownEffect(DeviceCode);
const decodePollAnswer = Schema.decodeUnknownEffect(PollAnswer);

const User = Schema.Struct({ login: Schema.String });
const Repository = Schema.Struct({ private: Schema.Boolean, clone_url: Schema.String });

/** A sign-in attempt that ended without a connection. */
class ConnectFailed extends Data.TaggedError("ConnectFailed")<{
  readonly problem: GitHubProblem;
  readonly detail: string;
}> {}

const failed = (detail: unknown) =>
  new ConnectFailed({ problem: "failed", detail: String(detail) });
const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });
const refused = (reason: RemoteRefused["reason"]) => new RemoteRefused({ reason });

/** GitHub's REST API asks every client to name itself. */
const USER_AGENT = "Glose";
/** GitHub's floor for the wait between polls, in seconds. */
const MIN_INTERVAL = 5;
/** `slow_down` without a new interval adds this many seconds. */
const SLOW_DOWN = 5;
const REQUEST_TIMEOUT = "30 seconds";

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDir } = yield* ServerConfig.ServerConfig;
  const api = yield* GitHubApi;
  const browser = yield* Browser;
  const http = yield* HttpClient.HttpClient;
  const file = path.join(dataDir, "github.json");
  const lock = yield* Semaphore.make(1);

  const read = lock
    .withPermit(
      Effect.gen(function* () {
        if (!(yield* fs.exists(file))) return null;
        return yield* fs.readFileString(file).pipe(Effect.flatMap(decodeSaved));
      }),
    )
    .pipe(Effect.mapError(storageError));

  /** Only the owner may read the file: it holds a token that can push to their repositories. */
  const write = (saved: Saved | null) =>
    lock
      .withPermit(
        saved === null
          ? fs.remove(file, { force: true })
          : Effect.gen(function* () {
              yield* fs.makeDirectory(dataDir, { recursive: true });
              yield* writeFileAtomic(fs, file, yield* encodeSaved(saved), { mode: 0o600 });
            }),
      )
      .pipe(Effect.mapError(storageError));

  const statusOf = (saved: Saved | null, problem: GitHubProblem | null): GitHubStatus => {
    if (api.clientId === "") return { _tag: "Unavailable" };
    return saved === null
      ? { _tag: "Disconnected", problem }
      : { _tag: "Connected", login: saved.login };
  };

  const status = yield* SubscriptionRef.make<GitHubStatus>(
    statusOf(yield* read.pipe(Effect.orElseSucceed(() => null)), null),
  );
  const attempt = yield* FiberHandle.make<void, never>();

  const publish = (problem: GitHubProblem | null) =>
    read.pipe(
      Effect.flatMap((saved) => SubscriptionRef.set(status, statusOf(saved, problem))),
      Effect.catch(() => SubscriptionRef.set(status, statusOf(null, "failed"))),
    );

  const postForm = (url: string, form: Record<string, string>) =>
    http
      .execute(
        HttpClientRequest.post(url).pipe(
          HttpClientRequest.acceptJson,
          HttpClientRequest.setHeader("User-Agent", USER_AGENT),
          HttpClientRequest.bodyUrlParams(form),
        ),
      )
      .pipe(
        Effect.flatMap((response) => response.json),
        Effect.timeout(REQUEST_TIMEOUT),
        Effect.mapError(failed),
      );

  const apiRequest = (token: string, request: HttpClientRequest.HttpClientRequest) =>
    http
      .execute(
        request.pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.setHeaders({
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": USER_AGENT,
          }),
        ),
      )
      .pipe(Effect.timeout(REQUEST_TIMEOUT));

  const decodeUser = Schema.decodeUnknownEffect(User);
  const decodeRepository = Schema.decodeUnknownEffect(Repository);

  /**
   * GitHub's device flow: Glose shows a code, the user enters it on github.com, and Glose asks
   * every few seconds until GitHub answers with a token or the code expires.
   */
  const signIn = Effect.gen(function* () {
    const code = yield* postForm(api.deviceCodeUrl, { client_id: api.clientId, scope: SCOPE }).pipe(
      Effect.flatMap(decodeDeviceCode),
      Effect.mapError(failed),
    );
    yield* SubscriptionRef.set(status, {
      _tag: "Connecting",
      userCode: code.user_code,
      verificationUri: code.verification_uri,
    });
    yield* browser.open(code.verification_uri);

    const deadline = (yield* Clock.currentTimeMillis) + code.expires_in * 1000;
    let interval = Math.max(code.interval, MIN_INTERVAL);
    let token: string | undefined;
    while (token === undefined) {
      yield* Effect.sleep(Duration.seconds(interval));
      if ((yield* Clock.currentTimeMillis) >= deadline) {
        return yield* new ConnectFailed({ problem: "timed-out", detail: "code expired" });
      }
      const answer = yield* postForm(api.tokenUrl, {
        client_id: api.clientId,
        device_code: code.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }).pipe(
        Effect.flatMap(decodePollAnswer),
        // A lost answer is asked again at the next poll; the deadline still ends the attempt.
        Effect.orElseSucceed(() => ({ error: "authorization_pending" }) as typeof PollAnswer.Type),
      );
      if (answer.access_token !== undefined) token = answer.access_token;
      else if (answer.error === "authorization_pending") continue;
      else if (answer.error === "slow_down") interval = answer.interval ?? interval + SLOW_DOWN;
      else if (answer.error === "expired_token") {
        return yield* new ConnectFailed({ problem: "timed-out", detail: "code expired" });
      } else if (answer.error === "access_denied") {
        return yield* new ConnectFailed({ problem: "declined", detail: "access denied" });
      } else return yield* failed(`device flow error ${answer.error ?? "without a token"}`);
    }

    const signedIn: string = token;
    const user = yield* apiRequest(signedIn, HttpClientRequest.get(`${api.apiUrl}/user`)).pipe(
      Effect.filterOrFail(
        (response) => response.status === 200,
        (response) => `GitHub answered ${response.status}`,
      ),
      Effect.flatMap((response) => response.json),
      Effect.flatMap(decodeUser),
      Effect.mapError(failed),
    );
    yield* write({ login: user.login, token: signedIn }).pipe(Effect.mapError(failed));
  });

  const runAttempt = signIn.pipe(
    Effect.andThen(publish(null)),
    Effect.catchTags({
      ConnectFailed: (error) =>
        Effect.logWarning("GitHub sign-in failed", error.detail).pipe(
          Effect.andThen(publish(error.problem)),
        ),
    }),
    Effect.onInterrupt(() => publish(null)),
  );

  /** GitHub no longer accepts the token: forget it, and ask the user to connect again. */
  const expired = write(null).pipe(Effect.ignore, Effect.andThen(publish("expired")));

  const repository = Effect.fn("GitHub.repository")(function* (name: string) {
    const saved = yield* read.pipe(Effect.orElseSucceed(() => null));
    if (saved === null) return yield* refused("github-not-connected");
    const call = (request: HttpClientRequest.HttpClientRequest) =>
      apiRequest(saved.token, request).pipe(
        Effect.tapError((error) => Effect.logWarning("GitHub did not answer", error)),
        Effect.mapError(() => refused("github-failed")),
      );
    const usable = (response: HttpClientResponse.HttpClientResponse) =>
      response.json.pipe(
        Effect.flatMap(decodeRepository),
        Effect.mapError(() => refused("github-failed")),
        Effect.flatMap((repo) =>
          repo.private ? Effect.succeed(repo.clone_url) : Effect.fail(refused("public-repository")),
        ),
      );
    const unexpected = (response: HttpClientResponse.HttpClientResponse) =>
      response.status === 401
        ? expired.pipe(Effect.andThen(Effect.fail(refused("github-not-connected"))))
        : Effect.logWarning(`GitHub answered ${response.status}`).pipe(
            Effect.andThen(Effect.fail(refused("github-failed"))),
          );

    const found = yield* call(
      HttpClientRequest.get(
        `${api.apiUrl}/repos/${encodeURIComponent(saved.login)}/${encodeURIComponent(name)}`,
      ),
    );
    if (found.status === 200) return yield* usable(found);
    if (found.status !== 404) return yield* unexpected(found);

    const made = yield* call(
      HttpClientRequest.post(`${api.apiUrl}/user/repos`).pipe(
        HttpClientRequest.bodyJsonUnsafe({
          name,
          private: true,
          description: "Versions of a Glose Graph",
          has_issues: false,
          has_projects: false,
          has_wiki: false,
        }),
      ),
    );
    return made.status === 201 ? yield* usable(made) : yield* unexpected(made);
  });

  return GitHub.of({
    status: SubscriptionRef.changes(status),
    connect:
      api.clientId === ""
        ? Effect.void
        : // The old attempt finishes interrupting first, so its status cannot land after the new one.
          FiberHandle.clear(attempt).pipe(
            Effect.andThen(FiberHandle.run(attempt, runAttempt)),
            Effect.asVoid,
          ),
    cancel: FiberHandle.clear(attempt),
    disconnect: Effect.gen(function* () {
      yield* FiberHandle.clear(attempt);
      yield* write(null);
      yield* publish(null);
    }),
    repository,
    gitConfig: read.pipe(
      Effect.map((saved): Readonly<Record<string, string>> =>
        saved === null
          ? {}
          : {
              [`http.${api.gitUrl}.extraHeader`]: `Authorization: Basic ${Buffer.from(
                `${saved.login}:${saved.token}`,
              ).toString("base64")}`,
            },
      ),
      Effect.orElseSucceed(() => ({})),
    ),
  });
});

export const layer = Layer.effect(GitHub, make);

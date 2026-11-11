import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Redacted from "effect/Redacted";
import * as Stream from "effect/Stream";
import * as NodeCrypto from "node:crypto";

import * as ServerConfig from "../config.ts";
import * as Server from "../server.ts";
import { writeCredentials } from "../testkit/credentials.ts";
import { makeDirs } from "../testkit/graph.ts";
import { FAKE_OPENAI, makeFakeOpenAi } from "../testkit/openai.ts";
import { Browser } from "./Browser.ts";
import { ChatGpt } from "./ChatGpt.ts";

type FakeOpenAi = Effect.Success<typeof makeFakeOpenAi>;

/**
 * The user in the browser: signs in as `sub` and is sent back to Glose's loopback callback,
 * as OpenAI's redirect would. `decline` answers as a user who says no.
 */
const browserUser = (
  fake: FakeOpenAi,
  user: { readonly sub: string; readonly email: string; readonly decline?: boolean },
) => {
  const opened: Array<URL> = [];
  const open = (url: string) =>
    Effect.gen(function* () {
      const authorize = new URL(url);
      opened.push(authorize);
      const query = authorize.searchParams;
      const issued = query.get("client_id") === "dynamic_agent_client" ? "oaiapp_issued" : null;
      const clientId = issued ?? query.get("client_id") ?? "";
      fake.answer(FAKE_OPENAI.tokenUrl, {
        status: 200,
        body: {
          access_token: "access-1",
          refresh_token: "refresh-1",
          id_token: yield* fake.idToken({
            clientId,
            sub: user.sub,
            email: user.email,
            nonce: query.get("nonce") ?? "",
          }),
          expires_in: 3600,
          scope: query.get("scope"),
        },
      });
      const back = new URL(query.get("redirect_uri") ?? "");
      back.searchParams.set("state", query.get("state") ?? "");
      if (user.decline) back.searchParams.set("error", "access_denied");
      else back.searchParams.set("code", "code-1");
      if (issued) back.searchParams.set("client_id", issued);
      yield* Effect.forkDetach(Effect.promise(() => fetch(back)));
    }).pipe(Effect.orDie);
  return { opened, layer: Layer.succeed(Browser, { open }) };
};

/** One computer with its own folders, the real services, and a fake OpenAI (and user). */
const onComputer =
  (dirs: { readonly dataDir: string; readonly homeDir: string }, fakes: Layer.Layer<any>) =>
  <A, E>(effect: Effect.Effect<A, E, ChatGpt>) =>
    effect.pipe(
      Effect.provide(
        Server.layerApp.pipe(
          Layer.provide(fakes),
          Layer.provide(NodeServices.layer),
          Layer.provide(ServerConfig.layerTest(dirs)),
        ),
      ),
    );

/** Starts a sign-in and waits until it ends, one way or the other. */
const signIn = (account: "new" | "saved") =>
  Effect.gen(function* () {
    const chatGpt = yield* ChatGpt;
    yield* chatGpt.connect({ account, consent: false });
    return yield* chatGpt.status.pipe(
      Stream.filter(
        (status) =>
          status._tag === "Connected" ||
          (status._tag === "Disconnected" && status.problem !== null),
      ),
      Stream.runHead,
    );
  });

it.layer(NodeServices.layer)("ChatGpt", (it) => {
  it.effect("signs in, registers Glose as a new client and keeps the tokens for this host", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fake = yield* makeFakeOpenAi;
      const user = browserUser(fake, { sub: "user-1", email: "reader@example.com" });
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const [status, token] = yield* Effect.gen(function* () {
        const status = yield* signIn("new");
        return [status, yield* (yield* ChatGpt).accessToken] as const;
      }).pipe(onComputer(dirs, Layer.mergeAll(fake.layer, user.layer)));

      assert.deepStrictEqual(status._tag === "Some" ? status.value : null, {
        _tag: "Connected",
        email: "reader@example.com",
        planUsage: true,
        planNoticeSeen: false,
      });
      assert.strictEqual(Redacted.value(token), "access-1");

      const file = path.join(dirs.dataDir, "chatgpt.json");
      const saved = JSON.parse(yield* fs.readFileString(file));
      const [authorize] = user.opened;
      const query = authorize!.searchParams;
      assert.strictEqual(query.get("client_id"), "dynamic_agent_client");
      assert.strictEqual(query.get("agent_name_hint"), "Glose");
      assert.strictEqual(query.get("ext_agent_host_id"), saved.hostId);
      assert.match(saved.hostId, /^urn:uuid:/);
      assert.strictEqual(query.get("resource"), FAKE_OPENAI.apiUrl);
      assert.include(query.get("scope") ?? "", "chatgpt.tokens.use.direct");
      assert.strictEqual(saved.accounts[0].clientId, "oaiapp_issued");

      // The code exchange proves the PKCE verifier and repeats the exact callback address.
      const exchange = new URLSearchParams(
        fake.requests.find((request) => request.url === FAKE_OPENAI.tokenUrl)!.body,
      );
      assert.strictEqual(exchange.get("client_id"), "oaiapp_issued");
      assert.strictEqual(exchange.get("redirect_uri"), query.get("redirect_uri"));
      assert.strictEqual(
        NodeCrypto.createHash("sha256")
          .update(exchange.get("code_verifier") ?? "")
          .digest("base64url"),
        query.get("code_challenge"),
      );
      if (process.platform !== "win32") {
        assert.strictEqual((yield* fs.stat(file)).mode & 0o777, 0o600);
      }
    }).pipe(Effect.scoped),
  );

  it.effect("signs in again with the saved client after signing out, and revokes on sign-out", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fake = yield* makeFakeOpenAi;
      const user = browserUser(fake, { sub: "user-1", email: "reader@example.com" });
      yield* writeCredentials(dirs, {
        hostId: "urn:uuid:host-1",
        active: "user-1",
        accounts: [
          {
            subject: "user-1",
            email: "reader@example.com",
            clientId: "oaiapp_saved",
            tokens: {
              idToken: "old-id",
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: 10_000_000,
              scopes: ["chatgpt.tokens.use.direct"],
            },
            planNoticeSeen: true,
          },
        ],
      });
      fake.answer(FAKE_OPENAI.revokeUrl, { status: 200, body: {} });

      const { revoked, status } = yield* Effect.gen(function* () {
        const chatGpt = yield* ChatGpt;
        const { revoked } = yield* chatGpt.disconnect;
        return { revoked, status: yield* signIn("saved") };
      }).pipe(onComputer(dirs, Layer.mergeAll(fake.layer, user.layer)));

      assert.isTrue(revoked);
      const revocation = new URLSearchParams(
        fake.requests.find((request) => request.url === FAKE_OPENAI.revokeUrl)!.body,
      );
      assert.strictEqual(revocation.get("token"), "old-refresh");
      assert.strictEqual(revocation.get("client_id"), "oaiapp_saved");

      const query = user.opened[0]!.searchParams;
      assert.strictEqual(query.get("client_id"), "oaiapp_saved");
      assert.strictEqual(query.get("ext_agent_host_id"), "urn:uuid:host-1");
      assert.strictEqual(query.get("login_hint"), "reader@example.com");
      assert.isNull(query.get("agent_name_hint"));
      // Signed out: the old ID token no longer names the account.
      assert.isNull(query.get("id_token_hint"));
      assert.strictEqual(status._tag === "Some" ? status.value._tag : null, "Connected");
    }).pipe(Effect.scoped),
  );

  it.effect("stays disconnected and exchanges no code when the user declines", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fake = yield* makeFakeOpenAi;
      const user = browserUser(fake, { sub: "user-1", email: "a@example.com", decline: true });
      const status = yield* signIn("new").pipe(
        onComputer(dirs, Layer.mergeAll(fake.layer, user.layer)),
      );
      assert.deepStrictEqual(status._tag === "Some" ? status.value : null, {
        _tag: "Disconnected",
        email: null,
        problem: "declined",
      });
      assert.isFalse(fake.requests.some((request) => request.url === FAKE_OPENAI.tokenUrl));
    }).pipe(Effect.scoped),
  );

  it.effect("refreshes an access token near expiry and keeps the rotated refresh token", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fake = yield* makeFakeOpenAi;
      yield* writeCredentials(dirs, connectedAccount({ expiresAt: 0 }));
      fake.answer(FAKE_OPENAI.tokenUrl, {
        status: 200,
        body: { access_token: "access-2", refresh_token: "refresh-2", expires_in: 3600 },
      });
      const token = yield* ChatGpt.use((chatGpt) => chatGpt.accessToken).pipe(
        onComputer(dirs, fake.layer),
      );
      assert.strictEqual(Redacted.value(token), "access-2");
      const refresh = new URLSearchParams(fake.requests[0]!.body);
      assert.strictEqual(refresh.get("grant_type"), "refresh_token");
      assert.strictEqual(refresh.get("client_id"), "oaiapp_saved");
      assert.strictEqual(refresh.get("refresh_token"), "refresh-1");
      assert.strictEqual(refresh.get("resource"), FAKE_OPENAI.apiUrl);
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const saved = JSON.parse(yield* fs.readFileString(path.join(dirs.dataDir, "chatgpt.json")));
      assert.strictEqual(saved.accounts[0].tokens.refreshToken, "refresh-2");
    }).pipe(Effect.scoped),
  );

  it.effect("asks to sign in again when the refresh token can never work again", () =>
    Effect.gen(function* () {
      const dirs = yield* makeDirs;
      const fake = yield* makeFakeOpenAi;
      yield* writeCredentials(dirs, connectedAccount({ expiresAt: 0 }));
      fake.answer(FAKE_OPENAI.tokenUrl, { status: 400, body: { error: "invalid_grant" } });
      const { error, status } = yield* Effect.gen(function* () {
        const chatGpt = yield* ChatGpt;
        const error = yield* Effect.flip(chatGpt.accessToken);
        return { error, status: yield* Stream.runHead(chatGpt.status) };
      }).pipe(onComputer(dirs, fake.layer));
      assert.strictEqual(error.reason, "not-connected");
      assert.deepStrictEqual(status._tag === "Some" ? status.value : null, {
        _tag: "Disconnected",
        email: "reader@example.com",
        problem: "expired",
      });
    }).pipe(Effect.scoped),
  );
});

const connectedAccount = (tokens: { readonly expiresAt: number }) => ({
  hostId: "urn:uuid:host-1",
  active: "user-1",
  accounts: [
    {
      subject: "user-1",
      email: "reader@example.com",
      clientId: "oaiapp_saved",
      tokens: {
        idToken: "id-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: tokens.expiresAt,
        scopes: ["openid", "chatgpt.tokens.use.direct"],
      },
      planNoticeSeen: true,
    },
  ],
});

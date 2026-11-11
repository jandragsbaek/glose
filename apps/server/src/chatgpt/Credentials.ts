import { StorageError } from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as NodeCrypto from "node:crypto";

import * as ServerConfig from "../config.ts";
import { writeFileAtomic } from "../storage.ts";

/** Tokens of one signed-in account; all null after signing out. */
export const Tokens = Schema.Struct({
  idToken: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.String,
  /** When the access token expires, in epoch milliseconds. */
  expiresAt: Schema.Number,
  scopes: Schema.Array(Schema.String),
});
export type Tokens = typeof Tokens.Type;

/**
 * One ChatGPT account that approved Glose. The issued client ID is kept after signing out, so
 * signing in again to the same account reuses the registration.
 */
export const Account = Schema.Struct({
  /** The verified `sub` of the account's ID token. */
  subject: Schema.String,
  email: Schema.String,
  clientId: Schema.String,
  tokens: Schema.NullOr(Tokens),
  planNoticeSeen: Schema.Boolean,
});
export type Account = typeof Account.Type;

export const CredentialsData = Schema.Struct({
  /** This computer's opaque host ID; OpenAI counts usage per host. */
  hostId: Schema.String,
  /** The subject of the account in use, or null. */
  active: Schema.NullOr(Schema.String),
  accounts: Schema.Array(Account),
});
export type CredentialsData = typeof CredentialsData.Type;

const CredentialsJson = Schema.fromJsonString(CredentialsData);
const decode = Schema.decodeUnknownEffect(CredentialsJson);
const encode = Schema.encodeEffect(CredentialsJson);

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

/** The active account, if one is chosen. */
export const activeAccount = (data: CredentialsData): Account | undefined =>
  data.accounts.find((account) => account.subject === data.active);

/** Replaces one account by subject, or adds it. */
export const putAccount = (data: CredentialsData, account: Account): CredentialsData => ({
  ...data,
  accounts: [...data.accounts.filter((other) => other.subject !== account.subject), account],
});

/**
 * The ChatGPT credentials of this computer, in `chatgpt.json` beside the computer settings.
 * They never go into the Graph folder, which may be shared. Only the owner may read the file.
 */
export class Credentials extends Context.Service<
  Credentials,
  {
    readonly get: Effect.Effect<CredentialsData, StorageError>;
    /** Reads, changes and writes the file as one step; concurrent updates wait their turn. */
    readonly update: (
      change: (data: CredentialsData) => CredentialsData,
    ) => Effect.Effect<CredentialsData, StorageError>;
  }
>()("glose/chatgpt/Credentials") {}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDir } = yield* ServerConfig.ServerConfig;
  const file = path.join(dataDir, "chatgpt.json");
  const lock = yield* Semaphore.make(1);

  const write = Effect.fn("Credentials.write")(function* (data: CredentialsData) {
    yield* fs.makeDirectory(dataDir, { recursive: true });
    yield* writeFileAtomic(fs, file, yield* encode(data), { mode: 0o600 });
  }, Effect.mapError(storageError));

  /** A first read makes the file, so the host ID exists before the first sign-in. */
  const read = Effect.gen(function* () {
    if (yield* fs.exists(file).pipe(Effect.mapError(storageError))) {
      return yield* fs
        .readFileString(file)
        .pipe(Effect.flatMap(decode), Effect.mapError(storageError));
    }
    const fresh: CredentialsData = {
      hostId: `urn:uuid:${NodeCrypto.randomUUID()}`,
      active: null,
      accounts: [],
    };
    yield* write(fresh);
    return fresh;
  });

  return Credentials.of({
    get: lock.withPermit(read),
    update: (change) =>
      lock.withPermit(
        Effect.gen(function* () {
          const next = change(yield* read);
          yield* write(next);
          return next;
        }),
      ),
  });
});

export const layer = Layer.effect(Credentials, make);

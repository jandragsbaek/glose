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

export const Tokens = Schema.Struct({
  idToken: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.String,
  expiresAt: Schema.Number,
  scopes: Schema.Array(Schema.String),
});
export type Tokens = typeof Tokens.Type;

export const Account = Schema.Struct({
  subject: Schema.String,
  email: Schema.String,
  clientId: Schema.String,
  tokens: Schema.NullOr(Tokens),
  planNoticeSeen: Schema.Boolean,
});
export type Account = typeof Account.Type;

export const CredentialsData = Schema.Struct({
  hostId: Schema.String,
  active: Schema.NullOr(Schema.String),
  accounts: Schema.Array(Account),
});
export type CredentialsData = typeof CredentialsData.Type;

const CredentialsJson = Schema.fromJsonString(CredentialsData);
const decode = Schema.decodeUnknownEffect(CredentialsJson);
const encode = Schema.encodeEffect(CredentialsJson);

const storageError = (cause: unknown) => new StorageError({ detail: String(cause) });

export const activeAccount = (data: CredentialsData): Account | undefined =>
  data.accounts.find((account) => account.subject === data.active);

export const putAccount = (data: CredentialsData, account: Account): CredentialsData => ({
  ...data,
  accounts: [...data.accounts.filter((other) => other.subject !== account.subject), account],
});

export class Credentials extends Context.Service<
  Credentials,
  {
    readonly get: Effect.Effect<CredentialsData, StorageError>;
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

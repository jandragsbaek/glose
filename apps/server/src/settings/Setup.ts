import {
  type CompleteSetup,
  type VaultFolderUnavailable,
  VaultRemoteUnavailable,
  type SettingsView,
  type StorageError,
} from "@glose/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import { GitHub } from "../github/GitHub.ts";
import * as VaultFolder from "../vault/VaultFolder.ts";
import { Git, type GitFailed, type GitMissing } from "../versions/Git.ts";
import { Settings } from "./Settings.ts";

export class Setup extends Context.Service<
  Setup,
  {
    readonly complete: (
      input: CompleteSetup,
    ) => Effect.Effect<
      SettingsView,
      VaultFolderUnavailable | VaultRemoteUnavailable | StorageError
    >;
    readonly checkRemote: (url: string) => Effect.Effect<void, VaultRemoteUnavailable>;
  }
>()("glose/settings/Setup") {}

const CLONE_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_TIMEOUT_MS = 2 * 60 * 1000;

const remoteFailed = (error: GitFailed | GitMissing) =>
  new VaultRemoteUnavailable({
    reason: error._tag === "GitMissing" ? "no-git" : "unreachable",
  });

export const make = Effect.gen(function* () {
  const settings = yield* Settings;
  const git = yield* Git;
  const github = yield* GitHub;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { homeDir } = yield* ServerConfig.ServerConfig;
  const vaultFolders = VaultFolder.make(fs, path);

  const network = (timeoutMs: number) =>
    github.gitConfig.pipe(Effect.map((config) => ({ timeoutMs, config })));

  const clone = Effect.fn("Setup.clone")(function* (url: string, folder: string) {
    if (url === "") return yield* new VaultRemoteUnavailable({ reason: "unreachable" });
    const made = yield* vaultFolders.prepareEmpty(folder);
    yield* git
      .run(homeDir, ["clone", "--quiet", "--", url, folder], yield* network(CLONE_TIMEOUT_MS))
      .pipe(
        Effect.tapError((error) => Effect.logWarning("Glose could not copy the Vault", error)),
        Effect.mapError(remoteFailed),
        Effect.tapError(() =>
          made
            ? fs.remove(folder, { recursive: true, force: true }).pipe(Effect.ignore)
            : Effect.void,
        ),
      );
  });

  return Setup.of({
    complete: Effect.fn("Setup.complete")(function* ({ language, vaultFolder, action, remote }) {
      if (action !== "clone")
        return yield* settings.completeSetup({ language, vaultFolder, action });
      const folder = vaultFolder.trim();
      yield* clone(remote?.trim() ?? "", folder);
      return yield* settings.completeSetup({ language, vaultFolder: folder, action: "open" });
    }),
    checkRemote: Effect.fn("Setup.checkRemote")(function* (url: string) {
      yield* git
        .run(homeDir, ["ls-remote", "--heads", "--", url], yield* network(CHECK_TIMEOUT_MS))
        .pipe(
          Effect.tapError((error) => Effect.logWarning("Glose could not reach the remote", error)),
          Effect.mapError(remoteFailed),
        );
    }),
  });
});

export const layer = Layer.effect(Setup, make);

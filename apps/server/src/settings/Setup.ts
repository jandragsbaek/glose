import {
  type CompleteSetup,
  type GraphFolderUnavailable,
  GraphRemoteUnavailable,
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
import * as GraphFolder from "../graph/GraphFolder.ts";
import { Git, type GitFailed, type GitMissing } from "../versions/Git.ts";
import { Settings } from "./Settings.ts";

/** The first start: a new Graph, a folder on this computer, or a Graph copied from a remote. */
export class Setup extends Context.Service<
  Setup,
  {
    /**
     * Completes the first start. `clone` copies the Graph into a folder that is missing or empty;
     * the remote stays its `origin`, so Versions sync with it from then on.
     */
    readonly complete: (
      input: CompleteSetup,
    ) => Effect.Effect<
      SettingsView,
      GraphFolderUnavailable | GraphRemoteUnavailable | StorageError
    >;
    /** Checks that git on this computer can read a remote, with the user's own git sign-in. */
    readonly checkRemote: (url: string) => Effect.Effect<void, GraphRemoteUnavailable>;
  }
>()("glose/settings/Setup") {}

/** A large Graph with years of Versions takes a while to copy over a slow line. */
const CLONE_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_TIMEOUT_MS = 2 * 60 * 1000;

const remoteFailed = (error: GitFailed | GitMissing) =>
  new GraphRemoteUnavailable({
    reason: error._tag === "GitMissing" ? "no-git" : "unreachable",
  });

export const make = Effect.gen(function* () {
  const settings = yield* Settings;
  const git = yield* Git;
  const github = yield* GitHub;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { homeDir } = yield* ServerConfig.ServerConfig;
  const graphFolders = GraphFolder.make(fs, path);

  /** The GitHub sign-in goes along for a GitHub address; any other uses the user's own git. */
  const network = (timeoutMs: number) =>
    github.gitConfig.pipe(Effect.map((config) => ({ timeoutMs, config })));

  const clone = Effect.fn("Setup.clone")(function* (url: string, folder: string) {
    if (url === "") return yield* new GraphRemoteUnavailable({ reason: "unreachable" });
    const made = yield* graphFolders.prepareEmpty(folder);
    yield* git
      .run(homeDir, ["clone", "--quiet", "--", url, folder], yield* network(CLONE_TIMEOUT_MS))
      .pipe(
        Effect.tapError((error) => Effect.logWarning("Glose could not copy the Graph", error)),
        Effect.mapError(remoteFailed),
        // Git cleans up what it copied; a folder Glose made for the copy goes too.
        Effect.tapError(() =>
          made
            ? fs.remove(folder, { recursive: true, force: true }).pipe(Effect.ignore)
            : Effect.void,
        ),
      );
  });

  return Setup.of({
    complete: Effect.fn("Setup.complete")(function* ({ language, graphFolder, action, remote }) {
      if (action !== "clone")
        return yield* settings.completeSetup({ language, graphFolder, action });
      const folder = graphFolder.trim();
      yield* clone(remote?.trim() ?? "", folder);
      // A copied repository without Glose's settings file becomes a Graph as it is.
      return yield* settings.completeSetup({ language, graphFolder: folder, action: "open" });
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

import { RemoteRefused, type VersionsStatus } from "@glose/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";

import * as ServerConfig from "../config.ts";
import { GitHub } from "../github/GitHub.ts";
import * as Settings from "../settings/Settings.ts";
import { makeDirs } from "../testkit/services.ts";
import * as Git from "./Git.ts";
import * as Versions from "./Versions.ts";

const MINUTE = 60_000;
const OTHER = ["-c", "user.name=Other computer", "-c", "user.email=other@example.com"];

const withVault = <A, E>(
  test: (vault: {
    readonly folder: string;
    readonly remote: string;
    readonly git: (cwd: string, ...args: ReadonlyArray<string>) => Effect.Effect<string, unknown>;
    readonly write: (relative: string, text: string) => Effect.Effect<void, unknown>;
    readonly read: (relative: string) => Effect.Effect<string, unknown>;
    readonly start: Effect.Effect<
      Versions.Versions["Service"],
      unknown,
      FileSystem.FileSystem | Path.Path
    >;
    readonly status: (versions: Versions.Versions["Service"]) => Effect.Effect<VersionsStatus>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  options: { readonly vaultFolder?: (homeDir: string) => string } = {},
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = options.vaultFolder?.(dirs.homeDir) ?? path.join(dirs.homeDir, "Glose");
    const remote = path.join(dirs.homeDir, "remote.git");
    const globalConfig = path.join(dirs.homeDir, "gitconfig");
    yield* fs.writeFileString(globalConfig, "");
    const runner = Git.make({ GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: "1" });
    const git = (cwd: string, ...args: ReadonlyArray<string>) =>
      runner.run(cwd, args).pipe(Effect.map((text) => text.trim()));

    const github = GitHub.of({
      status: Stream.empty,
      connect: Effect.void,
      cancel: Effect.void,
      disconnect: Effect.void,
      repository: () => Effect.succeed(remote),
      repositories: Effect.succeed([]),
      gitConfig: Effect.succeed({}),
    });
    const deps = Layer.mergeAll(
      Settings.layer,
      Git.layerTest(globalConfig),
      Layer.succeed(GitHub, github),
    ).pipe(Layer.provideMerge(ServerConfig.layerTest(dirs)));
    const start = Versions.make.pipe(Effect.provide(deps));
    yield* Effect.gen(function* () {
      const settings = yield* Settings.Settings;
      yield* settings.completeSetup({ language: "en", vaultFolder: folder, action: "create" });
    }).pipe(Effect.provide(deps));

    return yield* test({
      folder,
      remote,
      git,
      write: (relative, text) =>
        fs
          .makeDirectory(path.dirname(path.join(folder, relative)), { recursive: true })
          .pipe(Effect.andThen(fs.writeFileString(path.join(folder, relative), text))),
      read: (relative) => fs.readFileString(path.join(folder, relative)),
      start,
      status: (versions) => Stream.runHead(versions.status).pipe(Effect.map(Option.getOrThrow)),
    });
  }).pipe(Effect.scoped);

const on = (status: VersionsStatus) => {
  assert.strictEqual(status._tag, "On");
  return status as Extract<VersionsStatus, { _tag: "On" }>;
};

it.layer(NodeServices.layer)("Versions", (it) => {
  it.effect("starts a repository in a new Vault and saves what is there as its first Version", () =>
    withVault(({ folder, git, read, start, status }) =>
      Effect.gen(function* () {
        const versions = yield* start;
        yield* versions.tick;

        const now = on(yield* status(versions));
        assert.isNotNull(now.savedAt);
        assert.isFalse(now.unsaved);
        assert.isNull(now.remote);
        assert.isNull(now.problem);
        assert.include(yield* read(".gitignore"), "*.glose-tmp");
        assert.strictEqual(
          yield* git(folder, "log", "--format=%s"),
          "Auto-save: 2 files",
          "the Vault settings and the .gitignore",
        );
      }),
    ),
  );

  it.effect("saves a change once the Vault folder has been quiet for five minutes", () =>
    withVault(({ folder, git, write, start, status }) =>
      Effect.gen(function* () {
        const versions = yield* start;
        yield* versions.tick;
        yield* write("A Note.md", "First words.\n");

        yield* versions.tick;
        assert.isTrue(on(yield* status(versions)).unsaved);

        yield* TestClock.adjust(4 * MINUTE);
        yield* write("A Note.md", "First words, and more.\n");
        yield* versions.tick;
        yield* TestClock.adjust(4 * MINUTE);
        yield* versions.tick;
        assert.strictEqual(yield* git(folder, "rev-list", "--count", "HEAD"), "1");

        yield* TestClock.adjust(MINUTE);
        yield* versions.tick;
        assert.isFalse(on(yield* status(versions)).unsaved);
        assert.strictEqual(
          yield* git(folder, "log", "-1", "--format=%B"),
          "Auto-save: 1 file\n\n- A Note.md",
        );
      }),
    ),
  );

  it.effect("ends the day with a named Version, even without changes, and pushes it", () =>
    withVault(({ folder, remote, git, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        yield* git(folder, "init", "--quiet", "--initial-branch=main");
        yield* git(folder, "remote", "add", "origin", remote);
        const versions = yield* start;
        yield* versions.tick;
        assert.strictEqual(on(yield* status(versions)).unpushed, 0);

        yield* versions.endDay({ summary: "  Read Arendt,\n wrote two Notes " });

        const now = on(yield* status(versions));
        assert.strictEqual(now.remote, "origin");
        assert.strictEqual(now.unpushed, 0);
        assert.isNotNull(now.syncedAt);
        assert.strictEqual(
          yield* git(remote, "log", "--format=%s", "main"),
          "Read Arendt, wrote two Notes\nAuto-save: 1 file",
        );
      }),
    ),
  );

  it.effect("pulls what another computer pushed when Glose opens the Vault", () =>
    withVault(({ folder, remote, git, read, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        yield* git(folder, "init", "--quiet", "--initial-branch=main");
        yield* git(folder, "remote", "add", "origin", remote);
        yield* (yield* start).tick;

        const other = `${remote}-clone`;
        yield* git(folder, "clone", "--quiet", remote, other);
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(`${other}/From the other computer.md`, "Hello.\n");
        yield* git(other, "add", "--all");
        yield* git(other, ...OTHER, "commit", "--quiet", "-m", "Other");
        yield* git(other, "push", "--quiet");

        const next = yield* start;
        yield* next.tick;
        assert.strictEqual(yield* read("From the other computer.md"), "Hello.\n");
        assert.isNull(on(yield* status(next)).problem);
      }),
    ),
  );

  it.effect("syncs with the branch the local one follows, even under another name", () =>
    withVault(({ folder, remote, git, read, start }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=master", remote);
        yield* git(folder, "init", "--quiet", "--initial-branch=main");
        yield* git(folder, "remote", "add", "origin", remote);
        yield* git(folder, "config", "branch.main.remote", "origin");
        yield* git(folder, "config", "branch.main.merge", "refs/heads/master");
        yield* (yield* start).tick;

        const other = `${remote}-clone`;
        yield* git(folder, "clone", "--quiet", remote, other);
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(`${other}/From the other computer.md`, "Hello.\n");
        yield* git(other, "add", "--all");
        yield* git(other, ...OTHER, "commit", "--quiet", "-m", "Other");
        yield* git(other, "push", "--quiet");

        yield* (yield* start).tick;
        assert.strictEqual(yield* read("From the other computer.md"), "Hello.\n");
        assert.strictEqual(
          yield* git(remote, "for-each-ref", "--format=%(refname)", "refs/heads"),
          "refs/heads/master",
        );
      }),
    ),
  );

  it.effect("keeps every Version and undoes the sync when both computers changed one line", () =>
    withVault(({ folder, remote, git, read, write, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        yield* git(folder, "init", "--quiet", "--initial-branch=main");
        yield* git(folder, "remote", "add", "origin", remote);
        yield* write("A Note.md", "The first line.\n");
        const versions = yield* start;
        yield* versions.tick;

        const other = `${remote}-clone`;
        yield* git(folder, "clone", "--quiet", remote, other);
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(`${other}/A Note.md`, "Their line.\n");
        yield* git(other, ...OTHER, "commit", "--quiet", "-am", "Other");
        yield* git(other, "push", "--quiet");

        yield* write("A Note.md", "My line.\n");
        yield* versions.endDay({ summary: "Mine" });

        const now = on(yield* status(versions));
        assert.strictEqual(now.problem, "conflict");
        assert.strictEqual(now.unpushed, 1);
        assert.strictEqual(yield* read("A Note.md"), "My line.\n");
        assert.strictEqual(yield* git(folder, "status", "--porcelain"), "");
        assert.strictEqual(yield* git(folder, "log", "-1", "--format=%s"), "Mine");
      }),
    ),
  );

  it.effect("backs up to GitHub: the repository becomes the remote and gets every Version", () =>
    withVault(({ folder, remote, git, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        const versions = yield* start;
        yield* versions.tick;
        assert.isNull(on(yield* status(versions)).remote);

        yield* versions.backUpToGitHub({ name: "glose-vault" });

        const now = on(yield* status(versions));
        assert.strictEqual(now.remote, "origin");
        assert.strictEqual(now.remoteUrl, remote);
        assert.strictEqual(now.unpushed, 0);
        assert.isNull(now.problem);
        assert.strictEqual(yield* git(remote, "log", "--format=%s", "main"), "Auto-save: 2 files");
      }),
    ),
  );

  it.effect("refuses a remote that holds another Vault, and keeps none", () =>
    withVault(({ folder, remote, git, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        const other = `${remote}-other`;
        yield* git(folder, "init", "--quiet", "--initial-branch=main", other);
        yield* git(other, ...OTHER, "commit", "--quiet", "--allow-empty", "-m", "Another Vault");
        yield* git(other, "push", "--quiet", remote, "main");
        const versions = yield* start;
        yield* versions.tick;

        const refused = yield* versions.setRemote({ url: remote }).pipe(Effect.flip);

        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "other-vault" }));
        assert.strictEqual(yield* git(folder, "remote"), "");
        assert.isNull(on(yield* status(versions)).remote);
        assert.strictEqual(yield* git(remote, "rev-list", "--count", "main"), "1");
      }),
    ),
  );

  it.effect("refuses a remote git cannot reach", () =>
    withVault(({ folder, remote, git, start }) =>
      Effect.gen(function* () {
        const versions = yield* start;
        yield* versions.tick;

        const refused = yield* versions.setRemote({ url: `${remote}-missing` }).pipe(Effect.flip);

        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "unreachable" }));
        assert.strictEqual(yield* git(folder, "remote"), "");
      }),
    ),
  );

  it.effect("refuses a remote that git reaches but that does not take the push", () =>
    withVault(({ folder, remote, git, start, status }) =>
      Effect.gen(function* () {
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(`${remote}/hooks/pre-receive`, "#!/bin/sh\nexit 1\n", {
          mode: 0o755,
        });
        const versions = yield* start;
        yield* versions.tick;

        const refused = yield* versions.setRemote({ url: remote }).pipe(Effect.flip);

        assert.deepStrictEqual(refused, new RemoteRefused({ reason: "unreachable" }));
        assert.strictEqual(yield* git(folder, "remote"), "");
        const now = on(yield* status(versions));
        assert.isNull(now.remote);
        assert.isNull(now.problem);
      }),
    ),
  );

  it.effect("moves to a new remote without the old one's branches, and stops on removal", () =>
    withVault(({ folder, remote, git, write, start, status }) =>
      Effect.gen(function* () {
        const old = `${remote}-old`;
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", old);
        yield* git(folder, "init", "--quiet", "--bare", "--initial-branch=main", remote);
        const versions = yield* start;
        yield* versions.tick;
        yield* versions.setRemote({ url: old });

        yield* versions.setRemote({ url: remote });
        assert.strictEqual(
          yield* git(folder, "for-each-ref", "--format=%(refname)", "refs/remotes"),
          "refs/remotes/origin/main",
        );
        assert.strictEqual(on(yield* status(versions)).remoteUrl, remote);
        assert.strictEqual(yield* git(remote, "rev-list", "--count", "main"), "1");

        yield* versions.removeRemote;
        yield* write("A Note.md", "Kept here.\n");
        yield* versions.endDay({ summary: "Offline" });
        const now = on(yield* status(versions));
        assert.isNull(now.remote);
        assert.isNull(now.problem);
        assert.strictEqual(yield* git(remote, "rev-list", "--count", "main"), "1");
      }),
    ),
  );

  it.effect("leaves a Vault folder inside another repository alone", () =>
    withVault(
      ({ folder, git, start, status }) =>
        Effect.gen(function* () {
          const path = yield* Path.Path;
          const outer = path.dirname(folder);
          yield* git(outer, "init", "--quiet");
          const versions = yield* start;
          yield* versions.tick;
          assert.deepStrictEqual(yield* status(versions), {
            _tag: "Off",
            reason: "other-repository",
          });
          assert.strictEqual(yield* git(outer, "rev-list", "--all", "--count"), "0");
        }),
      { vaultFolder: (homeDir) => `${homeDir}/outer/Glose` },
    ),
  );
});

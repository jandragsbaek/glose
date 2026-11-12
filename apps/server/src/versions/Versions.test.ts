import type { VersionsStatus } from "@glose/contracts";
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
import * as Settings from "../settings/Settings.ts";
import { makeDirs } from "../testkit/graph.ts";
import * as Git from "./Git.ts";
import * as Versions from "./Versions.ts";

const MINUTE = 60_000;
const OTHER = ["-c", "user.name=Other computer", "-c", "user.email=other@example.com"];

/**
 * A Graph folder after setup, with Versions over it and a bare repository as its remote. Git runs
 * for real, with a global config of the test's own.
 */
const withGraph = <A, E>(
  test: (graph: {
    readonly folder: string;
    readonly remote: string;
    readonly git: (cwd: string, ...args: ReadonlyArray<string>) => Effect.Effect<string, unknown>;
    readonly write: (relative: string, text: string) => Effect.Effect<void, unknown>;
    readonly read: (relative: string) => Effect.Effect<string, unknown>;
    /** Builds the Versions service afresh, as a new start of Glose does. */
    readonly start: Effect.Effect<
      Versions.Versions["Service"],
      unknown,
      FileSystem.FileSystem | Path.Path
    >;
    readonly status: (versions: Versions.Versions["Service"]) => Effect.Effect<VersionsStatus>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  options: { readonly graphFolder?: (homeDir: string) => string } = {},
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const folder = options.graphFolder?.(dirs.homeDir) ?? path.join(dirs.homeDir, "Glose");
    const remote = path.join(dirs.homeDir, "remote.git");
    const globalConfig = path.join(dirs.homeDir, "gitconfig");
    yield* fs.writeFileString(globalConfig, "");
    const runner = Git.make({ GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: "1" });
    const git = (cwd: string, ...args: ReadonlyArray<string>) =>
      runner.run(cwd, args).pipe(Effect.map((text) => text.trim()));

    const deps = Layer.mergeAll(Settings.layer, Git.layerTest(globalConfig)).pipe(
      Layer.provideMerge(ServerConfig.layerTest(dirs)),
    );
    const start = Versions.make.pipe(Effect.provide(deps));
    yield* Effect.gen(function* () {
      const settings = yield* Settings.Settings;
      yield* settings.completeSetup({ language: "en", graphFolder: folder, action: "create" });
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
  it.effect("starts a repository in a new Graph and saves what is there as its first Version", () =>
    withGraph(({ folder, git, read, start, status }) =>
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
          "the Graph settings and the .gitignore",
        );
      }),
    ),
  );

  it.effect("saves a change once the Graph folder has been quiet for five minutes", () =>
    withGraph(({ folder, git, write, start, status }) =>
      Effect.gen(function* () {
        const versions = yield* start;
        yield* versions.tick;
        yield* write("A Note.md", "First words.\n");

        yield* versions.tick;
        assert.isTrue(on(yield* status(versions)).unsaved);

        // Still writing: a second edit restarts the pause.
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
    withGraph(({ folder, remote, git, start, status }) =>
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

  it.effect("pulls what another computer pushed when Glose opens the Graph", () =>
    withGraph(({ folder, remote, git, read, start, status }) =>
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

  it.effect("keeps every Version and undoes the sync when both computers changed one line", () =>
    withGraph(({ folder, remote, git, read, write, start, status }) =>
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

  it.effect("leaves a Graph folder inside another repository alone", () =>
    withGraph(
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
      { graphFolder: (homeDir) => `${homeDir}/outer/Glose` },
    ),
  );
});

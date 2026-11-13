import { GraphFolderUnavailable, GraphRemoteUnavailable } from "@glose/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ServerConfig from "../config.ts";
import { GitHub } from "../github/GitHub.ts";
import { makeDirs } from "../testkit/graph.ts";
import * as Git from "../versions/Git.ts";
import * as Settings from "./Settings.ts";
import * as Setup from "./Setup.ts";

const AUTHOR = ["-c", "user.name=Other computer", "-c", "user.email=other@example.com"];

/**
 * A computer at first start, and a bare repository that holds a Graph another computer pushed.
 * Git runs for real, with a global config of the test's own.
 */
const withRemote = <A, E>(
  test: (computer: {
    readonly remote: string;
    readonly homeDir: string;
    readonly setup: Setup.Setup["Service"];
    readonly settings: Settings.Settings["Service"];
    readonly git: (cwd: string, ...args: ReadonlyArray<string>) => Effect.Effect<string, unknown>;
  }) => Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  graph: Readonly<Record<string, string>> = {
    ".glose/settings.json": '{"recall":{"newCardsPerDay":10}}',
    "Attention residue.md": "Switching tasks leaves part of the mind behind.\n",
  },
) =>
  Effect.gen(function* () {
    const dirs = yield* makeDirs;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const globalConfig = path.join(dirs.homeDir, "gitconfig");
    yield* fs.writeFileString(globalConfig, "");
    const runner = Git.make({ GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: "1" });
    const git = (cwd: string, ...args: ReadonlyArray<string>) =>
      runner.run(cwd, args).pipe(Effect.map((text) => text.trim()));

    const remote = path.join(dirs.homeDir, "remote.git");
    const other = path.join(dirs.homeDir, "other-computer");
    yield* git(dirs.homeDir, "init", "--quiet", "--bare", "--initial-branch=main", remote);
    yield* git(dirs.homeDir, "init", "--quiet", "--initial-branch=main", other);
    for (const [file, text] of Object.entries(graph)) {
      yield* fs.makeDirectory(path.dirname(path.join(other, file)), { recursive: true });
      yield* fs.writeFileString(path.join(other, file), text);
    }
    yield* git(other, "add", "--all");
    yield* git(other, ...AUTHOR, "commit", "--quiet", "-m", "Auto-save: 2 files");
    yield* git(other, "push", "--quiet", remote, "main");

    const github = GitHub.of({
      status: Stream.empty,
      connect: Effect.void,
      cancel: Effect.void,
      disconnect: Effect.void,
      repository: () => Effect.succeed(remote),
      repositories: Effect.succeed([]),
      gitConfig: Effect.succeed({}),
    });
    const deps = Layer.mergeAll(Git.layerTest(globalConfig), Layer.succeed(GitHub, github)).pipe(
      Layer.provideMerge(Settings.layer),
      Layer.provideMerge(ServerConfig.layerTest(dirs)),
    );
    const services = yield* Effect.all({ setup: Setup.make, settings: Settings.Settings }).pipe(
      Effect.provide(deps),
    );
    return yield* test({ remote, homeDir: dirs.homeDir, git, ...services });
  }).pipe(Effect.scoped);

it.layer(NodeServices.layer)("Setup", (it) => {
  it.effect("copies a Graph from a remote into a new folder and opens it there", () =>
    withRemote(({ remote, homeDir, setup, settings, git }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const folder = path.join(homeDir, "Glose");

        const view = yield* setup.complete({
          language: "da",
          graphFolder: folder,
          action: "clone",
          remote,
        });

        assert.deepStrictEqual(view.settings, { language: "da", graphFolder: folder });
        assert.deepStrictEqual((yield* settings.get).settings, view.settings);
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, "Attention residue.md")),
          "Switching tasks leaves part of the mind behind.\n",
        );
        assert.strictEqual(
          yield* fs.readFileString(path.join(folder, ".glose", "settings.json")),
          '{"recall":{"newCardsPerDay":10}}',
          "the Graph keeps its own settings",
        );
        // The remote stays the Graph's origin, so its Versions sync there from now on.
        assert.strictEqual(yield* git(folder, "config", "--get", "remote.origin.url"), remote);
        assert.strictEqual(yield* git(folder, "status", "--porcelain"), "");
      }),
    ),
  );

  it.effect("makes a Graph of a copied repository that holds none yet", () =>
    withRemote(
      ({ remote, homeDir, setup }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const folder = path.join(homeDir, "Notes from elsewhere");

          yield* setup.complete({ language: "en", graphFolder: folder, action: "clone", remote });

          assert.isTrue(yield* fs.exists(path.join(folder, ".glose", "settings.json")));
          assert.isTrue(yield* fs.exists(path.join(folder, "Reading list.md")));
        }),
      { "Reading list.md": "- Arendt\n" },
    ),
  );

  it.effect("copies only into a folder that is missing or empty", () =>
    withRemote(({ remote, homeDir, setup, settings }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const folder = path.join(homeDir, "Full");
        yield* fs.makeDirectory(folder);
        yield* fs.writeFileString(path.join(folder, "Mine.md"), "My own words.\n");

        const error = yield* setup
          .complete({ language: "en", graphFolder: folder, action: "clone", remote })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          error,
          new GraphFolderUnavailable({ path: folder, reason: "not-empty" }),
        );
        assert.deepStrictEqual(yield* fs.readDirectory(folder), ["Mine.md"]);
        assert.isNull((yield* settings.get).settings.graphFolder);
      }),
    ),
  );

  it.effect("keeps nothing when git cannot reach the remote", () =>
    withRemote(({ homeDir, setup, settings }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const folder = path.join(homeDir, "Glose");
        const missing = path.join(homeDir, "no-such-remote.git");

        const error = yield* setup
          .complete({ language: "en", graphFolder: folder, action: "clone", remote: missing })
          .pipe(Effect.flip);

        assert.deepStrictEqual(error, new GraphRemoteUnavailable({ reason: "unreachable" }));
        assert.isFalse(yield* fs.exists(folder), "the folder Glose made for the copy is gone");
        assert.isNull((yield* settings.get).settings.graphFolder);
        assert.deepStrictEqual(
          yield* setup.checkRemote(missing).pipe(Effect.flip),
          new GraphRemoteUnavailable({ reason: "unreachable" }),
        );
      }),
    ),
  );

  it.effect("checks that git can read a remote before setup copies from it", () =>
    withRemote(({ remote, setup }) => setup.checkRemote(remote)),
  );
});

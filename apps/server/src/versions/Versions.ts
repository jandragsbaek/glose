import type { EndDay, VersionsProblem, VersionsStatus } from "@glose/contracts";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import type * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as NodeOS from "node:os";

import * as ServerConfig from "../config.ts";
import * as Settings from "../settings/Settings.ts";
import { Git } from "./Git.ts";

export class Versions extends Context.Service<
  Versions,
  {
    /** The status now, then every change. */
    readonly status: Stream.Stream<VersionsStatus>;
    /**
     * One look at the Graph folder. A newly opened folder saves what changed while Glose was
     * closed and syncs at once; after that, changes are saved and synced after a quiet pause.
     */
    readonly tick: Effect.Effect<void>;
    /** Makes a Version named by the user's line about the day, even without changes, and syncs. */
    readonly endDay: (input: EndDay) => Effect.Effect<void>;
    /** Saves what changed without syncing, as Glose closes. */
    readonly close: Effect.Effect<void>;
  }
>()("glose/versions/Versions") {}

/** How often Glose looks for changes. */
export const TICK = "30 seconds";
/** A change is saved once the Graph folder has been quiet this long. */
export const QUIET_MS = 5 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 2 * 60 * 1000;

const AUTO_SAVE = "Auto-save";
const END_OF_DAY = "End of day";
/** Changed files named in an automatic Version's message; the rest are counted. */
const LISTED_FILES = 20;

/** Files a new repository leaves out: half-written temporaries, OS litter, Obsidian's layout. */
const GITIGNORE = [
  "# Written by Glose when it started versioning this Graph. Edit freely.",
  "*.glose-tmp",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  ".obsidian/workspace*.json",
  ".trash/",
  "",
].join("\n");

/**
 * Glose's own commits are never signed: a signing prompt every few minutes would interrupt the
 * user, and nobody is there to answer it.
 */
const COMMIT_CONFIG = ["-c", "commit.gpgsign=false"];

interface Opened {
  readonly folder: string;
  /** False when the folder cannot be versioned; the status says why. */
  readonly usable: boolean;
}

const OFF_NO_GRAPH: VersionsStatus = { _tag: "Off", reason: "no-graph" };

export const make = Effect.gen(function* () {
  const git = yield* Git;
  const settings = yield* Settings.Settings;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { homeDir } = yield* ServerConfig.ServerConfig;

  const status = yield* SubscriptionRef.make<VersionsStatus>(OFF_NO_GRAPH);
  const lock = yield* Semaphore.make(1);

  let opened: Opened | null = null;
  /** What `git status` and the changed files' stamps looked like at the last look. */
  let fingerprint = "";
  /** When the fingerprint last changed; the quiet pause counts from here. */
  let changedAt = 0;
  let syncedAt: number | null = null;
  let problem: VersionsProblem | null = null;
  let activity: "idle" | "saving" | "syncing" = "idle";

  const succeeds = (cwd: string, args: ReadonlyArray<string>) =>
    git.run(cwd, args).pipe(
      Effect.as(true),
      Effect.orElseSucceed(() => false),
    );
  const output = (cwd: string, args: ReadonlyArray<string>) =>
    git.run(cwd, args).pipe(
      Effect.map((text) => text.trim()),
      Effect.option,
      Effect.map(Option.getOrNull),
    );

  const branchOf = (folder: string) => output(folder, ["symbolic-ref", "--short", "HEAD"]);

  /** The remote to sync with: the branch's own, else `origin`, else the only one there is. */
  const remoteOf = Effect.fn("Versions.remoteOf")(function* (folder: string, branch: string) {
    const own = yield* output(folder, ["config", "--get", `branch.${branch}.remote`]);
    if (own) return own;
    const remotes = (yield* output(folder, ["remote"]))?.split("\n").filter(Boolean) ?? [];
    if (remotes.includes("origin")) return "origin";
    return remotes.length === 1 ? (remotes[0] ?? null) : null;
  });

  /** The remote's branch this one follows: its configured upstream, else one of the same name. */
  const remoteBranchOf = (folder: string, branch: string) =>
    output(folder, ["config", "--get", `branch.${branch}.merge`]).pipe(
      Effect.map((merge) => merge?.replace(/^refs\/heads\//, "") || branch),
    );

  const hasCommits = (folder: string) => succeeds(folder, ["rev-parse", "--verify", "-q", "HEAD"]);

  const count = (folder: string, range: string) =>
    output(folder, ["rev-list", "--count", range]).pipe(Effect.map((n) => Number(n ?? 0)));

  /** Versions here that the remote lacks: all of them while the remote has no such branch. */
  const unpushedOf = Effect.fn("Versions.unpushedOf")(function* (
    folder: string,
    remote: string | null,
    remoteBranch: string | null,
  ) {
    if (remote === null || remoteBranch === null || !(yield* hasCommits(folder))) return 0;
    const ref = `refs/remotes/${remote}/${remoteBranch}`;
    return (yield* succeeds(folder, ["rev-parse", "--verify", "-q", ref]))
      ? yield* count(folder, `${ref}..HEAD`)
      : yield* count(folder, "HEAD");
  });

  /** Changed paths, each with its modification time and size, so a second edit counts too. */
  const fingerprintOf = Effect.fn("Versions.fingerprintOf")(function* (folder: string) {
    const raw = yield* git.run(folder, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (raw === "") return "";
    const entries = raw.split("\0").filter(Boolean);
    const stamps: Array<string> = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] ?? "";
      const file = entry.slice(3);
      // A rename or copy carries its old path as the next entry.
      if (entry[0] === "R" || entry[0] === "C") i++;
      const info = yield* fs.stat(path.join(folder, file)).pipe(Effect.option);
      stamps.push(
        Option.match(info, {
          onNone: () => `${entry}:gone`,
          onSome: (stat) =>
            `${entry}:${Option.getOrElse(stat.mtime, () => new Date(0)).getTime()}:${stat.size}`,
        }),
      );
    }
    return stamps.join("\n");
  });

  /** Publishes what the repository looks like now, with what this run of Glose knows. */
  const publish = Effect.fn("Versions.publish")(function* (folder: string) {
    const branch = yield* branchOf(folder);
    const remote = branch === null ? null : yield* remoteOf(folder, branch);
    const remoteBranch = branch === null ? null : yield* remoteBranchOf(folder, branch);
    const time = yield* output(folder, ["log", "-1", "--format=%ct"]);
    yield* SubscriptionRef.set(status, {
      _tag: "On",
      savedAt: time ? Number(time) * 1000 : null,
      unsaved: fingerprint !== "",
      activity,
      remote,
      unpushed: yield* unpushedOf(folder, remote, remoteBranch),
      syncedAt,
      problem,
    });
  });

  const setActivity = (folder: string, next: typeof activity) =>
    Effect.suspend(() => {
      activity = next;
      return publish(folder);
    });

  /**
   * Git refuses to commit without a name and an e-mail address. When the user never set them,
   * Glose signs with the computer's user name, so the history still says who wrote it.
   */
  const identity = Effect.fn("Versions.identity")(function* (folder: string) {
    const name = yield* output(folder, ["config", "user.name"]);
    const email = yield* output(folder, ["config", "user.email"]);
    if (name && email) return [];
    const user = NodeOS.userInfo().username || "glose";
    return [
      ...(name ? [] : ["-c", `user.name=${user}`]),
      ...(email ? [] : ["-c", `user.email=${user}@${NodeOS.hostname() || "localhost"}`]),
    ];
  });

  /** Stages everything and commits it; with `always`, a Version is made even without changes. */
  const save = Effect.fn("Versions.save")(function* (
    folder: string,
    summary: string | null,
    always: boolean,
  ) {
    yield* setActivity(folder, "saving");
    const result = yield* Effect.gen(function* () {
      yield* git.run(folder, ["add", "--all"]);
      const files = (yield* git.run(folder, ["diff", "--cached", "--name-only", "-z"]))
        .split("\0")
        .filter(Boolean);
      if (files.length === 0 && !always) return;
      const message = summary ?? autoMessage(files);
      yield* git.run(folder, [
        ...COMMIT_CONFIG,
        ...(yield* identity(folder)),
        "commit",
        "--quiet",
        "--no-verify",
        ...(always ? ["--allow-empty"] : []),
        "-m",
        message,
      ]);
    }).pipe(Effect.result);
    if (result._tag === "Failure") {
      yield* Effect.logWarning("Glose could not make a Version", result.failure);
      problem = "save-failed";
    } else if (problem === "save-failed") {
      problem = null;
    }
    fingerprint = yield* fingerprintOf(folder).pipe(Effect.orElseSucceed(() => fingerprint));
    yield* setActivity(folder, "idle");
    return result._tag === "Success";
  });

  /**
   * Fetches, puts this computer's Versions on top of the remote's, and pushes. When both sides
   * changed the same lines, the rebase is undone: every Version stays, and the user decides.
   */
  const sync = Effect.fn("Versions.sync")(function* (folder: string) {
    const branch = yield* branchOf(folder);
    const remote = branch === null ? null : yield* remoteOf(folder, branch);
    if (branch === null || remote === null) return;
    const remoteBranch = yield* remoteBranchOf(folder, branch);
    yield* setActivity(folder, "syncing");
    const network = { timeoutMs: NETWORK_TIMEOUT_MS };
    const outcome = yield* Effect.gen(function* () {
      yield* git.run(folder, ["fetch", "--quiet", remote], network);
      const ref = `refs/remotes/${remote}/${remoteBranch}`;
      const remoteHasBranch = yield* succeeds(folder, ["rev-parse", "--verify", "-q", ref]);
      if (remoteHasBranch && (yield* count(folder, `HEAD..${ref}`)) > 0) {
        if (!(yield* hasCommits(folder))) {
          // A new repository with nothing saved yet takes the remote's history as it is.
          yield* git.run(folder, ["reset", "--quiet", ref]);
        } else {
          // Only a clean folder is rebased: work saved after the fetch would need a stash, and a
          // stash that fails to apply leaves conflict markers the next save would commit. That
          // work is saved first, and the next sync takes the remote's Versions.
          if ((yield* git.run(folder, ["status", "--porcelain"])) !== "") return "later" as const;
          const rebased = yield* git
            .run(folder, [...COMMIT_CONFIG, ...(yield* identity(folder)), "rebase", "--quiet", ref])
            .pipe(Effect.result);
          if (rebased._tag === "Failure") {
            yield* git.run(folder, ["rebase", "--abort"]).pipe(Effect.ignore);
            return "conflict" as const;
          }
        }
      }
      if ((yield* unpushedOf(folder, remote, remoteBranch)) > 0) {
        yield* git.run(
          folder,
          ["push", "--quiet", "--set-upstream", remote, `HEAD:refs/heads/${remoteBranch}`],
          network,
        );
      }
      return null;
    }).pipe(
      Effect.tapError((error) => Effect.logWarning("Glose could not sync its Versions", error)),
      Effect.orElseSucceed(() => "sync-failed" as const),
    );
    if (outcome === null) syncedAt = yield* Clock.currentTimeMillis;
    if (outcome !== "later" && (problem !== "save-failed" || outcome !== null)) problem = outcome;
    fingerprint = yield* fingerprintOf(folder).pipe(Effect.orElseSucceed(() => fingerprint));
    yield* setActivity(folder, "idle");
  });

  /** Starts versioning a Graph folder: a repository of its own, or none at all. */
  const open = Effect.fn("Versions.open")(function* (folder: string) {
    fingerprint = "";
    syncedAt = null;
    problem = null;
    activity = "idle";
    if (!(yield* succeeds(homeDir, ["--version"]))) {
      yield* SubscriptionRef.set(status, { _tag: "Off", reason: "no-git" });
      return false;
    }
    const top = yield* output(folder, ["rev-parse", "--show-cdup"]);
    if (top === null) {
      const started = yield* succeeds(folder, ["init", "--quiet", "--initial-branch=main"]);
      if (!started) {
        yield* SubscriptionRef.set(status, { _tag: "Off", reason: "failed" });
        return false;
      }
      const ignore = path.join(folder, ".gitignore");
      if (!(yield* fs.exists(ignore).pipe(Effect.orElseSucceed(() => true)))) {
        yield* fs.writeFileString(ignore, GITIGNORE).pipe(Effect.ignore);
      }
    } else if (top !== "") {
      // Inside someone else's repository: its owner decides what gets committed there.
      yield* SubscriptionRef.set(status, { _tag: "Off", reason: "other-repository" });
      return false;
    }
    return true;
  });

  const graphFolder = settings.get.pipe(
    Effect.map((view) => view.settings.graphFolder),
    Effect.orElseSucceed(() => null),
  );

  const tick = Effect.gen(function* () {
    const folder = yield* graphFolder;
    if (folder === null) {
      opened = null;
      yield* SubscriptionRef.set(status, OFF_NO_GRAPH);
      return;
    }
    if (opened?.folder !== folder) {
      const usable = yield* open(folder);
      opened = { folder, usable };
      if (!usable) return;
      // Work done while Glose was closed (in Obsidian, say) is saved first, then the Graph syncs.
      yield* save(folder, null, false);
      yield* sync(folder);
      return;
    }
    if (!opened.usable) return;
    const now = yield* Clock.currentTimeMillis;
    const next = yield* fingerprintOf(folder).pipe(Effect.orElseSucceed(() => fingerprint));
    if (next !== fingerprint) {
      fingerprint = next;
      changedAt = now;
      yield* publish(folder);
      return;
    }
    if (next !== "" && now - changedAt >= QUIET_MS) {
      if (yield* save(folder, null, false)) yield* sync(folder);
    }
  }).pipe((effect) => lock.withPermit(effect), Effect.withSpan("Versions.tick"));

  return Versions.of({
    status: SubscriptionRef.changes(status),
    tick,
    endDay: Effect.fn("Versions.endDay")(
      function* ({ summary }) {
        if (opened === null || !opened.usable) return;
        const line = summary.replace(/\s+/g, " ").trim();
        yield* save(opened.folder, line === "" ? END_OF_DAY : line, true);
        yield* sync(opened.folder);
      },
      (effect) => lock.withPermit(effect),
    ),
    close: Effect.suspend(() =>
      opened?.usable ? save(opened.folder, null, false).pipe(Effect.asVoid) : Effect.void,
    ).pipe((effect) => lock.withPermit(effect), Effect.withSpan("Versions.close")),
  });
});

/** "Auto-save: 3 files", then the files, so the history says what changed. */
const autoMessage = (files: ReadonlyArray<string>) => {
  const listed = files.slice(0, LISTED_FILES).map((file) => `- ${file}`);
  const more = files.length - listed.length;
  return [
    `${AUTO_SAVE}: ${files.length} ${files.length === 1 ? "file" : "files"}`,
    "",
    ...listed,
    ...(more > 0 ? [`- and ${more} more`] : []),
  ].join("\n");
};

export const layer = Layer.effect(Versions, make);

/**
 * Looks at the Graph folder now and every 30 seconds while the server runs, and saves what
 * changed as the server stops. Only the running server has it; tests drive `tick` themselves.
 */
export const layerRunner = Layer.effectDiscard(
  Effect.gen(function* () {
    const versions = yield* Versions;
    yield* versions.tick.pipe(Effect.repeat(Schedule.spaced(TICK)), Effect.forkScoped);
    yield* Effect.addFinalizer(() =>
      versions.close.pipe(Effect.timeout("4 seconds"), Effect.ignore),
    );
  }),
);

import {
  type BackUpToGitHub,
  type EndDay,
  RemoteRefused,
  type SetRemote,
  type VersionsProblem,
  type VersionsStatus,
} from "@glose/contracts";
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
import { GitHub } from "../github/GitHub.ts";
import * as Settings from "../settings/Settings.ts";
import { Git } from "./Git.ts";

export class Versions extends Context.Service<
  Versions,
  {
    readonly status: Stream.Stream<VersionsStatus>;
    readonly tick: Effect.Effect<void>;
    readonly endDay: (input: EndDay) => Effect.Effect<void>;
    readonly close: Effect.Effect<void>;
    readonly backUpToGitHub: (input: BackUpToGitHub) => Effect.Effect<void, RemoteRefused>;
    readonly setRemote: (input: SetRemote) => Effect.Effect<void, RemoteRefused>;
    readonly removeRemote: Effect.Effect<void>;
  }
>()("glose/versions/Versions") {}

export const TICK = "30 seconds";
export const QUIET_MS = 5 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 2 * 60 * 1000;

const AUTO_SAVE = "Auto-save";
const END_OF_DAY = "End of day";
const LISTED_FILES = 20;

const GITIGNORE = [
  "# Written by Glose when it started versioning this Vault. Edit freely.",
  "*.glose-tmp",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  ".obsidian/workspace*.json",
  ".trash/",
  "",
].join("\n");

const COMMIT_CONFIG = ["-c", "commit.gpgsign=false"];

interface Opened {
  readonly folder: string;
  readonly usable: boolean;
}

const OFF_NO_VAULT: VersionsStatus = { _tag: "Off", reason: "no-vault" };

export const make = Effect.gen(function* () {
  const git = yield* Git;
  const github = yield* GitHub;
  const settings = yield* Settings.Settings;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { homeDir } = yield* ServerConfig.ServerConfig;

  const status = yield* SubscriptionRef.make<VersionsStatus>(OFF_NO_VAULT);
  const lock = yield* Semaphore.make(1);

  let opened: Opened | null = null;
  let fingerprint = "";
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

  const remoteOf = Effect.fn("Versions.remoteOf")(function* (folder: string, branch: string) {
    const own = yield* output(folder, ["config", "--get", `branch.${branch}.remote`]);
    if (own) return own;
    const remotes = (yield* output(folder, ["remote"]))?.split("\n").filter(Boolean) ?? [];
    if (remotes.includes("origin")) return "origin";
    return remotes.length === 1 ? (remotes[0] ?? null) : null;
  });

  const remoteBranchOf = (folder: string, branch: string) =>
    output(folder, ["config", "--get", `branch.${branch}.merge`]).pipe(
      Effect.map((merge) => merge?.replace(/^refs\/heads\//, "") || branch),
    );

  const hasCommits = (folder: string) => succeeds(folder, ["rev-parse", "--verify", "-q", "HEAD"]);

  const count = (folder: string, range: string) =>
    output(folder, ["rev-list", "--count", range]).pipe(Effect.map((n) => Number(n ?? 0)));

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

  const fingerprintOf = Effect.fn("Versions.fingerprintOf")(function* (folder: string) {
    const raw = yield* git.run(folder, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (raw === "") return "";
    const entries = raw.split("\0").filter(Boolean);
    const stamps: Array<string> = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] ?? "";
      const file = entry.slice(3);
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

  const publish = Effect.fn("Versions.publish")(function* (folder: string) {
    const branch = yield* branchOf(folder);
    const remote = branch === null ? null : yield* remoteOf(folder, branch);
    const remoteBranch = branch === null ? null : yield* remoteBranchOf(folder, branch);
    const time = yield* output(folder, ["log", "-1", "--format=%ct"]);
    const url =
      remote === null ? null : yield* output(folder, ["config", "--get", `remote.${remote}.url`]);
    yield* SubscriptionRef.set(status, {
      _tag: "On",
      savedAt: time ? Number(time) * 1000 : null,
      unsaved: fingerprint !== "",
      activity,
      remote,
      remoteUrl: url === null ? null : withoutPassword(url),
      unpushed: yield* unpushedOf(folder, remote, remoteBranch),
      syncedAt,
      problem,
    });
  });

  const networkOptions = github.gitConfig.pipe(
    Effect.map((config) => ({ timeoutMs: NETWORK_TIMEOUT_MS, config })),
  );

  const setActivity = (folder: string, next: typeof activity) =>
    Effect.suspend(() => {
      activity = next;
      return publish(folder);
    });

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

  const sync = Effect.fn("Versions.sync")(function* (folder: string) {
    const branch = yield* branchOf(folder);
    const remote = branch === null ? null : yield* remoteOf(folder, branch);
    if (branch === null || remote === null) return;
    const remoteBranch = yield* remoteBranchOf(folder, branch);
    yield* setActivity(folder, "syncing");
    const network = yield* networkOptions;
    const outcome = yield* Effect.gen(function* () {
      yield* git.run(folder, ["fetch", "--quiet", remote], network);
      const ref = `refs/remotes/${remote}/${remoteBranch}`;
      const remoteHasBranch = yield* succeeds(folder, ["rev-parse", "--verify", "-q", ref]);
      if (remoteHasBranch && (yield* count(folder, `HEAD..${ref}`)) > 0) {
        if (!(yield* hasCommits(folder))) {
          yield* git.run(folder, ["reset", "--quiet", ref]);
        } else {
          if ((yield* git.run(folder, ["status", "--porcelain"])) !== "") return "later" as const;
          const rebased = yield* git
            .run(folder, [
              ...COMMIT_CONFIG,
              ...(yield* identity(folder)),
              "rebase",
              "--quiet",
              "--no-autostash",
              ref,
            ])
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
    return outcome;
  });

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
      yield* SubscriptionRef.set(status, { _tag: "Off", reason: "other-repository" });
      return false;
    }
    return true;
  });

  const connectRemote = Effect.fn("Versions.connectRemote")(function* (url: string) {
    if (opened === null || !opened.usable)
      return yield* new RemoteRefused({ reason: "versions-off" });
    const folder = opened.folder;
    const branch = (yield* branchOf(folder)) ?? "main";
    const network = yield* networkOptions;
    const heads = yield* git.run(folder, ["ls-remote", "--heads", url], network).pipe(
      Effect.tapError((error) => Effect.logWarning("Glose could not reach the remote", error)),
      Effect.mapError(() => new RemoteRefused({ reason: "unreachable" })),
    );
    if (heads.trim() !== "" && (yield* hasCommits(folder))) {
      yield* git.run(folder, ["fetch", "--quiet", url, `refs/heads/${branch}`], network).pipe(
        Effect.flatMap(() => git.run(folder, ["merge-base", "HEAD", "FETCH_HEAD"])),
        Effect.mapError(() => new RemoteRefused({ reason: "other-vault" })),
      );
    }
    const name = (yield* remoteOf(folder, branch)) ?? REMOTE_NAME;
    yield* git.run(folder, ["remote", "remove", name]).pipe(Effect.ignore);
    yield* git.run(folder, ["remote", "add", name, url]).pipe(
      Effect.tapError((error) => Effect.logWarning("Glose could not add the remote", error)),
      Effect.mapError(() => new RemoteRefused({ reason: "unreachable" })),
    );
    problem = problem === "save-failed" ? problem : null;
    syncedAt = null;
    if ((yield* sync(folder)) === "sync-failed") {
      yield* git.run(folder, ["remote", "remove", name]).pipe(Effect.ignore);
      problem = null;
      yield* publish(folder);
      return yield* new RemoteRefused({ reason: "unreachable" });
    }
  });

  const vaultFolder = settings.get.pipe(
    Effect.map((view) => view.settings.vaultFolder),
    Effect.orElseSucceed(() => null),
  );

  const tick = Effect.gen(function* () {
    const folder = yield* vaultFolder;
    if (folder === null) {
      opened = null;
      yield* SubscriptionRef.set(status, OFF_NO_VAULT);
      return;
    }
    if (opened?.folder !== folder) {
      const usable = yield* open(folder);
      opened = { folder, usable };
      if (!usable) return;
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
    backUpToGitHub: Effect.fn("Versions.backUpToGitHub")(
      function* ({ name }) {
        if (opened === null || !opened.usable) {
          return yield* new RemoteRefused({ reason: "versions-off" });
        }
        yield* connectRemote(yield* github.repository(name));
      },
      (effect) => lock.withPermit(effect),
    ),
    setRemote: Effect.fn("Versions.setRemote")(
      function* ({ url }) {
        yield* connectRemote(url);
      },
      (effect) => lock.withPermit(effect),
    ),
    removeRemote: Effect.fn("Versions.removeRemote")(
      function* () {
        if (opened === null || !opened.usable) return;
        const folder = opened.folder;
        const branch = yield* branchOf(folder);
        const name = branch === null ? null : yield* remoteOf(folder, branch);
        if (name !== null) yield* git.run(folder, ["remote", "remove", name]).pipe(Effect.ignore);
        if (problem !== "save-failed") problem = null;
        syncedAt = null;
        yield* publish(folder);
      },
      (effect) => lock.withPermit(effect),
    )(),
    close: Effect.suspend(() =>
      opened?.usable ? save(opened.folder, null, false).pipe(Effect.asVoid) : Effect.void,
    ).pipe((effect) => lock.withPermit(effect), Effect.withSpan("Versions.close")),
  });
});

const REMOTE_NAME = "origin";

export const withoutPassword = (url: string) => {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return url;
  }
};

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

export const layerRunner = Layer.effectDiscard(
  Effect.gen(function* () {
    const versions = yield* Versions;
    yield* versions.tick.pipe(Effect.repeat(Schedule.spaced(TICK)), Effect.forkScoped);
    yield* Effect.addFinalizer(() =>
      versions.close.pipe(Effect.timeout("4 seconds"), Effect.ignore),
    );
  }),
);

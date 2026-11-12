import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeChildProcess from "node:child_process";

/** Git ran and exited with a failure. `stderr` is for logs, not for the interface. */
export class GitFailed extends Data.TaggedError("GitFailed")<{
  readonly args: ReadonlyArray<string>;
  readonly code: number | null;
  readonly stderr: string;
}> {}

/** No `git` program on this computer's PATH. */
export class GitMissing extends Data.TaggedError("GitMissing")<{}> {}

export interface RunOptions {
  /** Network commands (fetch, push) get a longer limit than local ones. */
  readonly timeoutMs?: number;
  /**
   * Config for this one run, such as a sign-in header. It goes through the environment, so a
   * secret never shows in the process list or lands in the repository's config.
   */
  readonly config?: Readonly<Record<string, string>>;
}

/** Runs the user's own `git`, so their remotes, SSH keys and credential helpers just work. */
export class Git extends Context.Service<
  Git,
  {
    /** Runs git in `cwd` and returns its standard output. */
    readonly run: (
      cwd: string,
      args: ReadonlyArray<string>,
      options?: RunOptions,
    ) => Effect.Effect<string, GitFailed | GitMissing>;
  }
>()("glose/versions/Git") {}

const LOCAL_TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 32 * 1024 * 1024;

/**
 * Variables that point git at another repository. Git sets them in hooks (Glose's own tests run
 * from a pre-commit hook), and one left in place would make Glose commit in the wrong repository.
 */
const REPOSITORY_VARIABLES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_NAMESPACE",
  "GIT_PREFIX",
];

export const environment = (
  base: NodeJS.ProcessEnv,
  extra: Readonly<Record<string, string>> = {},
  config: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...base, ...extra };
  for (const name of REPOSITORY_VARIABLES) delete env[name];
  // Added after any config the environment already gives git, so both apply.
  let index = Number(env.GIT_CONFIG_COUNT ?? 0) || 0;
  for (const [key, value] of Object.entries(config)) {
    env[`GIT_CONFIG_KEY_${index}`] = key;
    env[`GIT_CONFIG_VALUE_${index}`] = value;
    index++;
  }
  if (index > 0) env.GIT_CONFIG_COUNT = String(index);
  // Nobody can answer a password prompt: fail instead of waiting for one.
  env.GIT_TERMINAL_PROMPT = "0";
  // Glose looks at the folder often; its reads must not hold a lock the user's own git needs.
  env.GIT_OPTIONAL_LOCKS = "0";
  return env;
};

export const make = (extraEnv: Readonly<Record<string, string>> = {}) =>
  Git.of({
    run: (cwd, args, options) =>
      Effect.callback<string, GitFailed | GitMissing>((resume, signal) => {
        NodeChildProcess.execFile(
          "git",
          [...args],
          {
            cwd,
            env: environment(process.env, extraEnv, options?.config),
            signal,
            timeout: options?.timeoutMs ?? LOCAL_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT,
            windowsHide: true,
            encoding: "utf8",
          },
          (error, stdout, stderr) => {
            if (error === null) return resume(Effect.succeed(stdout));
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
              return resume(Effect.fail(new GitMissing()));
            }
            const code = typeof error.code === "number" ? error.code : null;
            resume(Effect.fail(new GitFailed({ args, code, stderr: stderr || error.message })));
          },
        );
      }),
  });

export const layer = Layer.succeed(Git, make());

/** Git with only the given global config, so a test never reads the developer's own. */
export const layerTest = (globalConfig: string) =>
  Layer.succeed(Git, make({ GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: "1" }));

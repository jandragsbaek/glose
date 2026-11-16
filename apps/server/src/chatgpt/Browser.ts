import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as NodeChildProcess from "node:child_process";

const opener = (url: string): readonly [string, ReadonlyArray<string>] => {
  switch (process.platform) {
    case "darwin":
      return ["open", [url]];
    case "win32":
      return ["explorer.exe", [url]];
    default:
      return ["xdg-open", [url]];
  }
};

export const Browser = Context.Reference<{ readonly open: (url: string) => Effect.Effect<void> }>(
  "glose/chatgpt/Browser",
  {
    defaultValue: () => ({
      open: (url) =>
        Effect.sync(() => {
          const [command, args] = opener(url);
          const child = NodeChildProcess.spawn(command, args, { detached: true, stdio: "ignore" });
          child.on("error", () => {});
          child.unref();
        }),
    }),
  },
);

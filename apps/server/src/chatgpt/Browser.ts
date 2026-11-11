import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as NodeChildProcess from "node:child_process";

/** The OS command that opens a URL in the user's default browser, without a shell. */
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

/**
 * Opens a page in the system browser. The server does this itself because it runs on the
 * user's computer, in the desktop app as well as in development. Where no browser exists
 * (a headless node), nothing opens and the app shows the link instead.
 */
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

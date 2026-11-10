// Starts Electron on this package. With --dev the window loads the Vite dev server;
// without it the app starts the built server itself, as the installed app does.
// Any other argument goes to Electron, e.g. --remote-debugging-port=9333.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeModule from "node:module";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const require = NodeModule.createRequire(import.meta.url);
const desktopDir = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const electronDir = NodePath.dirname(require.resolve("electron/package.json"));

// Electron has no install script, so the binary is fetched on first launch.
if (!NodeFS.existsSync(NodePath.join(electronDir, "path.txt"))) {
  NodeChildProcess.execFileSync(process.execPath, [NodePath.join(electronDir, "install.js")], {
    stdio: "inherit",
  });
}

const isDev = process.argv.includes("--dev");
const electronArgs = process.argv.slice(2).filter((argument) => argument !== "--dev");

const env = { ...process.env };
// Inherited from an Electron-based editor, this would start Electron as plain Node.
delete env.ELECTRON_RUN_AS_NODE;
if (isDev) {
  env.GLOSE_DEV_SERVER_URL ??= `http://localhost:${process.env.PORT ?? "5183"}`;
}

const child = NodeChildProcess.spawn(require("electron"), [".", ...electronArgs], {
  cwd: desktopDir,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

// Starts Glose on a copy of demo/Graph in the temp folder, with its own computer settings, so
// the demo never touches the user's Graph or the repository's files.
// --keep continues with the last copy instead of a fresh one; --desktop starts Electron.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const demoDir = NodePath.join(NodeOS.tmpdir(), "glose-demo");
const graphFolder = NodePath.join(demoDir, "Graph");
const dataDir = NodePath.join(demoDir, "app-data");

const keep = process.argv.includes("--keep") && NodeFS.existsSync(graphFolder);
if (!keep) {
  NodeFS.rmSync(graphFolder, { recursive: true, force: true });
  NodeFS.cpSync(NodePath.join(root, "demo", "Graph"), graphFolder, { recursive: true });
  NodeFS.mkdirSync(NodePath.join(graphFolder, ".glose"), { recursive: true });
  NodeFS.writeFileSync(NodePath.join(graphFolder, ".glose", "settings.json"), "{}");
}

// The interface language chosen in an earlier demo stays; the Graph folder is always the demo.
const settingsFile = NodePath.join(dataDir, "settings.json");
let language = null;
try {
  language = JSON.parse(NodeFS.readFileSync(settingsFile, "utf8")).language ?? null;
} catch {
  // First demo start: the setup's language step is skipped, Glose follows the system language.
}
NodeFS.mkdirSync(dataDir, { recursive: true });
NodeFS.writeFileSync(settingsFile, JSON.stringify({ language, graphFolder }));

console.log(`Demo Graph: ${graphFolder}${keep ? " (kept from the last start)" : ""}`);

const script = process.argv.includes("--desktop") ? "dev:desktop" : "dev";
const child = NodeChildProcess.spawn("pnpm", ["run", script], {
  cwd: root,
  env: { ...process.env, GLOSE_DATA_DIR: dataDir },
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

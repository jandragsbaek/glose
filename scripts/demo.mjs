import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const demoDir = NodePath.join(NodeOS.tmpdir(), "glose-demo");
const vaultFolder = NodePath.join(demoDir, "Vault");
const dataDir = NodePath.join(demoDir, "app-data");

const keep = process.argv.includes("--keep") && NodeFS.existsSync(vaultFolder);
if (!keep) {
  NodeFS.rmSync(vaultFolder, { recursive: true, force: true });
  NodeFS.cpSync(NodePath.join(root, "demo", "Vault"), vaultFolder, { recursive: true });
  NodeFS.mkdirSync(NodePath.join(vaultFolder, ".glose"), { recursive: true });
  NodeFS.writeFileSync(NodePath.join(vaultFolder, ".glose", "settings.json"), "{}");
}

const settingsFile = NodePath.join(dataDir, "settings.json");
let language = null;
try {
  language = JSON.parse(NodeFS.readFileSync(settingsFile, "utf8")).language ?? null;
} catch {}
NodeFS.mkdirSync(dataDir, { recursive: true });
NodeFS.writeFileSync(settingsFile, JSON.stringify({ language, vaultFolder }));

console.log(`Demo Vault: ${vaultFolder}${keep ? " (kept from the last start)" : ""}`);

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

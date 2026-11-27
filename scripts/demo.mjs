import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { countOption, generateVault } from "./generate-vault.mjs";

const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const nodes = countOption(
  process.argv,
  "--nodes",
  process.argv.includes("--large") ? 10_000 : null,
);
const demoDir = NodePath.join(NodeOS.tmpdir(), nodes === null ? "glose-demo" : "glose-demo-large");
const vaultFolder = NodePath.join(demoDir, "Vault");
const dataDir = NodePath.join(demoDir, "app-data");

const keep = process.argv.includes("--keep") && NodeFS.existsSync(vaultFolder);
if (!keep) {
  NodeFS.rmSync(vaultFolder, { recursive: true, force: true });
  NodeFS.cpSync(NodePath.join(root, "demo", "Vault"), vaultFolder, { recursive: true });
  const written = NodeFS.readdirSync(vaultFolder).filter((entry) => entry.endsWith(".md")).length;
  if (nodes !== null && nodes > written) {
    const made = generateVault(vaultFolder, { nodes: nodes - written });
    console.log(
      `Generated ${made.sources} Sources, ${made.notes} Notes, ${made.people} People and ${made.passages} Passages`,
    );
  }
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

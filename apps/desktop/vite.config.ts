import { defineConfig } from "vite-plus";

const isElectron = (id: string) => id === "electron" || id.startsWith("electron/");

export default defineConfig({
  // Everything but Electron itself goes into one file per entry, so the installer needs no
  // node_modules. The preload runs sandboxed, where require() knows little more than electron.
  pack: ["main", "preload"].map((name) => ({
    entry: { [name]: `src/${name}.ts` },
    format: "cjs",
    outDir: "dist-electron",
    dts: false,
    sourcemap: true,
    // Both entries share the folder, so neither empties it.
    clean: false,
    outExtensions: () => ({ js: ".cjs" }),
    outputOptions: { codeSplitting: false },
    deps: {
      alwaysBundle: (id) => !id.startsWith("node:") && !isElectron(id),
      neverBundle: isElectron,
      onlyBundle: false,
    },
  })),
});

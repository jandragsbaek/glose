import { defineConfig } from "vite-plus";

const isElectron = (id: string) => id === "electron" || id.startsWith("electron/");

export default defineConfig({
  // Everything but Electron itself goes into one file, so the installer needs no node_modules.
  pack: {
    entry: ["src/main.ts"],
    format: "cjs",
    outDir: "dist-electron",
    dts: false,
    sourcemap: true,
    clean: true,
    outExtensions: () => ({ js: ".cjs" }),
    outputOptions: { codeSplitting: false },
    deps: {
      alwaysBundle: (id) => !id.startsWith("node:") && !isElectron(id),
      neverBundle: isElectron,
      onlyBundle: false,
    },
  },
});

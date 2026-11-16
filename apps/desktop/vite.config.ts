import { defineConfig } from "vite-plus";

const isElectron = (id: string) => id === "electron" || id.startsWith("electron/");

export default defineConfig({
  pack: ["main", "preload"].map((name) => ({
    entry: { [name]: `src/${name}.ts` },
    format: "cjs",
    outDir: "dist-electron",
    dts: false,
    sourcemap: true,
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

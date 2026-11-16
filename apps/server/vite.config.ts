import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/bin.ts"],
    format: "esm",
    outDir: "dist",
    dts: false,
    sourcemap: true,
    clean: true,
    outputOptions: { codeSplitting: false },
    deps: {
      alwaysBundle: (id) => !id.startsWith("node:"),
      onlyBundle: false,
    },
  },
});

import { RPC_PATH } from "@glose/contracts";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { PAINT_SCRIPT } from "./src/theme/paint.ts";

const server = `http://127.0.0.1:${process.env.GLOSE_PORT ?? "4310"}`;

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({ compiler: true }),
    {
      name: "glose-paint-appearance",
      transformIndexHtml: () => [
        { tag: "script", children: PAINT_SCRIPT, injectTo: "head-prepend" },
      ],
    },
  ],
  server: {
    port: Number(process.env.PORT ?? 5183),
    strictPort: true,
    proxy: { [RPC_PATH]: server },
  },
});

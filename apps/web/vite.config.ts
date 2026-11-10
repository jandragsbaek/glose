import { RPC_PATH } from "@glose/contracts";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const server = `http://127.0.0.1:${process.env.GLOSE_PORT ?? "4310"}`;

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({ compiler: true }),
  ],
  server: {
    port: Number(process.env.PORT ?? 5183),
    // The desktop app waits for exactly this address, so never drift to the next free port.
    strictPort: true,
    // Single origin in dev, as in production: Vite forwards the app RPC.
    proxy: { [RPC_PATH]: server },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["@mysten/walrus"],
    include: ["dataloader"],
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    target: "esnext",
    rollupOptions: {
      external: (id) => id.includes("node_modules") && id.includes(".wasm"),
    },
    commonjsOptions: {
      include: [/dataloader/, /node_modules/],
    },
  },
  define: {
    global: "globalThis",
  },
});

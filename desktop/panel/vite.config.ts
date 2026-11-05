import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// run from the repo root, the panel builds next to the UI it ships with
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/panel/",
  plugins: [svelte()],

  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
  },

  build: {
    outDir: "../../build/panel",
    emptyOutDir: true,
    // WKWebView only, and minimumSystemVersion is macOS 13
    target: "safari16",
  },
});

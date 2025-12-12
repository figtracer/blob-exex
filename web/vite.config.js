import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-icons",
      closeBundle() {
        const iconsDir = path.resolve(__dirname, "../static/icons");
        const outIconsDir = path.resolve(__dirname, "../static/icons");

        // Icons are already in static/icons, no need to copy
        // This plugin just ensures they're not deleted during build
      },
    },
  ],
  build: {
    outDir: "../static",
    emptyOutDir: false, // Changed to false to preserve icons folder
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  publicDir: false, // We manage static assets manually
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/icons": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

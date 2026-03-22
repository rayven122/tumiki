import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
        output: {
          format: "cjs",
        },
        external: [
          "electron",
          /^\.prisma\/desktop-client/,
          /prisma\/generated\/client/,
        ],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
        output: {
          format: "cjs",
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    build: {
      outDir: resolve(__dirname, "dist-electron/renderer"),
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
      },
    },
    css: {
      postcss: "./postcss.config.js",
    },
    plugins: [react()],
  },
});

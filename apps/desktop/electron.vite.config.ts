import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { config } from "dotenv";

// .envファイルを読み込み
config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      // メインプロセス用の環境変数をビルド時に埋め込み
      "process.env.KEYCLOAK_ISSUER": JSON.stringify(
        process.env.KEYCLOAK_ISSUER,
      ),
      "process.env.DESKTOP_KEYCLOAK_CLIENT_ID": JSON.stringify(
        process.env.DESKTOP_KEYCLOAK_CLIENT_ID,
      ),
      "process.env.DESKTOP_KEYCLOAK_CLIENT_SECRET": JSON.stringify(
        process.env.DESKTOP_KEYCLOAK_CLIENT_SECRET,
      ),
    },
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

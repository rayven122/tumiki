import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { existsSync } from "fs";
import { config } from "dotenv";

// .envファイルが存在する場合のみ読み込み（ローカル開発用）
// CI環境では環境変数が直接設定されるため、既存の環境変数を上書きしない
const envPath = resolve(__dirname, "../../.env");
if (existsSync(envPath)) {
  config({ path: envPath, override: false });
}

// 環境変数の値を取得（CI環境ではシェル環境変数から、ローカルでは.envから）
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const DESKTOP_KEYCLOAK_CLIENT_ID = process.env.DESKTOP_KEYCLOAK_CLIENT_ID;
const DESKTOP_KEYCLOAK_CLIENT_SECRET = process.env.DESKTOP_KEYCLOAK_CLIENT_SECRET;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      // メインプロセス用の環境変数をビルド時に埋め込み
      "process.env.KEYCLOAK_ISSUER": JSON.stringify(KEYCLOAK_ISSUER),
      "process.env.DESKTOP_KEYCLOAK_CLIENT_ID": JSON.stringify(
        DESKTOP_KEYCLOAK_CLIENT_ID,
      ),
      "process.env.DESKTOP_KEYCLOAK_CLIENT_SECRET": JSON.stringify(
        DESKTOP_KEYCLOAK_CLIENT_SECRET,
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

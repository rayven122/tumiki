import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["oauth4webapi"] })],
    // KEYCLOAK_ISSUER などの環境変数は意図的にバンドルへ焼き込まない。
    // mainプロセスはNode実行環境のため、process.envは実行時に参照可能。
    // ビルド時に焼き込むと開発用の値（localhost等）が配布バイナリに残り、
    // 起動時のOIDC Discoveryで不到達URLにfetchして失敗する原因になる。
    resolve: {
      alias: {
        "@prisma/desktop-client": resolve(__dirname, "prisma/generated/client"),
      },
    },
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          "mcp-process": resolve(
            __dirname,
            "../../packages/mcp-core-proxy/src/process.ts",
          ),
          "mcp-cli": resolve(
            __dirname,
            "../../packages/mcp-core-proxy/src/cli.ts",
          ),
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
    publicDir: resolve(__dirname, "public"),
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

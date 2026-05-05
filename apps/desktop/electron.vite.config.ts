import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Prisma 生成クライアントの絶対パス（ビルドマシン上のもの）と、
// bundle 出力 (dist-electron/main/index.cjs) からの相対パス。
// alias で絶対パスに解決 → external で素通し → output.paths で相対パスに書き戻す、
// の3段構成でビルドマシン固有のパスが require() に inline されるのを防ぐ。
//
// 相対パスを直接 alias に書くと vite が importer (src/main/index.ts や
// packages/mcp-core-proxy 配下) の場所を起点に解決し直してしまい、
// 出力に複数の異なる絶対パスが混在する。output.paths 経由なら出力時の
// 一括書き換えになるので importer 位置に依存しない。
const PRISMA_DESKTOP_CLIENT_ABS = resolve(__dirname, "prisma/generated/client");
const PRISMA_DESKTOP_CLIENT_REL = "../../prisma/generated/client";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["oauth4webapi"] })],
    define: {
      "process.env.KEYCLOAK_ISSUER": JSON.stringify(
        process.env.KEYCLOAK_ISSUER ?? "",
      ),
      "process.env.KEYCLOAK_DESKTOP_CLIENT_ID": JSON.stringify(
        process.env.KEYCLOAK_DESKTOP_CLIENT_ID ?? "",
      ),
    },
    resolve: {
      alias: {
        "@prisma/desktop-client": PRISMA_DESKTOP_CLIENT_ABS,
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
          // 絶対パスのまま external 化された Prisma client 参照を、
          // bundle 出力ファイルからの相対パスに書き戻す。
          paths: {
            [PRISMA_DESKTOP_CLIENT_ABS]: PRISMA_DESKTOP_CLIENT_REL,
          },
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

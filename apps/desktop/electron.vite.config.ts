import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

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
        "@prisma/desktop-client": resolve(__dirname, "prisma/generated/client"),
      },
    },
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          "analytics-node": resolve(__dirname, "src/main/analytics-node.ts"),
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
          chunkFileNames: "[name]-[hash].cjs",
          // ビルドホストの絶対パス（CI: /Users/runner/...、開発者ローカル等）が
          // require() に焼き込まれるのを防ぐため、external 化された Prisma client への
          // 参照を出力ディレクトリ（dist-electron/main）からの相対パスに固定する。
          // asar.unpacked 配下の prisma/generated/client/ に解決される。
          paths: (id) => {
            if (
              id.includes("prisma/generated/client") ||
              id.startsWith(".prisma/desktop-client")
            ) {
              return "../../prisma/generated/client";
            }
            return id;
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

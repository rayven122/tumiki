import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// `@prisma/desktop-client` を bundle 出力 (dist-electron/main/index.cjs) からの
// 相対パスとして external 化する rollup plugin。
//
// 過去の実装は alias で絶対パスに解決 → external regex → output.paths で相対パスに
// 書き戻す3段構成だったが、Windows では path.resolve がバックスラッシュ区切りを
// 返す一方 rollup は内部 ID をフォワードスラッシュに正規化するため
// output.paths のキー一致が外れ、絶対パス (D:/a/.../prisma/generated/client) が
// require() に焼き込まれて配布先で Cannot find module で落ちていた。
//
// プラグイン内で直接相対文字列を返せば絶対パスが一度も生成されず、
// プラットフォーム間のパス区切りの差を吸収できる。
const prismaDesktopClientPlugin = () => ({
  name: "prisma-desktop-client-relative",
  resolveId: (source: string) => {
    if (source === "@prisma/desktop-client") {
      return { id: "../../prisma/generated/client", external: true };
    }
    return null;
  },
});

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ["oauth4webapi"] }),
      prismaDesktopClientPlugin(),
    ],
    define: {
      "process.env.KEYCLOAK_ISSUER": JSON.stringify(
        process.env.KEYCLOAK_ISSUER ?? "",
      ),
      "process.env.KEYCLOAK_DESKTOP_CLIENT_ID": JSON.stringify(
        process.env.KEYCLOAK_DESKTOP_CLIENT_ID ?? "",
      ),
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
        external: ["electron"],
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

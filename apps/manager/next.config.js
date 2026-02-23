import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EE版ビルドの判定
// TUMIKI_EDITION=ee または NEXT_PUBLIC_EE_BUILD=true でEE版
const isEEBuild =
  process.env.TUMIKI_EDITION === "ee" ||
  process.env.NEXT_PUBLIC_EE_BUILD === "true";

/** @type {import("next").NextConfig} */
const config = {
  // React Strict Mode を無効化
  reactStrictMode: false,
  // 静的アセットのgzip圧縮を有効化（60-80%のファイルサイズ削減）
  compress: true,
  // Turbopackで解決できないパッケージをサーバー外部パッケージとして指定
  serverExternalPackages: ["cron-parser", "@tumiki/prompts"],
  // MCP サーバーを有効化（Next.js DevTools用）
  experimental: {
    mcpServer: true,
  },
  // CE版ビルド時に.ee.tsファイルをCEスタブ(.ts)にリダイレクト
  webpack: (config, { isServer }) => {
    if (!isEEBuild) {
      // CE版ビルド: .ee.ts/.ee.tsx ファイルをCEスタブ(.ts/.tsx)にリダイレクト
      // これにより、EE実装の代わりにFORBIDDENエラーを返すスタブが使用される
      /** @type {any} */
      const cePlugin = {
        /** @param {any} compiler */
        apply(/** @type {any} */ compiler) {
          compiler.hooks.normalModuleFactory.tap(
            "CEBuildPlugin",
            /** @param {any} nmf */ (/** @type {any} */ nmf) => {
              nmf.hooks.beforeResolve.tap(
                "CEBuildPlugin",
                /** @param {any} resolveData */ (
                  /** @type {any} */ resolveData,
                ) => {
                  // .ee.ts → .ts, .ee.tsx → .tsx にリダイレクト
                  if (
                    resolveData.request &&
                    resolveData.request.includes(".ee")
                  ) {
                    resolveData.request = resolveData.request.replace(
                      ".ee",
                      "",
                    );
                  }
                },
              );
            },
          );
        },
      };
      config.plugins.push(cePlugin);
    }
    return config;
  },
  // Coharu VRM/VRMA ファイルの長期キャッシュ設定
  async headers() {
    return [
      {
        source: "/coharu/:path*",
        headers: [
          {
            key: "Cache-Control",
            // 1週間はキャッシュを使用、その後はバックグラウンドで再検証しながらキャッシュを提供
            value: "public, max-age=604800, stale-while-revalidate=31536000",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
      {
        protocol: "https",
        hostname: "icons.duckduckgo.com",
        pathname: "/ip3/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.microcms-assets.io",
        pathname: "/**",
      },
      // Cloudflare R2 (カスタムドメイン)
      {
        protocol: "https",
        hostname: "assets.tumiki.cloud",
        pathname: "/**",
      },
    ],
  },
};

export default config;

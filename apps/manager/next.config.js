/** @type {import("next").NextConfig} */
const config = {
  // Docker / Cloud Run 用にスタンドアロンモードで出力
  output: "standalone",
  // React Strict Mode を無効化
  reactStrictMode: false,
  // 静的アセットのgzip圧縮を有効化（60-80%のファイルサイズ削減）
  compress: true,
  // MCP サーバーを有効化（Next.js DevTools用）
  experimental: {
    mcpServer: true,
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

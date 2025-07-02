/** @type {import("next").NextConfig} */
const config = {
  // MCPサーバーファイルをビルドに含める設定
  outputFileTracingIncludes: {
    "/mcp/servers": ["./mcp/*"],
  },

  // 画像最適化設定
  images: {
    // 次世代画像フォーマット対応（WebP: 20-35%削減、AVIF: 50%削減）
    formats: ["image/webp", "image/avif"],
    // 画像キャッシュ期間: 1年間（再訪問時の高速化）
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
  },

  // 静的アセットのgzip圧縮を有効化（60-80%のファイルサイズ削減）
  compress: true,

  // バンドルサイズ最適化
  experimental: {
    // 使用していないアイコンを自動除外してバンドルサイズ削減
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
  },
};

export default config;

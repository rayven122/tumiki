/** @type {import("next").NextConfig} */
const config = {
  // Docker / Cloud Run 用にスタンドアロンモードで出力
  output: "standalone",
  // React Strict Mode を無効化
  reactStrictMode: false,
  // Docker ビルド時にテスト関連ファイルを除外した tsconfig.build.json を使用
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
  },
};

export default config;

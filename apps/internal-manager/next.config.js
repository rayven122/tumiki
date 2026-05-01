/** @type {import("next").NextConfig} */
const config = {
  // Docker / Cloud Run 用にスタンドアロンモードで出力
  output: "standalone",
  // React Strict Mode を無効化
  reactStrictMode: false,
  // saml-jackson は内部で動的 import (Function コンストラクタ経由) で jose を読み込むため、
  // Next.js のバンドルトレースに引っかからず standalone 出力から漏れる。
  // serverExternalPackages 指定で外部パッケージ扱いとし、standalone の node_modules にコピーさせる。
  serverExternalPackages: ["@boxyhq/saml-jackson", "jose"],
  // Docker ビルド時にテスト関連ファイルを除外した tsconfig.build.json を使用
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
  },
  // /.well-known/* は OIDC Discovery 用の標準パス。
  // Next.js のフォルダ名に dot prefix を含めると ESLint project service と相性が悪いため、
  // 実装は /api/well-known/* に置き、rewrites で /.well-known/* を内部マッピングする。
  rewrites: () => [
    {
      source: "/.well-known/openid-configuration",
      destination: "/api/well-known/openid-configuration",
    },
    {
      source: "/.well-known/jwks.json",
      destination: "/api/well-known/jwks.json",
    },
  ],
};

export default config;

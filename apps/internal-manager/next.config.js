/** @type {import("next").NextConfig} */
const config = {
  // Docker / Cloud Run 用にスタンドアロンモードで出力
  output: "standalone",
  // React Strict Mode を無効化
  reactStrictMode: false,
  // saml-jackson は内部で動的 import (Function コンストラクタ経由) で jose / openid-client を読み込むため、
  // Next.js のバンドルトレースに引っかからず standalone 出力から漏れる。
  // serverExternalPackages 指定で外部パッケージ扱いとし、standalone の node_modules にコピーさせる。
  serverExternalPackages: ["@boxyhq/saml-jackson", "jose", "openid-client"],
  // jose は src/lib/auth で直接 import されているため NFT が拾うが、openid-client は
  // saml-jackson 内部の Function 動的 import 経由でしか参照されないため明示的に含める必要がある。
  // pnpm の仮想ストア構造をそのまま include する。
  outputFileTracingIncludes: {
    "*": ["../../node_modules/.pnpm/openid-client@*/node_modules/openid-client/**/*"],
  },
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
    // jackson の OIDC Discovery が返す jwks_uri は /oauth/jwks のため rewrite で吸収する
    {
      source: "/oauth/jwks",
      destination: "/api/well-known/jwks.json",
    },
  ],
};

export default config;

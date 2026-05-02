import jackson, {
  type JacksonOption,
  type SAMLJackson,
} from "@boxyhq/saml-jackson";

/**
 * @boxyhq/saml-jackson 初期化モジュール
 *
 * 役割:
 * - SAML SP として顧客 SAML IdP を federate
 * - OIDC Connection として顧客 OIDC IdP を federate
 * - OIDC IdP として アプリ（Auth.js）に統一フォーマットで認証結果を提供
 * - SCIM Server として顧客 IdP からの user/group 同期を受信
 *
 * 設計: 認証・プロビジョニング統合設計
 * @see https://docs.rayven.cloud/doc/phase-2-15ARZRLaxD
 */

let jacksonInstance: SAMLJackson | null = null;
let initPromise: Promise<SAMLJackson> | null = null;

/**
 * 公開 URL の解決ロジック（jackson モジュールと登録スクリプトで共有）
 * - 優先: NEXTAUTH_URL_INTERNAL_MANAGER → NEXTAUTH_URL → localhost
 */
export const resolveExternalUrl = (): string =>
  process.env.NEXTAUTH_URL_INTERNAL_MANAGER ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3100";

const buildJacksonOption = (): JacksonOption => {
  const externalUrl = resolveExternalUrl();

  const dbUrl = process.env.INTERNAL_DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "INTERNAL_DATABASE_URL is required for @boxyhq/saml-jackson",
    );
  }

  // jackson が DB 暗号化に使う鍵（32 文字以上）
  const encryptionKey = process.env.JACKSON_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error(
      "JACKSON_ENCRYPTION_KEY must be at least 32 characters long",
    );
  }

  return {
    externalUrl,
    // SAML SP の Entity ID（SAMLRequest の Issuer として送出される）
    // 未設定だと jackson デフォルトの https://saml.boxyhq.com になり Google に拒否される
    samlAudience: externalUrl,
    // SAML SP の ACS URL（顧客 SAML IdP からのレスポンスを受ける）
    samlPath: "/api/saml/acs",
    // OIDC Connection のコールバック URL（顧客 OIDC IdP からのコールバックを受ける）
    oidcPath: "/api/oauth/oidc",
    // OIDC IdP として動作（アプリ向けに OIDC を提供）
    idpEnabled: true,
    db: {
      engine: "sql",
      type: "postgres",
      url: dbUrl,
      encryptionKey,
      ttl: 300,
    },
    // OIDC IdP の ID Token 署名鍵
    openid: {
      jwsAlg: "RS256",
      ...(process.env.JACKSON_OIDC_PRIVATE_KEY &&
      process.env.JACKSON_OIDC_PUBLIC_KEY
        ? {
            jwtSigningKeys: {
              private: process.env.JACKSON_OIDC_PRIVATE_KEY,
              public: process.env.JACKSON_OIDC_PUBLIC_KEY,
            },
          }
        : {}),
    },
    noAnalytics: true,
    logger: {
      info: (msg, err) => console.info("[jackson]", msg, err ?? ""),
      warn: (msg, err) => console.warn("[jackson]", msg, err ?? ""),
      error: (msg, err) => console.error("[jackson]", msg, err ?? ""),
    },
  };
};

/**
 * jackson 設定が完了しているかを env 変数で判定
 *
 * 必須環境変数が揃っていない時は初期化を試みず、エンドポイント側で
 * 503 を返すようにする（500 エラーで全体障害にしない）。
 */
export const isJacksonConfigured = (): boolean =>
  !!process.env.INTERNAL_DATABASE_URL &&
  !!process.env.JACKSON_ENCRYPTION_KEY &&
  process.env.JACKSON_ENCRYPTION_KEY.length >= 32;

/**
 * jackson インスタンスを取得（シングルトン）
 *
 * Next.js のサーバーレス環境では複数の Lambda インスタンスが立ち上がるが、
 * 各インスタンスごとに 1 つの jackson controller を保持する。
 *
 * 初期化失敗時は initPromise を null に戻して次回リクエストで再試行できる
 * ようにする（DB の一時障害等で永続的に死なないため）。
 */
export const getJackson = async (): Promise<SAMLJackson> => {
  if (jacksonInstance) {
    return jacksonInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const option = buildJacksonOption();
      // tsx (Node.js CJS) 環境では ESM default import が module object になるため interop が必要
      const jacksonFn =
        (jackson as unknown as { default?: typeof jackson }).default ?? jackson;
      const instance = await jacksonFn(option);
      jacksonInstance = instance;
      return instance;
    } catch (e) {
      // 失敗時はリセットして次回リクエストで再試行可能にする
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
};

/**
 * テスト・ホットリロード用：jackson インスタンスをリセット
 */
export const resetJackson = (): void => {
  jacksonInstance = null;
  initPromise = null;
};

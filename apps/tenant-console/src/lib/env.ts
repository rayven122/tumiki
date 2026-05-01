import { z } from "zod";

const envSchema = z.object({
  TENANT_DATABASE_URL: z.string().url(),

  // Infisical 操作用 (テナント自動プロビジョニング)
  INFISICAL_API_URL: z.string().url(),
  INFISICAL_ORG_ID: z.string().min(1),
  INFISICAL_OPERATOR_CLIENT_ID: z.string().min(1),
  INFISICAL_OPERATOR_CLIENT_SECRET: z.string().min(1),
  INFISICAL_OPERATOR_IDENTITY_ID: z.string().min(1),

  // ライセンス JWT 署名用秘密鍵（RS256 PKCS#8 PEM）
  LICENSE_SIGNING_PRIVATE_KEY: z.string().min(1),

  // ライセンス署名鍵を取得する Infisical プロジェクト ID
  INFISICAL_LICENSE_PROJECT_ID: z.string().min(1),
});

export const env = envSchema.parse(process.env);

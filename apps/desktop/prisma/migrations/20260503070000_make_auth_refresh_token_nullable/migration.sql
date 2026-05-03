-- 既存の開発DBは refreshToken/idToken が nullable になる前に作成されている場合がある。
-- refresh_token を発行しない OIDC provider でもログイン完了できるように
-- AuthToken を再構築する。
DROP TABLE IF EXISTS "AuthToken_new";

CREATE TABLE "AuthToken_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "AuthToken_new" (
    "id",
    "accessToken",
    "refreshToken",
    "idToken",
    "expiresAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "accessToken",
    "refreshToken",
    "idToken",
    "expiresAt",
    "createdAt",
    "updatedAt"
FROM "AuthToken";

DROP TABLE "AuthToken";
ALTER TABLE "AuthToken_new" RENAME TO "AuthToken";

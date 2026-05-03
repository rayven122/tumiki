-- Existing development databases may have been created before refreshToken/idToken
-- became nullable. Rebuild AuthToken so OIDC providers that do not issue
-- refresh_token can still complete login.
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

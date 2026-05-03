-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuthToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AuthToken" ("accessToken", "createdAt", "expiresAt", "id", "idToken", "refreshToken", "updatedAt") SELECT "accessToken", "createdAt", "expiresAt", "id", "idToken", "refreshToken", "updatedAt" FROM "AuthToken";
DROP TABLE "AuthToken";
ALTER TABLE "new_AuthToken" RENAME TO "AuthToken";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

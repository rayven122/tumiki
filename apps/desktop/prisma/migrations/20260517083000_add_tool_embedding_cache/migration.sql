CREATE TABLE "McpToolEmbeddingCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toolId" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "textVersion" INTEGER NOT NULL,
    "dim" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vector" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McpToolEmbeddingCache_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "McpTool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "McpToolEmbeddingCache_toolId_modelId_textVersion_key" ON "McpToolEmbeddingCache"("toolId", "modelId", "textVersion");
CREATE INDEX "McpToolEmbeddingCache_modelId_textVersion_idx" ON "McpToolEmbeddingCache"("modelId", "textVersion");

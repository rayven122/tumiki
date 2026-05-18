-- CreateTable
CREATE TABLE "AiCodingMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tool" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "attributes" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AiCodingTrace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tool" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "attributes" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AiCodingMetric_tool_metricName_recordedAt_idx" ON "AiCodingMetric"("tool", "metricName", "recordedAt");

-- CreateIndex
CREATE INDEX "AiCodingTrace_tool_startedAt_idx" ON "AiCodingTrace"("tool", "startedAt");

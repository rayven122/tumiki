/*
  Warnings:

  - You are about to drop the `_McpServerToMcpServerTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_McpServerToMcpTool` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_McpServerToMcpServerTemplate" DROP CONSTRAINT "_McpServerToMcpServerTemplate_A_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpServerTemplate" DROP CONSTRAINT "_McpServerToMcpServerTemplate_B_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpTool" DROP CONSTRAINT "_McpServerToMcpTool_A_fkey";

-- DropForeignKey
ALTER TABLE "_McpServerToMcpTool" DROP CONSTRAINT "_McpServerToMcpTool_B_fkey";

-- DropTable
DROP TABLE "_McpServerToMcpServerTemplate";

-- DropTable
DROP TABLE "_McpServerToMcpTool";

-- CreateTable
CREATE TABLE "McpServerTemplateInstance" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "mcpServerTemplateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "McpServerTemplateInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_McpServerTemplateInstanceToMcpTool" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_McpServerTemplateInstanceToMcpTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpServerTemplateInstance_mcpServerId_mcpServerTemplateId_key" ON "McpServerTemplateInstance"("mcpServerId", "mcpServerTemplateId");

-- CreateIndex
CREATE INDEX "_McpServerTemplateInstanceToMcpTool_B_index" ON "_McpServerTemplateInstanceToMcpTool"("B");

-- AddForeignKey
ALTER TABLE "McpServerTemplateInstance" ADD CONSTRAINT "McpServerTemplateInstance_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerTemplateInstance" ADD CONSTRAINT "McpServerTemplateInstance_mcpServerTemplateId_fkey" FOREIGN KEY ("mcpServerTemplateId") REFERENCES "McpServerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_McpServerTemplateInstanceToMcpTool" ADD CONSTRAINT "_McpServerTemplateInstanceToMcpTool_A_fkey" FOREIGN KEY ("A") REFERENCES "McpServerTemplateInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_McpServerTemplateInstanceToMcpTool" ADD CONSTRAINT "_McpServerTemplateInstanceToMcpTool_B_fkey" FOREIGN KEY ("B") REFERENCES "McpTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

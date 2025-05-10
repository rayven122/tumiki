/*
  Warnings:

  - You are about to drop the `_ApiKeyToTool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ToolToToolGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ApiKeyToTool" DROP CONSTRAINT "_ApiKeyToTool_A_fkey";

-- DropForeignKey
ALTER TABLE "_ApiKeyToTool" DROP CONSTRAINT "_ApiKeyToTool_B_fkey";

-- DropForeignKey
ALTER TABLE "_ToolToToolGroup" DROP CONSTRAINT "_ToolToToolGroup_A_fkey";

-- DropForeignKey
ALTER TABLE "_ToolToToolGroup" DROP CONSTRAINT "_ToolToToolGroup_B_fkey";

-- DropTable
DROP TABLE "_ApiKeyToTool";

-- DropTable
DROP TABLE "_ToolToToolGroup";

-- CreateTable
CREATE TABLE "ToolGroupTool" (
    "id" TEXT NOT NULL,
    "toolGroupId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userMcpServerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolGroupTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolGroupTool_toolGroupId_toolId_userMcpServerId_key" ON "ToolGroupTool"("toolGroupId", "toolId", "userMcpServerId");

-- AddForeignKey
ALTER TABLE "ToolGroupTool" ADD CONSTRAINT "ToolGroupTool_toolGroupId_fkey" FOREIGN KEY ("toolGroupId") REFERENCES "ToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolGroupTool" ADD CONSTRAINT "ToolGroupTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolGroupTool" ADD CONSTRAINT "ToolGroupTool_userMcpServerId_fkey" FOREIGN KEY ("userMcpServerId") REFERENCES "UserMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

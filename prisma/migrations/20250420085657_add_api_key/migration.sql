/*
  Warnings:

  - You are about to drop the column `toolOrder` on the `ToolGroup` table. All the data in the column will be lost.
  - You are about to drop the `ApiAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ApiAccessToTool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ApiAccessToToolGroup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `ToolGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ApiAccessToTool" DROP CONSTRAINT "_ApiAccessToTool_A_fkey";

-- DropForeignKey
ALTER TABLE "_ApiAccessToTool" DROP CONSTRAINT "_ApiAccessToTool_B_fkey";

-- DropForeignKey
ALTER TABLE "_ApiAccessToToolGroup" DROP CONSTRAINT "_ApiAccessToToolGroup_A_fkey";

-- DropForeignKey
ALTER TABLE "_ApiAccessToToolGroup" DROP CONSTRAINT "_ApiAccessToToolGroup_B_fkey";

-- AlterTable
ALTER TABLE "ToolGroup" DROP COLUMN "toolOrder",
ADD COLUMN     "order" TEXT[],
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ApiAccess";

-- DropTable
DROP TABLE "_ApiAccessToTool";

-- DropTable
DROP TABLE "_ApiAccessToToolGroup";

-- CreateTable
CREATE TABLE "UserMcpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "envVars" TEXT[],
    "mcpServerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMcpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApiKeyToToolGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApiKeyToToolGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ApiKeyToTool" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApiKeyToTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ToolToUserMcpServer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ToolToUserMcpServer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ApiKeyToToolGroup_B_index" ON "_ApiKeyToToolGroup"("B");

-- CreateIndex
CREATE INDEX "_ApiKeyToTool_B_index" ON "_ApiKeyToTool"("B");

-- CreateIndex
CREATE INDEX "_ToolToUserMcpServer_B_index" ON "_ToolToUserMcpServer"("B");

-- AddForeignKey
ALTER TABLE "UserMcpServer" ADD CONSTRAINT "UserMcpServer_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMcpServer" ADD CONSTRAINT "UserMcpServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolGroup" ADD CONSTRAINT "ToolGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToToolGroup" ADD CONSTRAINT "_ApiKeyToToolGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToToolGroup" ADD CONSTRAINT "_ApiKeyToToolGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "ToolGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToTool" ADD CONSTRAINT "_ApiKeyToTool_A_fkey" FOREIGN KEY ("A") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToTool" ADD CONSTRAINT "_ApiKeyToTool_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUserMcpServer" ADD CONSTRAINT "_ToolToUserMcpServer_A_fkey" FOREIGN KEY ("A") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUserMcpServer" ADD CONSTRAINT "_ToolToUserMcpServer_B_fkey" FOREIGN KEY ("B") REFERENCES "UserMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

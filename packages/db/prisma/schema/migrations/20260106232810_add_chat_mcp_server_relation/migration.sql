/*
  Warnings:

  - The `visibility` column on the `Chat` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `organizationId` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "organizationId" TEXT NOT NULL,
DROP COLUMN "visibility",
ADD COLUMN     "visibility" "McpServerVisibility" NOT NULL DEFAULT 'PRIVATE';

-- DropEnum
DROP TYPE "Visibility";

-- CreateTable
CREATE TABLE "_ChatToMcpServer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChatToMcpServer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChatToMcpServer_B_index" ON "_ChatToMcpServer"("B");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToMcpServer" ADD CONSTRAINT "_ChatToMcpServer_A_fkey" FOREIGN KEY ("A") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToMcpServer" ADD CONSTRAINT "_ChatToMcpServer_B_fkey" FOREIGN KEY ("B") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

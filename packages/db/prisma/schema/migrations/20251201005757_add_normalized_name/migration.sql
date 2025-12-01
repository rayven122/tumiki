/*
  Warnings:

  - A unique constraint covering the columns `[normalizedName,organizationId]` on the table `McpServerTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedName` to the `McpServerTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: normalizedNameカラムを追加
ALTER TABLE "McpServerTemplate" ADD COLUMN "normalizedName" TEXT;

-- 既存データを更新（小文字化、空白をハイフンに変換）
UPDATE "McpServerTemplate"
SET "normalizedName" = LOWER(REPLACE("name", ' ', '-'));

-- NOT NULL制約を追加
ALTER TABLE "McpServerTemplate" ALTER COLUMN "normalizedName" SET NOT NULL;

-- 複合ユニーク制約を追加（normalizedName + organizationId）
CREATE UNIQUE INDEX "McpServerTemplate_normalizedName_organizationId_key" ON "McpServerTemplate"("normalizedName", "organizationId");

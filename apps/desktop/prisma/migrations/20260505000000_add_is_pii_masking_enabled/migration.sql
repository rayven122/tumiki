-- McpServerにisPiiMaskingEnabledフラグを追加（サーバー単位でPIIマスキングのON/OFFを切り替え）
-- 既存ユーザーはデフォルトtrueで従来挙動を維持
ALTER TABLE "McpServer" ADD COLUMN "isPiiMaskingEnabled" BOOLEAN NOT NULL DEFAULT true;

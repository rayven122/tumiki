-- McpServerにisToonConversionEnabledフラグを追加（サーバー単位でTOON変換（レスポンス圧縮）のON/OFFを切り替え）
-- 既存ユーザーはデフォルトfalseで従来挙動を維持。命名は同 model の isPiiMaskingEnabled と揃える。
ALTER TABLE "McpServer" ADD COLUMN "isToonConversionEnabled" BOOLEAN NOT NULL DEFAULT false;

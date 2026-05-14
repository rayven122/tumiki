-- refresh_token 失効を検知してUIで再認証を促すための状態カラムを追加
-- needsReauth: FATAL なリフレッシュ失敗（invalid_grant 等）を検知したら true、再認証成功でクリア
-- lastAuthErrorAt: 最後に認証エラーを検知した時刻（UI 表示・デバッグ用）

-- AlterTable
ALTER TABLE "McpSecret" ADD COLUMN "needsReauth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "McpSecret" ADD COLUMN "lastAuthErrorAt" DATETIME;

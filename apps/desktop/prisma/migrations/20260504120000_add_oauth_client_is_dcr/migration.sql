-- OAuthClientにisDcrフラグを追加（手動入力クライアントとDCR自動登録を区別）
ALTER TABLE "OAuthClient" ADD COLUMN "isDcr" BOOLEAN NOT NULL DEFAULT true;

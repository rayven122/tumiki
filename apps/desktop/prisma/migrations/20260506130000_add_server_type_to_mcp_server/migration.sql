-- McpServerにserverTypeカラムを追加（OFFICIAL = 単独コネクタ / CUSTOM = 仮想MCP）
-- 既存レコードは全件 OFFICIAL で確定（仮想MCPは現状未利用 or 移行不要のためデータ移行なし）
-- 仮想MCP配下の接続を新たな仮想MCPの素材として再ネストするのを防ぐためのフラグ
ALTER TABLE "McpServer" ADD COLUMN "serverType" TEXT NOT NULL DEFAULT 'OFFICIAL';

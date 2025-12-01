/**
 * 公式MCPサーバーテンプレート用の特別なorganizationID
 * nullの代わりにこのIDを使用することで、findUniqueで高速検索が可能
 *
 * 以下は、このIDを用いて高速検索を行うためのマイグレーション
 * packages/db/prisma/schema/migrations/20251201114644_use_official_org_id_for_templates/migration.sql
 */
export const OFFICIAL_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000";

/**
 * 公式ユーザーID
 * 公式MCPサーバーテンプレートや公式組織の作成者として使用
 */
export const OFFICIAL_USER_ID = "00000000-0000-0000-0000-000000000001";

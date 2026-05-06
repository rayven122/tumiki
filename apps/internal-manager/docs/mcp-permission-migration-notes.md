# MCP 権限モデル正規化 migration notes

このメモは `20260506000000_normalize_mcp_catalog_permissions` を本番適用する運用者向けの注意点です。

## 適用前確認

- 本番適用前にDBのフルバックアップを取得する。
- 適用は `prisma migrate deploy` で行う。新規DBでも全 migration 履歴を順に適用する場合は、先行 migration が旧権限テーブルを作成するため適用できる。
- `db push` 後のDBや、旧権限テーブルを含まない部分適用DBへこの migration を単独適用しない。migration は旧権限テーブル欠如を検出した場合に停止する。

## 権限セマンティクスの変更

旧モデルでは、承認済みの `IndividualPermission` がグループ単位の拒否より優先される場合があった。新モデルでは DENY を優先するため、`GroupMcpToolPermission.canUse=false` と `UserMcpToolPermission.canUse=false` は明示 `DENY` として移行され、個人 `ALLOW` より強く扱う。

この migration は、既存の有効な個人承認を上書きする `canUse=false` がある場合は事前検証で停止する。停止した場合は、該当するグループまたはユーザーの拒否設定と個人承認のどちらを残すかを運用判断してから再実行する。

## OrgUnit 権限の扱い

既存の `OrgUnitToolPermission` は保持する。旧モデルにはカタログ単位の部署権限に対応するデータがないため、`OrgUnitCatalogPermission` は backfill しない。

部署単位でカタログ全体の ALLOW / DENY を使う場合は、migration 適用後に internal-manager の管理画面から新規設定する。

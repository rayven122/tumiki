# 移行スクリプト

このディレクトリには、個人組織モデルへの移行に使用するスクリプトが含まれています。

## スクリプト一覧

### offline-migration.ts

バックアップDBから新しいスキーマの本番DBへデータを移行するオフライン移行スクリプト。

**実行方法:**

```bash
BACKUP_DATABASE_URL=postgresql://... DATABASE_URL=postgresql://... \
pnpm tsx packages/scripts/src/migration-completed/offline-migration.ts
```

### verify-migration.ts

移行後のデータ整合性を検証するスクリプト。

**実行方法:**

```bash
pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
```

## 関連ドキュメント

- [オフライン移行ガイド](/docs/migration/offline-migration-guide.md)
- [アーキテクチャ設計書](/docs/architecture/personal-user-organization-migration-plan.md)

## 注意事項

これらのスクリプトは移行完了後も参照用に保持されています。
TypeScriptの型チェックから除外するため、`migration-completed`ディレクトリに配置されています。

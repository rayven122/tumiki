# セキュリティドキュメント

Tumiki のセキュリティ対策、脆弱性管理、コンプライアンスに関するドキュメント。

## 📋 ドキュメント一覧

### セキュリティガイド
- [MCP Security Guide](./MCP_SECURITY_GUIDE.md) - MCP セキュリティガイドライン
- [Security](./security.md) - 一般的なセキュリティ対策
- [Security Implementation Report](./security-implementation-report.md) - セキュリティ実装レポート

### 脆弱性対応
- [MCP Vulnerability Extensibility Response](./mcp-vulnerability-extensibility-response.md) - MCP 脆弱性への対応
- [MCP Output Deviation Risk Response](./mcp-output-deviation-risk-response.md) - MCP 出力偏差リスクへの対応

### アクセス制御
- [ロール管理](./ロール管理.md) - ロールベースアクセス制御

### AI セキュリティ
- [Generative AI Safety Research](./generative-ai-safety-research.md) - 生成 AI の安全性研究

## 🛡️ セキュリティアーキテクチャ

### 多層防御戦略
1. **ネットワーク層**: ファイアウォール、DDoS 保護
2. **アプリケーション層**: 入力検証、CSRF 保護
3. **データ層**: 暗号化、アクセス制御
4. **認証層**: MFA、セッション管理

### 暗号化
- **転送中**: TLS 1.3
- **保存時**: AES-256
- **フィールドレベル**: Prisma 暗号化

### 認証・認可
- **Auth0**: エンタープライズグレード認証
- **JWT**: セキュアトークン管理
- **RBAC**: ロールベースアクセス制御
- **API キー**: スコープ制限付き

## 🔍 脆弱性管理

### 定期監査
- 依存関係スキャン
- コードセキュリティレビュー
- ペネトレーションテスト
- コンプライアンス監査

### インシデント対応
1. **検知**: 異常検知システム
2. **分析**: ログ分析、影響評価
3. **封じ込め**: 隔離、アクセス制限
4. **復旧**: パッチ適用、システム復旧
5. **事後分析**: 原因分析、改善実施

## 📝 コンプライアンス

### 準拠規格
- OWASP Top 10
- CIS Controls
- ISO 27001 準拠設計

### データ保護
- 個人情報保護
- データ最小化原則
- 保持期間管理
- 削除権の保証

## 🚨 セキュリティベストプラクティス

### 開発者向け
- セキュアコーディング規約
- 秘密情報管理（環境変数）
- 依存関係の定期更新
- セキュリティテスト自動化

### 運用者向け
- 最小権限原則
- 監査ログ有効化
- 定期的なバックアップ
- インシデント訓練

## 📚 関連リソース
- [認証ドキュメント](../auth/CLAUDE.md)
- [運用ドキュメント](../operations/CLAUDE.md)
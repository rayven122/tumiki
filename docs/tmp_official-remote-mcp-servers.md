# 公式Remote MCPサーバー一覧

このドキュメントは、2025年時点で利用可能な公式ホステッドRemote MCPサーバーの一覧と、それらの技術仕様をまとめたものです。

## 目次

- [概要](#概要)
- [確認済み公式Remote MCPサーバー](#確認済み公式remote-mcpサーバー)
- [トランスポートタイプについて](#トランスポートタイプについて)
- [OAuth認証について](#oauth認証について)
- [参考リンク](#参考リンク)

## 概要

Model Context Protocol (MCP) は、2025年にOAuth 2.1対応を含む大幅な仕様更新が行われ、多くの企業が公式のRemote MCPサーバーを提供するようになりました。これらのサーバーは、AIアシスタント（Claude、ChatGPT、Cursorなど）がセキュアにサービスのデータにアクセスできるようにします。

### MCP仕様の重要な更新（2025年）

- **2025-03-25**: OAuth認証サポートが追加
- **2025-06-18**: OAuth 2.1要件の明確化
  - MCPサーバーはOAuth 2.0 Protected Resource Metadata (RFC9728) の実装が必須
  - MCPクライアントはResource Indicators (RFC 8707) の実装が必須
  - PKCE (Proof Key for Code Exchange) のサポート
  - リフレッシュトークンローテーション（単一使用トークン）

## 確認済み公式Remote MCPサーバー

### Tumikiに追加済みのサーバー

#### 1. Context7

- **URL**: `https://mcp.context7.com/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: なし (公開サーバー)
- **機能**: ライブラリドキュメント検索サービス - 最新のドキュメントをリアルタイムで取得
- **タグ**: ドキュメント、検索、ツール

#### 2. Figma MCP

- **URL**: `https://mcp.figma.com/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: OAuth (DCR対応)
- **OAuth Scopes**: `mcp:connect`
- **機能**: デザインファイルの読み取りとコード生成
- **タグ**: デザイン、UI/UX、ツール
- **参考**: [Figma公式](https://mcp.figma.com)

#### 3. Linear MCP

- **URL**: `https://mcp.linear.app/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: OAuth
- **機能**: イシュー、プロジェクト、チーム情報へのアクセス
- **タグ**: プロジェクト管理、イシュー管理、ツール
- **参考**: [Linear MCP](https://mcp.linear.app)

#### 4. Notion MCP

- **URL**: `https://mcp.notion.com/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: OAuth
- **機能**: ワークスペースのページ、データベース、コメントへのライブアクセス
- **タグ**: ドキュメント、ナレッジベース、ツール
- **参考**: [Notion開発者ドキュメント](https://developers.notion.com/docs/get-started-with-mcp), [GitHub](https://github.com/makenotion/notion-mcp-server)

#### 5. GitHub MCP

- **URL**: `https://api.githubcopilot.com/mcp/`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: OAuth 2.0 (推奨) または PAT
- **機能**: リポジトリ、イシュー、PR、CI/CDワークフローの管理
- **タグ**: 開発、バージョン管理、CI/CD、ツール
- **リリース**: 2025年6月にPublic Preview、9月にGA
- **参考**: [GitHub公式リポジトリ](https://github.com/github/github-mcp-server), [実用ガイド](https://github.blog/ai-and-ml/generative-ai/a-practical-guide-on-how-to-use-the-github-mcp-server/)

#### 6. Atlassian MCP

- **URL**: `https://mcp.atlassian.com/v1/sse`
- **トランスポート**: SSE
- **認証**: OAuth 2.1
- **機能**: JiraとConfluenceへの統合アクセス（検索、作成、更新）
- **タグ**: プロジェクト管理、ドキュメント、コラボレーション、ツール
- **インフラ**: Cloudflareでホスティング
- **参考**: [公式リポジトリ](https://github.com/atlassian/atlassian-mcp-server), [セットアップガイド](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/), [発表記事](https://www.atlassian.com/blog/announcements/remote-mcp-server)

### 追加推奨サーバー（URL確認済み）

#### 7. Dropbox MCP

- **URL**: `https://mcp.dropbox.com/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: Dropbox OAuth
- **機能**: Dropboxファイルとフォルダへのアクセス
- **ステータス**: Beta
- **参考**: [公式ヘルプドキュメント](https://help.dropbox.com/integrations/connect-dropbox-mcp-server)

#### 8. HubSpot MCP

- **URL**: `https://mcp.hubspot.com`
- **トランスポート**: Remote (クラウドベース)
- **認証**: OAuth 2.0 (2025年後半にOAuth 2.1対応予定)
- **機能**: CRMデータへの読み取り専用アクセス（連絡先、会社、取引、チケットなど）
- **今後の対応**: PKCE、リフレッシュトークンローテーション
- **参考**: [公式開発者ドキュメント](https://developers.hubspot.com/mcp), [統合ガイド](https://hubspot.mintlify-auth-docs.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server)

#### 9. Asana MCP

- **URL**: `https://mcp.asana.com/sse`
- **トランスポート**: SSE
- **認証**: OAuth + Dynamic Client Registration (DCR)
- **機能**: タスク、プロジェクト、ワークスペース管理
- **セキュリティ**: 承認済みMCPクライアントリダイレクトURIの許可リスト
- **参考**: [公式開発者ドキュメント](https://developers.asana.com/docs/using-asanas-mcp-server), [統合ガイド](https://developers.asana.com/docs/integrating-with-asanas-mcp-server)

#### 10. ClickUp MCP

- **URL**: `https://mcp.clickup.com/mcp`
- **トランスポート**: STREAMABLE_HTTPS
- **認証**: OAuth 2.1 + PKCE (API Keyは非対応)
- **機能**: タスク、プロジェクト、ワークスペース管理
- **提供プラン**: 全プラン
- **ステータス**: Public Beta
- **参考**: [公式ヘルプドキュメント](https://help.clickup.com/hc/en-us/articles/33335772678423-What-is-ClickUp-MCP), [開発者ドキュメント](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server)

#### 11. Sentry MCP

- **URL**: `https://mcp.sentry.dev/mcp` (推奨) / `https://mcp.sentry.dev/sse` (レガシー)
- **トランスポート**: STREAMABLE_HTTPS with graceful SSE fallback
- **認証**: OAuth
- **機能**: ライブイシューコンテキスト、エラークエリ、パッチ生成
- **ツール数**: 16以上のツールコールとプロンプト
- **参考**: [公式ドキュメント](https://docs.sentry.io/product/sentry-mcp/), [ブログ記事](https://blog.sentry.io/yes-sentry-has-an-mcp-server-and-its-pretty-good/)

#### 12. Stripe MCP

- **URL**: `https://mcp.stripe.com/`
- **トランスポート**: Remote
- **認証**: OAuth
- **機能**: 顧客、製品、支払い、請求書などの管理
- **インフラ**: Cloudflareでホスティング
- **参考**: [Cloudflare MCP Demo Day](https://blog.cloudflare.com/mcp-demo-day/)

#### 13. Webflow MCP

- **URL**: `https://mcp.webflow.com/sse`
- **トランスポート**: SSE
- **認証**: OAuth
- **機能**: Webflowサイトとの統合、ライブキャンバス同期
- **インフラ**: Cloudflareでホスティング
- **参考**: [GitHub公式リポジトリ](https://github.com/webflow/mcp-server), [Cloudflare発表](https://blog.cloudflare.com/mcp-demo-day/)

### 公式発表済みだがURL未公開のサーバー

以下のサービスは、Cloudflare MCP Demo Day (2025年5月1日) で公式Remote MCPサーバーの提供が発表されましたが、公開URLは未確認です：

- **Intercom MCP**: 顧客会話履歴とユーザーデータへのアクセス
- **PayPal MCP**: 在庫管理、支払い処理、配送追跡、返金処理
- **Block (Square) MCP**: 決済とコマース機能

これらのサーバーはCloudflareインフラ上で動作しており、OAuth認証をサポートしています。

### クラウドプロバイダー（エンタープライズ向け）

#### AWS MCP Servers

AWS は2025年7月に複数のMCPサーバーをDeveloper Previewとしてリリース：

- **AWS API MCP Server**: 自然言語でAWS APIを呼び出し
- **Amazon MSK MCP Server**: Kafkaメトリクス監視とクラスター管理
- **Price List MCP Server**: リージョン別のリアルタイム価格情報
- **Code Assistant MCP Server**: コード支援
- **Bedrock Agent Runtime**: Bedrock統合

**認証**: OAuth トークンまたはIAM認証情報
**セキュリティ**: Cognito (OAuth2), WAF, IAM
**参考**: [AWS Open Source Blog](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-2-authentication-on-mcp/), [MarkTechPost記事](https://www.marktechpost.com/2025/07/20/model-context-protocol-mcp-for-enterprises-secure-integration-with-aws-azure-and-google-cloud-2025-update/)

#### Azure MCP Servers

Azure は2025年にMCPサポートを強化：

- **Azure AI Foundry MCP Server**: CosmosDB、SQL、SharePoint、Bing、Microsoft Fabricへの統一アクセス
- **Copilot Studio統合**: MCP機能のシームレスな検出と呼び出し

**デプロイ**: Azure Container AppsまたはFunctions
**認証**: Azure AD (OAuth2)
**セキュリティ**: TLS、RBAC
**参考**: [Microsoft Learn](https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview), [Den Delimarsky記事](https://den.dev/blog/remote-mcp-server/)

#### Google Cloud MCP

Google Cloudは2025年7月にMCP Toolboxをリリース：

- **MCP Toolbox for Databases**: Cloud SQL、Spanner、AlloyDB、BigQueryへのアクセス

**認証**: OAuth2
**セキュリティ**: IAM、VPC Service Controls
**アーキテクチャ**: 集中型MCPプロキシを推奨
**参考**: [InfoQ記事](https://www.infoq.com/news/2025/10/google-cloud-secure-mcp/)

### その他の確認済みサービス

以下のサービスには複数の実装が存在しますが、公式ホステッドRemote MCPサーバーのURLは未確認です：

#### Google Drive

- 複数のコミュニティ実装が存在
- Smithery提供版: `https://server.smithery.ai/@KaranThink41/official-gdrive-mcp/mcp`
- 公式パッケージ: `@modelcontextprotocol/server-gdrive`
- OAuth Scope: `https://www.googleapis.com/auth/drive.readonly`

#### Airtable

- Pipedream提供版: `mcp.pipedream.com` (OAuth対応)
- コミュニティ実装: [domdomegg/airtable-mcp-server](https://github.com/domdomegg/airtable-mcp-server)

#### Slack

- **ステータス**: 2025年夏にリリース予定（現在未提供）
- **特徴**: OAuth認証、既存権限の尊重
- **現在**: Anthropic提供の`@modelcontextprotocol/server-slack`が利用可能（ローカル実行）
- **参考**: [Slack開発者ページ](https://slack.dev/secure-data-connectivity-for-the-modern-ai-era/)

#### その他（コミュニティ実装のみ）

- **Salesforce**: OAuth 2.0対応のコミュニティ実装あり
- **Shopify**: コミュニティ実装あり
- **Zendesk**: Dropbox Dash統合のみ確認
- **Trello**: Trello API使用のコミュニティ実装あり
- **Coda**: Composio経由での統合のみ確認
- **Monday.com**: Composio経由での統合のみ確認

### 統合プラットフォーム

以下のプラットフォームは、複数のサービスへの統一されたMCPアクセスを提供します：

- **Composio MCP**: `mcp.composio.dev` - 複数サービスの統合管理
- **Pipedream MCP**: `mcp.pipedream.com` - ワークフロー自動化とMCP統合
- **Zapier MCP**: ユーザー固有URL - Zapier統合
- **n8n MCP**: ワークフロー自動化
- **Smithery**: MCPサーバーマーケットプレイス

## トランスポートタイプについて

### STREAMABLE_HTTPS (Streamable HTTP)

- 最新のMCP仕様で推奨されるトランスポート方式
- HTTP/1.1以上で動作
- リクエスト・レスポンス型とストリーミングの両方をサポート
- ファイアウォールやプロキシとの互換性が高い
- 例: GitHub、Notion、Figma、Linear、ClickUp、Stripe

### SSE (Server-Sent Events)

- サーバーからクライアントへの単方向ストリーミング
- レガシーシステムとの互換性のために使用されることが多い
- 例: Atlassian、Asana、Webflow、Sentry (フォールバック)

### Remote (汎用クラウドベース)

- 具体的なトランスポートプロトコルが公開されていない場合の表記
- 通常はSTREAMABLE_HTTPSまたはSSEのいずれか
- 例: HubSpot

## OAuth認証について

### OAuth 2.1の主要機能

2025年のMCP仕様更新により、以下が標準となりました：

1. **PKCE (Proof Key for Code Exchange)**: 認証コード横取り攻撃の防止
2. **リフレッシュトークンローテーション**: トークンの再利用を防ぐ単一使用トークン
3. **Resource Indicators (RFC 8707)**: トークンのスコープを特定のMCPサーバーに限定
4. **Protected Resource Metadata (RFC 9728)**: 認証サーバーの自動検出

### Dynamic Client Registration (DCR)

一部のサービス（Asana、Figmaなど）は、標準的なOAuthアプリではなく、Dynamic Client Registrationを使用してプログラマティックにアプリケーションを登録します。

### セキュリティのベストプラクティス

1. **公式サーバーのみ使用**: サードパーティプロキシは避ける
2. **最小権限の原則**: 必要最小限のスコープのみを要求
3. **リダイレクトURI検証**: 許可リストの確認
4. **トークンの安全な保管**: クライアント側での適切な暗号化
5. **定期的な監査**: アクセス権限とトークンの定期確認

## セキュリティに関する注意事項

### MCP Server Security 2025レポート

Astrix Securityの調査（2025年）によると：

- 53%以上のオープンソースMCPサーバーが安全でない静的APIキーを使用
- OAuth 2.0/2.1などの最新標準を採用しているのは8.5%のみ
- 公式サーバーの使用が強く推奨される

### 推奨事項

1. このドキュメントに記載された公式サーバーを優先的に使用
2. コミュニティ実装を使用する場合は、セキュリティ監査を実施
3. 静的APIキーの使用は避け、OAuth認証を使用
4. エンタープライズ環境では、クラウドプロバイダーの公式MCPサーバーを検討

## 参考リンク

### 公式ドキュメント・発表

- [Model Context Protocol公式サイト](https://modelcontextprotocol.io/)
- [MCP Authorization仕様](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Cloudflare MCP Demo Day](https://blog.cloudflare.com/mcp-demo-day/)
- [Docker - Remote MCP Servers with OAuth](https://www.docker.com/blog/connect-to-remote-mcp-servers-with-oauth/)

### 仕様更新

- [MCP仕様更新 (2025年6月)](https://auth0.com/blog/mcp-specs-update-all-about-auth/)
- [OAuth in MCP解説 by Aaron Parecki](https://aaronparecki.com/2025/04/03/15/oauth-for-model-context-protocol)
- [Client Registration and Enterprise Management (2025年11月)](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update)

### ディレクトリ・リスト

- [awesome-remote-mcp-servers (jaw9c)](https://github.com/jaw9c/awesome-remote-mcp-servers)
- [awesome-remote-mcp-servers (sylviangth)](https://github.com/sylviangth/awesome-remote-mcp-servers)
- [MCP Servers.org - Remote Servers](https://mcpservers.org/remote-mcp-servers)
- [MCP Registry (Preview)](https://registry.modelcontextprotocol.io)

### 技術記事

- [MarkTechPost - MCP for Enterprises](https://www.marktechpost.com/2025/07/20/model-context-protocol-mcp-for-enterprises-secure-integration-with-aws-azure-and-google-cloud-2025-update/)
- [Building Remote MCP with AWS](https://dev.to/aws-builders/building-a-remote-mcp-server-with-oauth-authorization-using-amazon-api-gateway-and-cognito-19ab)
- [Google Cloud MCP Security](https://www.infoq.com/news/2025/10/google-cloud-secure-mcp/)

---

**更新日**: 2025-11-30
**次回更新予定**: 新しい公式サーバーがリリースされ次第

# Google Cloud Platform 設定ファイル

このディレクトリには、GCP関連の設定ファイルが含まれています。

## 📄 ファイル一覧

### artifact-registry-cleanup-policy.json

Artifact Registry の自動クリーンアップポリシー定義。

#### 目的
- 古いDockerイメージを自動削除してストレージコストを削減
- 環境ごとに異なる保持期間を設定

#### 保持期間

| 環境 | タグPrefix | 保持期間 | 秒数 |
|------|-----------|---------|------|
| **Preview** | `preview-*` | 1日 | 86,400s |
| **Staging** | `staging-*` | 3日 | 259,200s |
| **Production** | `production-*` | 7日 | 604,800s |
| **Untagged** | - | 1日 | 86,400s |

#### 適用方法

```bash
# クリーンアップポリシーを適用
gcloud artifacts repositories set-cleanup-policies tumiki \
  --location=asia-northeast1 \
  --policy=.github/gcp/artifact-registry-cleanup-policy.json
```

#### ポリシー確認

```bash
# 適用されたポリシーを確認
gcloud artifacts repositories describe tumiki \
  --location=asia-northeast1 \
  --format="value(cleanupPolicies)"
```

#### コスト削減効果

**Before（クリーンアップなし）**:
- 100個のイメージ × 500MB = 50GB
- 月額: $0.10 × 50GB = **$5.00/月**

**After（クリーンアップ適用後）**:
- 約10個のアクティブイメージ × 500MB = 5GB
- 月額: $0.10 × (5GB - 0.5GB無料枠) = **$0.45/月**

**削減額**: 約 **$4.55/月**（年間約$55）

## 🔗 関連ドキュメント

- [Cloud Run MCP Proxy デプロイメントガイド](../../docs/cloudrun-mcp-proxy-deployment.md)
- [Artifact Registry 公式ドキュメント](https://cloud.google.com/artifact-registry/docs/docker/manage-images#cleanup)

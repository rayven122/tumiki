# Coharu VRM セットアップガイド

Coharu（こはる）は Tumiki で利用可能なVRMアバター機能です。VRM/VRMAファイルはライセンスの関係でリポジトリには含まれていないため、別途購入・配置が必要です。

## 必要なファイル

### VRM モデルファイル

| ファイル名 | 配置場所 |
|-----------|---------|
| `coharu.vrm` | `apps/manager/public/coharu/vrm/` |

### VRMA アニメーションファイル

| ファイル名 | 配置場所 |
|-----------|---------|
| `VRMA_01.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_02.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_03.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_04.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_05.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_06.vrma` | `apps/manager/public/coharu/vrma/` |
| `VRMA_07.vrma` | `apps/manager/public/coharu/vrma/` |

## セットアップ手順

### 1. ファイルの入手

VRM モデルと VRMA アニメーションファイルを入手してください。

> **注意**: これらのファイルには使用ライセンスが適用されます。ライセンス条件を確認し、適切な使用許可を得てください。

### 2. ファイルの配置

入手したファイルを以下のディレクトリに配置します：

```bash
# VRMモデル
apps/manager/public/coharu/vrm/coharu.vrm

# VRMAアニメーション
apps/manager/public/coharu/vrma/VRMA_01.vrma
apps/manager/public/coharu/vrma/VRMA_02.vrma
apps/manager/public/coharu/vrma/VRMA_03.vrma
apps/manager/public/coharu/vrma/VRMA_04.vrma
apps/manager/public/coharu/vrma/VRMA_05.vrma
apps/manager/public/coharu/vrma/VRMA_06.vrma
apps/manager/public/coharu/vrma/VRMA_07.vrma
```

### 3. 動作確認

1. 開発サーバーを起動します：
   ```bash
   pnpm dev
   ```

2. アプリケーションにアクセスし、Coharu機能を有効化します。

3. VRMアバターが正常に表示されることを確認します。

## トラブルシューティング

### VRMアバターが表示されない

- ファイルが正しいディレクトリに配置されているか確認してください。
- ファイル名が正確か確認してください（大文字・小文字を区別します）。
- ブラウザの開発者ツールでネットワークエラーがないか確認してください。

### アニメーションが再生されない

- VRMAファイルがすべて配置されているか確認してください。
- アニメーションファイルは一部のみでも動作しますが、すべて配置することを推奨します。

### フォールバック画面が表示される

VRMファイルが見つからない場合、フォールバック画面（「VRMファイルが見つかりません」）が表示されます。上記のセットアップ手順に従ってファイルを配置してください。

## ディレクトリ構造

```
apps/manager/public/coharu/
├── vrm/
│   ├── .gitkeep
│   └── coharu.vrm        # ← 配置するファイル
└── vrma/
    ├── .gitkeep
    ├── VRMA_01.vrma      # ← 配置するファイル
    ├── VRMA_02.vrma
    ├── VRMA_03.vrma
    ├── VRMA_04.vrma
    ├── VRMA_05.vrma
    ├── VRMA_06.vrma
    └── VRMA_07.vrma
```

## 注意事項

- VRM/VRMAファイルは `.gitignore` で除外されているため、Gitにコミットされません。
- 各開発者・デプロイ環境で個別にファイルを配置する必要があります。
- 本番環境へのデプロイ時は、CI/CDパイプラインまたはデプロイスクリプトでファイルを配置してください。

# TUMIKI LP HARNESS 設計・実装ガイド

株式会社RAYVEN ／ Claude Agent SDK × GAN-inspired Architecture

| 項目           | 内容                                                      |
| -------------- | --------------------------------------------------------- |
| プロダクト     | Tumiki — AI Governance & MCP Management Platform          |
| ゴール         | Anthropic記事の3エージェントハーネスでTumiki LPを自律生成 |
| アーキテクチャ | Planner → Generator ⇄ Evaluator（GANインスパイア）        |
| SDK            | Claude Agent SDK（旧 Claude Code SDK）                    |

---

## 1. なぜこの構成が必要か

### 1-1. ナイーブな実装の限界

Claude Codeに「TumikiのLPを作って」と一言で依頼するだけでは、以下の2つの問題が避けられない。

- **コンテキストアンクサイエティ（Context Anxiety）**: コンテキストウィンドウが埋まってくると、モデルが作業を途中で切り上げてしまう
- **自己評価バイアス**: 自分が作ったものを採点させると、質が低くても高得点を出す傾向がある

> **Anthropic記事の知見（2026年3月）**
>
> - Sonnet系はcontext anxietyが強く、compactionだけでは解決しない
> - EvaluatorをGeneratorから分離すると採点の辛口チューニングが容易になる
> - GANにインスパイアされたGenerator/Evaluatorループがブレークスルーになった
> - 10イテレーション目に「オランダ美術館サイトが3D空間体験に生まれ変わった」事例

### 1-2. 解決策：3エージェント構成

Planner・Generator・Evaluatorを分離し、各エージェントが明確な責務を持つことで両問題を解消する。

| エージェント | 責務                                        | 使用ツール                 |
| ------------ | ------------------------------------------- | -------------------------- |
| 🗂 Planner   | 1〜4文 → 詳細スペック展開                   | Read / Write               |
| 🔨 Generator | セクション単位でHTML/CSS実装                | Read / Write / Bash / Edit |
| 🔍 Evaluator | ブラウザ操作 → 4基準で採点 → フィードバック | Playwright MCP             |

```
userPrompt（1〜4文）
    │
    ▼
┌─────────────┐
│   PLANNER   │ → spec.json（セクション構成・ブランド定義）
└─────────────┘
    │ sections[]
    ▼
┌──────────────────────────────────────────┐
│  セクションループ（hero → features → ...）  │
│                                          │
│  ┌─────────────┐  Contract  ┌──────────┐ │
│  │  GENERATOR  │ ─────────> │ CONTRACT │ │
│  │  （実装）    │ <───────── │ （合意）  │ │
│  └──────┬──────┘            └──────────┘ │
│         │ HTML file                      │
│         ▼                                │
│  ┌─────────────┐                         │
│  │  EVALUATOR  │  Playwright MCPで操作   │
│  │  （採点）    │  4基準 × 100点満点      │
│  └──────┬──────┘                         │
│         │ score + critique               │
│         ├── score ≥ 80 → 次セクションへ  │
│         └── score < 80 → Generatorに戻す │
└──────────────────────────────────────────┘
    │
    ▼
./output/tumiki-lp-vN.html（最終成果物）
```

---

## 2. 共有コンテキスト設計（shared-context.md）

PlannerとGeneratorとEvaluatorが「同じ基準」を持つことが品質安定の鍵。3エージェント全員のsystem promptに注入する共通知識ファイルを切り出す。

### 2-1. ペルソナ定義

| 項目           | 内容                                                   |
| -------------- | ------------------------------------------------------ |
| 主ターゲット   | CISO・IT統括部長（従業員1,000名以上の日本企業）        |
| 副ターゲット   | SIerのプリセールス担当・DX推進室                       |
| 意思決定の壁   | 稟議承認・情報セキュリティ委員会・ベンダー評価プロセス |
| 訴求したい感情 | 「これなら稟議が通る」「競合より先に導入できる」       |
| 避けるべき印象 | 「スタートアップっぽい」「海外製でサポートが不安」     |

### 2-2. プロダクト要件（伝えること・禁止事項）

**✅ 必ず伝えること（Generatorが盛り込む / Evaluatorが確認する）**

- ゼロトラスト型 — AIエージェントとMCPサーバー間の全通信を制御・監査
- ハイブリッドアーキテクチャ — ゲートウェイはオンプレ、設定はクラウド（Split-Plane）
- 特許取得済み — 特許第7731114号（MCP管理インフラ）
- 数字で語る — Business ¥6M/年、15,000名超のAIエンジニアコミュニティ
- SIer向けOEM対応 — ホワイトラベル・チャネルパートナープログラム
- 大阪発・日本製 — 〒530-0017 大阪市北区、日本語サポート

**❌ 禁止事項（EvaluatorがOriginality採点で減点する）**

- 「AI活用」だけの訴求 — 差別化にならない汎用フレーズ
- 白背景＋紫グラデーション — AIスロップの典型パターン
- Arial / Inter / Roboto — 個性のないデフォルトフォント
- 汎用カードUI — 「機能3つ並べただけ」の構成
- 過度に明るいトーン — エンタープライズ信頼感と乖離

### 2-3. ブランド定義

| 要素             | 定義                                                                |
| ---------------- | ------------------------------------------------------------------- |
| カラーパレット   | Primary: #0A0A0F（黒）/ Accent: #E8FF47（黄）/ Alert: #FF6B35（橙） |
| フォント         | Display: Syne 800 / Mono: Space Mono / 本文: Noto Sans JP 300       |
| トーン           | テクニカル・信頼・誠実。「守る」より「制御する」という能動的表現    |
| ビジュアルムード | 黒基調・鋭角グリッド・ターミナルUI的な緊張感                        |
| 避けるスタイル   | 丸み・パステル・アイコン多用・スタートアップ的な軽さ                |

### 2-4. 共有コンテキストの注入方法

3エージェント全員のsystem promptの先頭に挿入する。ファイルで管理することで1箇所の修正が全エージェントに反映される。

```typescript
// harness.ts
const SHARED = await fs.readFile("./shared-context.md", "utf-8");

const PLANNER_SYSTEM = `${SHARED}\n\n---\n${PLANNER_ROLE}`;
const GENERATOR_SYSTEM = `${SHARED}\n\n---\n${GENERATOR_ROLE}`;
const EVALUATOR_SYSTEM = `${SHARED}\n\n---\n${EVALUATOR_ROLE}`;
```

---

## 3. Evaluatorの採点基準（4軸 × 100点）

Evaluatorは独立したエージェントとして「辛口採点者」にチューニングする。同じ基準をGeneratorのsystem promptにも渡し、目指すべきゴールを事前に共有する。

| 基準           | 配点 | 評価ポイント                                                                                           |
| -------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| Design Quality | 30点 | 色・タイポ・レイアウト・アニメが統一された世界観を作っているか。エンタープライズ信頼感と一致しているか |
| Originality    | 30点 | テンプレ・AIスロップパターン（紫グラデ等）を排除し、Tumiki固有の意図的選択があるか                     |
| Craft          | 20点 | フォント階層・余白一貫性・コントラスト比・レスポンシブ。技術的な基礎品質チェック                       |
| Functionality  | 20点 | CTA発見性・情報の優先順位・CISO/プリセールスが稟議を通せる情報設計                                     |

---

## 4. Generator ⇄ Evaluator ループ設計

### 4-1. スプリント契約（Contract）

各セクションの実装前にGeneratorとEvaluatorが「何を作るか・何をもって完了とするか」を事前合意する。スペックは意図的に高レベルに保ち、実装の詳細はエージェントに委ねる。

### 4-2. イテレーション戦略

| 条件                      | Generatorの行動                                        |
| ------------------------- | ------------------------------------------------------ |
| スコア ≥ 80点             | 次のセクションへ進む                                   |
| スコア < 80 + pivot=false | 現在の方向を洗練・批評に従い改良                       |
| スコア < 60 or pivot=true | デザイン方向を根本から変える（別カラー・別レイアウト） |
| 最大イテレーション到達    | 現時点のベストを採用して次へ                           |

### 4-3. コンテキストリセット戦略

- `build-state.json` に進捗を永続化 → 中断・再開が可能
- Sonnet 4.6 使用時は `max_turns` を小さく保つ（context anxiety 対策）
- Opus 4.6 使用時はコンパクション（自動）で長時間連続セッションOK

---

## 5. セットアップ & 実行

### 5-1. 依存関係

```bash
npm install @anthropic-ai/claude-agent-sdk typescript ts-node @types/node

# Playwright MCPサーバー（Evaluatorが使用）
npx @playwright/mcp@latest --port 3001

# 開発用HTTPサーバー（Evaluatorがアクセス）
npx serve ./output -p 8080

# APIキー設定
export ANTHROPIC_API_KEY=sk-ant-...
```

### 5-2. 実行

```bash
# 初回実行
npx ts-node tumiki-lp-harness.ts

# 中断後の再開（build-state.jsonが残っていれば自動継続）
npx ts-node tumiki-lp-harness.ts

# リセットして最初から
rm build-state.json spec.json && npx ts-node tumiki-lp-harness.ts
```

### 5-3. 生成されるファイル

```
./
├── shared-context.md            # ペルソナ・プロダクト要件・ブランド（全エージェント共通）
├── spec.json                    # Plannerが生成したLPスペック
├── build-state.json             # ビルド状態（中断・再開用）
├── eval-log.jsonl               # 全イテレーションのスコアログ
├── contracts/
│   ├── hero-v1.json
│   ├── features-v4.json
│   └── ...
└── output/
    ├── tumiki-lp-v1.html        # イテレーション1
    ├── tumiki-lp-v2.html        # イテレーション2（改善版）
    └── tumiki-lp-vN.html        # 最終版
```

### 5-4. コスト目安

| 構成                     | モデル         | 時間         | コスト      |
| ------------------------ | -------------- | ------------ | ----------- |
| ソロ（比較用）           | Sonnet 4.6     | 20分         | 〜$5        |
| **フルハーネス（推奨）** | **Sonnet 4.6** | **1〜2時間** | **$20〜50** |
| フルハーネス（最高品質） | Opus 4.6       | 2〜6時間     | $100〜200   |

---

## 6. 次のステップ

**即実施**

- `shared-context.md` の作成（ペルソナ・プロダクト要件・ブランド）
- Playwright MCPサーバーのローカル起動確認
- Sonnet 4.6 でハーネスを小規模実行（hero セクション1枚だけ）

**応用**

- Tumiki MCP を Playwright 代わりに使い「Tumikiが自分のLPを監査する」デモ化
- SIer向けOEM版LPの自動生成（NTTデータ向け・富士通向けをバッチ実行）
- Evaluator に Enterprise Trust 基準を追加（稟議通過可能性スコア）

---

株式会社RAYVEN ／ 〒530-0017 大阪府大阪市北区角田町8-47 阪急グランドビル26F ／ 特許第7731114号

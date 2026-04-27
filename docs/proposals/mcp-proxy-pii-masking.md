# Tumiki Desktop MCP Proxy における PII / シークレット マスキング技術選定

## TL;DR

Tumiki Desktop の MCP Proxy で PII / シークレット流出を防ぐには、**`OpenRedaction`（npm パッケージ）を採用するのが最適**。

`gitleaks` / `Presidio` をそのまま使う案は、技術スタック・運用負荷・ライセンス面で複数の致命的な問題があり、現実解にならない。

---

## 背景

ユーザーから「gitleaks や Presidio などで PII や API key を MCP に渡さないようにできないか？外部通信なしで機密情報マスキングをしたい」という要望をいただいた。

これを Tumiki Desktop の `packages/mcp-proxy`（本物の MCP サーバーへ転送するプロキシ層）に組み込む形で実現するための技術選定を行った。

---

## 1. 技術スタックの不整合

Tumiki Desktop は **Electron / Node.js** で動いている。

| ツール | 実装言語 | Node.js から使うには |
| --- | --- | --- |
| gitleaks | Go バイナリ | サブプロセス起動 or WASM 化 or ルールだけ移植 |
| Presidio | Python ライブラリ | Python ランタイム同梱 + サイドカー HTTP サーバー |
| **OpenRedaction** | **TypeScript ネイティブ** | **`npm install` で即動く** |

→ gitleaks / Presidio は「**外部プロセスを Tumiki Desktop に同梱して常駐起動**」が前提になり、配布・起動・更新のすべてが複雑化する。

---

## 2. 配布サイズと起動コスト

| 観点 | gitleaks | Presidio | OpenRedaction |
| --- | --- | --- | --- |
| アプリ同梱サイズ増 | +60MB（4 プラットフォーム分） | +数百MB（Python + spaCy モデル） | **±0**（純 JS） |
| ツール毎の処理レイテンシ | 50〜100ms（バイナリ起動コスト） | 10〜200ms（NLP 推論） | **<1ms** |
| 常駐プロセス | 必要（or 毎回 spawn） | 必要（HTTP サイドカー） | 不要（同一プロセス内） |
| macOS コード署名 | バイナリの公証必須 | 同左 | 不要 |

→ MCP の `tools/call` ごとに走らせる用途では gitleaks / Presidio の**レイテンシは許容できない**。

---

## 3. 検出範囲の比較

| カテゴリ | gitleaks | Presidio | OpenRedaction |
| --- | --- | --- | --- |
| API キー / シークレット | ◎ 150+ ルール | △ 数種類のみ | ○ JWT / OAuth / API Key 標準対応 + `customPatterns` で拡張可 |
| 構造化 PII（email, 電話, SSN, クレカ等） | ✗ 対象外 | ◎ | ◎ Luhn / checksum 検証付き |
| 文脈依存 PII（人名・住所） | ✗ | ◎ NER | △ regex + 文脈解析 |
| コンプライアンスプリセット | ✗ | △ | ◎ GDPR / HIPAA / PCI-DSS / SOC2 標準装備 |
| 可逆トークン化（応答復号） | ✗ | △ | ◎ 標準装備 |

→ **OpenRedaction 単体で「シークレット + PII」両方の主要要件をほぼカバー**。gitleaks は secret 専門、Presidio は PII 専門で、両方欲しければ 2 つを並行運用する必要がある。

---

## 4. ライセンス・法務リスク

| ツール | ライセンス | Tumiki Desktop 配布リスク |
| --- | --- | --- |
| gitleaks | MIT | 安全 |
| Presidio | MIT | 安全（が Python 同梱の問題は残る） |
| TruffleHog（gitleaks 代替候補） | **AGPL-3.0** | ⚠ ライセンス感染リスクあり |
| **OpenRedaction** | **MIT** | 安全 |

---

## 5. 採用後の補強策

OpenRedaction の弱点（vendor-specific シークレットの不足、日本語 PII 弱）は、`customPatterns` 機構で十分対応可能。

- **gitleaks の `gitleaks.toml` から secret 検出ルール**（GitHub PAT / Stripe / Slack 等）**を抽出して `customPatterns` に流し込む** → gitleaks の検出力をそのまま取り込める
- **日本特化パターン**（マイナンバー / 日本電話番号 / 郵便番号）を追加
- **将来必要になれば** `transformers.js + ONNX` で日本語 NER を Node プロセス内で追加可能（Python 不要）

つまり **OpenRedaction を土台に、gitleaks コミュニティのルール資産を取り込む構成**が、両者のいいとこ取りになる。

---

## 比較まとめ

| 観点 | gitleaks + Presidio 併用 | **OpenRedaction** |
| --- | --- | --- |
| 実装工数 | 大（バイナリ同梱 + Python サイドカー + 2 系統管理） | **小**（npm install のみ） |
| アプリサイズ増 | +数百MB | **±0** |
| レイテンシ | 数十〜数百ms | **<1ms** |
| 検出範囲 | secret + PII（2 ツール必要） | **両方を 1 つでカバー** |
| 可逆トークン化 | ✗（自前実装要） | ◎ 標準 |
| 運用負荷 | プロセス管理・更新が複雑 | 通常の npm 依存と同じ |
| ライセンス | MIT（OK） | MIT（OK） |

---

## 推奨アクション

| フェーズ | 内容 | 工数目安 |
| --- | --- | --- |
| PoC | `packages/mcp-proxy` に OpenRedaction を組み込んで効果検証 | 1〜2 日 |
| MVP | gitleaks ルール + 日本特化パターンを `customPatterns` に追加 | 1 週間 |
| EE 拡張 | `transformers.js` で日本語 NER（人名・住所）を後付け | 1〜2 週間 |

---

## 参考リンク

- [OpenRedaction (GitHub)](https://github.com/sam247/openredaction) — MIT, 78★, TypeScript ネイティブ, 570+ パターン
- [openredaction (npm)](https://www.npmjs.com/package/openredaction)
- [gitleaks (GitHub)](https://github.com/gitleaks/gitleaks) — MIT, ルールセットを流用
- [Microsoft Presidio (GitHub)](https://github.com/microsoft/presidio) — MIT, Python
- [transformers.js (Hugging Face)](https://huggingface.co/docs/transformers.js/index) — Node.js 内で NER 推論

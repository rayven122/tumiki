# PII / シークレットマスキング パターン定義

`packages/mcp-core-proxy` の OpenRedaction フィルタが使う検出パターンの一覧。

## ファイル構成

| ファイル             | 役割                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | 全パターンを束ねて `allCustomPatterns` として export                                                                |
| `loader.ts`          | gitleaks 互換 TOML テキストを `PIIPattern[]` にパースする loader                                                    |
| `secrets-curated.ts` | gitleaks 互換 TOML を template literal として inline。vendor シークレット系（GitHub PAT / Stripe / Slack 等）を定義 |
| `japan.ts`           | 日本特化 PII（電話 / 郵便 / マイナンバー等）を TS 直書き。チェックディジット検証等のロジック付き検出を含む          |

## なぜ TOML を別ファイルではなく TS 内に inline しているか

`secrets-curated.ts` は gitleaks 互換の TOML テキストを template literal として埋め込む方式を採用している。本来は `.toml` ファイルに分離するほうが「設定とコードの分離」が徹底できるが、現状は以下の理由で inline:

- electron-vite で `.toml` を bundle 対象に含める設定が PoC スコープ外
- inline でも 「gitleaks 形式そのままコピペできる」という TOML 形式の中心的利点は維持できる
- 必要になった時点で `parseGitleaksToml(readFileSync(path, "utf-8"))` への置換で簡単に外部化できる

形式は TOML、配置は TS、というハイブリッド構成として理解してください。詳細は `secrets-curated.ts` 冒頭のコメント参照。

## どっちに書くか？

| パターンの性質                                       | 配置先                                           |
| ---------------------------------------------------- | ------------------------------------------------ |
| **単純な regex で表現できる vendor キー / トークン** | `secrets-curated.ts` の TOML 内                  |
| **チェックディジット検証等のロジックが必要**         | `japan.ts` 等の TS ファイルに `validator` 付きで |

## 新規ルールの追加方法

### Case 1: vendor シークレット（TOML 形式）

`secrets-curated.ts` の `SECRETS_TOML` 内に `[[rules]]` ブロックを追加:

```toml
[[rules]]
id = "my-vendor-key"
description = "MyVendor API Key"
regex = '''mvk_[0-9a-zA-Z]{32}'''
severity = "critical"
```

**フィールド仕様**:

| フィールド    | 必須 | 説明                                                                                    |
| ------------- | ---- | --------------------------------------------------------------------------------------- |
| `id`          | ✅   | kebab-case の識別子。自動的に `MY_VENDOR_KEY` 形式の `type` に変換される                |
| `regex`       | ✅   | Go RE2 形式の正規表現。`(?P<name>...)` は自動的に JS 互換の `(?<name>...)` に変換される |
| `description` | 推奨 | 何のキーか説明                                                                          |
| `severity`    | 推奨 | `"critical"` / `"high"` / `"medium"` / `"low"`                                          |

### Case 2: gitleaks ルールの流用

[gitleaks の公式 `gitleaks.toml`](https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml) や、社内独自の `.gitleaks.toml` から **必要なルールだけ**を選んで `secrets-curated.ts` の TOML テキストにコピー。

選別する理由:

- 全 150+ ルールを取り込むと **偽陽性が多発**（MCP の args 上で正規引数を誤検出すると機能崩壊）
- MCP 用途では vendor が限定的なので、主要 10〜20 種類で 95% カバーできる

### Case 3: 日本特化 PII / 検証ロジック付き（TS 直書き）

`japan.ts` に `PIIPattern` を追加:

```typescript
{
  type: "JP_NEW_PATTERN",
  regex: /\d{10}/g,
  priority: 15,
  placeholder: "[JP_NEW_PATTERN_{n}]",
  severity: "high",
  description: "新規日本特化パターン",
  validator: (match) => {
    // 偽陽性除去ロジック（チェックディジット検証等）
    return /* boolean */;
  },
},
```

`validator` は OpenRedaction が **regex マッチ後** に呼び、 `false` を返すと検出から除外される（偽陽性除去）。

## マイナンバーチェックディジット検証

`validateMyNumberChecksum(digits: string): boolean` を export 済み。
仕様: [総務省 マイナンバー仕様書](https://www.soumu.go.jp/main_content/000291950.pdf)

## RE2 → JS RegExp 互換性に関する注意

| RE2 構文                 | JS RegExp                                             | 自動変換             |
| ------------------------ | ----------------------------------------------------- | -------------------- |
| `(?P<name>...)`          | `(?<name>...)`                                        | ✅ loader が自動変換 |
| 後方参照 `\1`            | 未対応 (RE2 仕様により gitleaks ルールには登場しない) | --                   |
| インラインフラグ `(?-i)` | 未対応 (gitleaks 公式ルールにはほぼ未使用)            | 必要時に loader 拡張 |

## テストの追加

新規ルール追加時は対応するテストも追加:

- vendor シークレット → `__tests__/secrets-curated.test.ts` の `sampleByType` に positive/negative サンプルを追加
- 日本特化 → `__tests__/japan.test.ts` に regex マッチテスト + validator がある場合は単体テスト

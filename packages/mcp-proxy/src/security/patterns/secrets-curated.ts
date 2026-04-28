import type { PIIPattern } from "openredaction";

import { parseGitleaksToml } from "./loader.js";

// ─────────────────────────────────────────────────────────────────────────────
// なぜ TOML を別ファイル (.toml) ではなく TS の template literal に inline しているか
// ─────────────────────────────────────────────────────────────────────────────
// TOML 形式（gitleaks 互換）を採用する利点:
//   - gitleaks 公式 / 社内独自 .gitleaks.toml / trufflehog 設定 等の業界標準資産を
//     そのままコピペで取り込める
//   - 形式が安定しているため将来の更新追従が容易
//
// にもかかわらず .toml ファイルとして外部化せず、template literal で inline
// している理由:
//   1. electron-vite で .toml を asset として bundle に正しく含める設定
//      （dev / production の path 解決、配布時の dist-electron へのコピー等）
//      が別途必要になり、本機能の PoC スコープ外
//   2. inline でも 「gitleaks 形式そのままで書ける」という資産流用の利点は維持できる
//   3. 必要になった時点で `parseGitleaksToml(readFileSync(tomlPath, "utf-8"))`
//      に置き換えれば外部 .toml ファイル化への移行は最小限で済む
//
// したがって現状は「形式は TOML、配置は TS」というハイブリッド構成。
// 設定とコードの完全分離（非エンジニアによる編集等）が必要になったら、
// 別チケットで .toml 外部化 + electron-vite plugin 追加を行う想定。
// ─────────────────────────────────────────────────────────────────────────────
//
// ルール追加方法:
// 1. gitleaks.toml や trufflehog の rule から regex/id/description を抽出
// 2. 下記の `[[rules]]` ブロックを増やすだけ
// 3. severity は OpenRedaction の "critical" / "high" / "medium" / "low" で記載
const SECRETS_TOML = `
[[rules]]
id = "github-pat"
description = "GitHub Personal Access Token (classic)"
regex = '''ghp_[0-9a-zA-Z]{36}'''
severity = "critical"

[[rules]]
id = "github-fine-grained-pat"
description = "GitHub Fine-grained Personal Access Token"
regex = '''github_pat_[0-9a-zA-Z_]{82}'''
severity = "critical"

[[rules]]
id = "github-oauth"
description = "GitHub OAuth Access Token"
regex = '''gho_[0-9a-zA-Z]{36}'''
severity = "critical"

[[rules]]
id = "github-app-token"
description = "GitHub App Token"
regex = '''(?:ghu|ghs)_[0-9a-zA-Z]{36}'''
severity = "critical"

[[rules]]
id = "openai-api-key"
description = "OpenAI API Key (legacy / project / service account)"
regex = '''sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}'''
severity = "critical"

[[rules]]
id = "anthropic-api-key"
description = "Anthropic API Key"
regex = '''sk-ant-[A-Za-z0-9_-]{32,}'''
severity = "critical"

[[rules]]
id = "stripe-live-secret-key"
description = "Stripe Live Secret Key"
regex = '''sk_live_[0-9a-zA-Z]{24,247}'''
severity = "critical"

[[rules]]
id = "stripe-restricted-key"
description = "Stripe Restricted Key"
regex = '''rk_(?:live|test)_[0-9a-zA-Z]{24,247}'''
severity = "critical"

[[rules]]
id = "slack-bot-token"
description = "Slack Bot Token"
regex = '''xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}'''
severity = "critical"

[[rules]]
id = "slack-user-token"
description = "Slack User Token"
regex = '''xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{32,}'''
severity = "critical"

[[rules]]
id = "slack-app-token"
description = "Slack App-Level Token"
regex = '''xapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-zA-Z0-9]+'''
severity = "critical"

[[rules]]
id = "slack-webhook"
description = "Slack Incoming Webhook URL"
regex = '''https://hooks\\.slack\\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[a-zA-Z0-9]{24,}'''
severity = "high"

[[rules]]
id = "aws-access-key-id"
description = "AWS Access Key ID"
regex = '''(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}'''
severity = "critical"

[[rules]]
id = "google-api-key"
description = "Google API Key"
regex = '''AIza[0-9A-Za-z_-]{35}'''
severity = "high"

[[rules]]
id = "google-oauth-client-secret"
description = "Google OAuth Client Secret"
regex = '''GOCSPX-[a-zA-Z0-9_-]{28}'''
severity = "critical"

[[rules]]
id = "azure-storage-account-key"
description = "Azure Storage Account Key (AccountKey= プレフィックス必須、偽陽性回避)"
regex = '''AccountKey=[A-Za-z0-9+/]{86}=='''
severity = "high"

[[rules]]
id = "private-key-pem"
description = "PEM Private Key (RSA / EC / OpenSSH / PGP)"
regex = '''-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----'''
severity = "critical"

[[rules]]
id = "jwt-token"
description = "JSON Web Token (eyJ で始まる base64url の 3 セクション)"
regex = '''eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}'''
severity = "high"
`;

export const curatedSecretPatterns: PIIPattern[] =
  parseGitleaksToml(SECRETS_TOML);

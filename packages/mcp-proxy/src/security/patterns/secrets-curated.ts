import type { PIIPattern } from "openredaction";

import { parseGitleaksToml } from "./loader.js";

// gitleaks 互換 TOML テキスト（template literal 内に直書き）
// 形式は gitleaks 公式 https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml に準拠
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

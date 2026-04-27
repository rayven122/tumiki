import type { PIIPattern } from "openredaction";

// シークレット / API キー検出パターン
// vendor-specific な主要ルールのみ。大量の gitleaks 由来ルールは DEV-1585 で取り込む
export const secretPatterns: PIIPattern[] = [
  {
    type: "GITHUB_PAT",
    regex: /ghp_[0-9a-zA-Z]{36}/g,
    priority: 20,
    placeholder: "[GITHUB_PAT_{n}]",
    severity: "critical",
    description: "GitHub Personal Access Token (classic)",
  },
  {
    type: "GITHUB_FINE_GRAINED_PAT",
    regex: /github_pat_[0-9a-zA-Z_]{82}/g,
    priority: 20,
    placeholder: "[GITHUB_FINE_GRAINED_PAT_{n}]",
    severity: "critical",
    description: "GitHub Fine-grained Personal Access Token",
  },
  {
    type: "OPENAI_API_KEY",
    regex: /sk-[A-Za-z0-9]{32,}/g,
    priority: 20,
    placeholder: "[OPENAI_API_KEY_{n}]",
    severity: "critical",
    description: "OpenAI API Key (legacy 形式)",
  },
  {
    type: "STRIPE_LIVE_KEY",
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    priority: 20,
    placeholder: "[STRIPE_LIVE_KEY_{n}]",
    severity: "critical",
    description: "Stripe Live Secret Key",
  },
  {
    type: "SLACK_BOT_TOKEN",
    regex: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}/g,
    priority: 20,
    placeholder: "[SLACK_BOT_TOKEN_{n}]",
    severity: "critical",
    description: "Slack Bot Token",
  },
];

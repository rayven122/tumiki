import type { JSX } from "react";
import { useId, useState } from "react";
import { Copy, Check } from "lucide-react";
import { MCP_OAUTH_REDIRECT_URI } from "../../shared/oauth/redirect-uri";

export const OAuthCallbackUrlField = (): JSX.Element => {
  const inputId = useId();
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    navigator.clipboard.writeText(MCP_OAUTH_REDIRECT_URI).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // 非HTTPSや権限拒否でwriteTextが失敗してもreadOnly inputから手動コピー可能なため握り潰す
      },
    );
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
      >
        Callback URL（リダイレクトURI）
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          readOnly
          value={MCP_OAUTH_REDIRECT_URI}
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-4 py-3 font-mono text-xs text-[var(--text-secondary)] outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Callback URLをコピー"
          className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
        >
          {copied ? (
            <Check size={16} className="text-emerald-500" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        SaaS側のOAuthアプリ設定で、このURLを「Callback URL」または「Redirect
        URI」として登録してください。
      </p>
    </div>
  );
};

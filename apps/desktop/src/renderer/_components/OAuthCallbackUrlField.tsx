import type { JSX } from "react";
import { useId, useState } from "react";
import { Copy, Check } from "lucide-react";
import { MCP_OAUTH_REDIRECT_URI } from "../../shared/oauth/redirect-uri";

/**
 * OAuthコールバックURL（リダイレクトURI）の表示フィールド
 *
 * Tumikiは RFC 8252 のループバックHTTP方式（固定ポート）を採用しているため、
 * SaaS側のOAuthアプリ設定にこの固定URIを Callback URL として登録すれば良い。
 */
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
        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
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
          className="flex-1 rounded-lg border border-gray-200 dark:border-white/[.08] bg-[#e8eaed] dark:bg-[#0a0a0a] px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Callback URLをコピー"
          className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 dark:border-white/[.08] text-gray-600 dark:text-zinc-400 transition hover:bg-black/[.02] dark:bg-white/[.04]"
        >
          {copied ? (
            <Check size={16} className="text-emerald-500" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
        SaaS側のOAuthアプリ設定で、このURLを「Callback URL」または「Redirect
        URI」として登録してください。
      </p>
    </div>
  );
};

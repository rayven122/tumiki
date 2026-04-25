"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

/* ===== システム設定画面 ===== */

const AdminSettingsPage = () => {
  /* 組織情報 */
  const [orgName, setOrgName] = useState("株式会社Example");
  const [adminEmail, setAdminEmail] = useState("admin@example.co.jp");

  /* 認証・SSO */
  const [oidcUrl, setOidcUrl] = useState(
    "https://accounts.example.com/.well-known/openid-configuration",
  );
  const [clientId, setClientId] = useState("tumiki-client-prod");
  const [clientSecret, setClientSecret] = useState("sk-prod-xxxxxxxxxxxx");
  const [jitEnabled, setJitEnabled] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState("8h");

  /* SCIMトークン */
  const scimEndpoint = "https://proxy.tumiki.example.co.jp/scim/v2";

  /* セキュリティ */
  const [mfaPolicy, setMfaPolicy] = useState<"all" | "admin" | "optional">(
    "admin",
  );
  const [ipRestriction, setIpRestriction] = useState(
    "192.168.0.0/16\n10.0.0.0/8",
  );
  const [apiKeyExpiry, setApiKeyExpiry] = useState("90d");

  /* MCPプロキシ */
  const [proxyTimeout, setProxyTimeout] = useState(30);
  const [rateLimit, setRateLimit] = useState(100);
  const [piiMasking, setPiiMasking] = useState(true);

  /* 監査・ログ */
  const [logRetention, setLogRetention] = useState("90d");
  const [autoExport, setAutoExport] = useState(false);
  const [exportUrl, setExportUrl] = useState("");

  /* 通知 */
  const [slackWebhook, setSlackWebhook] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("ops-team@example.co.jp");
  const [blockRateThreshold, setBlockRateThreshold] = useState(5);

  /* SCIMエンドポイントのコピー */
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(scimEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* トグルスイッチのレンダリングヘルパー */
  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-4 w-7 rounded-full transition-colors ${checked ? "bg-badge-success-bg" : "bg-bg-active"}`}
    >
      <span
        className={`block h-3 w-3 rounded-full transition-transform ${checked ? "bg-badge-success-text" : "bg-text-subtle"}`}
        style={{ transform: checked ? "translateX(14px)" : "translateX(2px)" }}
      />
    </button>
  );

  /* セクションカードのレンダリングヘルパー */
  const SectionCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-bg-card border-border-default rounded-xl border p-5">
      <h2 className="text-text-primary mb-4 text-sm font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        >
          保存
        </button>
      </div>
    </div>
  );

  /* 入力フィールドのレンダリングヘルパー */
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="text-text-secondary mb-1 block text-[11px]">
        {label}
      </label>
      {children}
    </div>
  );

  /* 共通テキストinputクラス */
  const inputCls =
    "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

  return (
    <div className="space-y-5 p-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-text-primary text-lg font-semibold">
          システム設定
        </h1>
        <p className="text-text-secondary mt-1 text-xs">
          組織・認証・セキュリティの設定を管理
        </p>
      </div>

      {/* 1. 組織情報 */}
      <SectionCard title="組織情報">
        <Field label="組織名">
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="管理者メールアドレス">
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
      </SectionCard>

      {/* 2. 認証・SSO */}
      <SectionCard title="認証・SSO">
        <Field label="OIDC Discovery URL">
          <input
            type="url"
            value={oidcUrl}
            onChange={(e) => setOidcUrl(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Client ID">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Client Secret">
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className={inputCls}
          />
        </Field>
        {/* JITプロビジョニング */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-secondary text-xs font-medium">
              JITプロビジョニング
            </div>
            <div className="text-text-muted text-[10px]">
              初回ログイン時にユーザーを自動作成
            </div>
          </div>
          <Toggle
            checked={jitEnabled}
            onChange={setJitEnabled}
            label="JITプロビジョニングを切り替え"
          />
        </div>
        {/* SCIMエンドポイント */}
        <Field label="SCIMエンドポイント（読み取り専用）">
          <div className="flex gap-2">
            <input
              type="text"
              value={scimEndpoint}
              readOnly
              className={`${inputCls} text-text-muted flex-1`}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-opacity hover:opacity-80"
            >
              <Copy size={11} />
              {copied ? "コピー済み" : "コピー"}
            </button>
          </div>
        </Field>
        {/* SCIMトークン */}
        <Field label="SCIMトークン">
          <div className="flex gap-2">
            <input
              type="password"
              value="scim-token-xxxxxxxxxxxxxxxxxxxx"
              readOnly
              className={`${inputCls} text-text-muted flex-1`}
            />
            <button
              type="button"
              className="bg-bg-active text-text-secondary rounded-lg px-3 py-2 text-xs transition-opacity hover:opacity-80"
            >
              再発行
            </button>
          </div>
        </Field>
        {/* セッション有効期限 */}
        <Field label="セッション有効期限">
          <select
            value={sessionExpiry}
            onChange={(e) => setSessionExpiry(e.target.value)}
            className={inputCls}
          >
            <option value="1h">1時間</option>
            <option value="8h">8時間</option>
            <option value="24h">24時間</option>
            <option value="7d">7日</option>
          </select>
        </Field>
      </SectionCard>

      {/* 3. セキュリティ */}
      <SectionCard title="セキュリティ">
        {/* MFA強制ポリシー */}
        <div>
          <div className="text-text-secondary mb-2 text-[11px]">
            MFA強制ポリシー
          </div>
          <div className="space-y-2">
            {(
              [
                { value: "all", label: "全員" },
                { value: "admin", label: "管理者のみ" },
                { value: "optional", label: "任意" },
              ] as { value: "all" | "admin" | "optional"; label: string }[]
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="mfaPolicy"
                  value={opt.value}
                  checked={mfaPolicy === opt.value}
                  onChange={() => setMfaPolicy(opt.value)}
                  className="accent-emerald-400"
                />
                <span className="text-text-secondary text-xs">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* IPアドレス制限 */}
        <Field label="IPアドレス制限（1行1IP/CIDR）">
          <textarea
            value={ipRestriction}
            onChange={(e) => setIpRestriction(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none font-mono`}
          />
        </Field>
        {/* APIキーデフォルト有効期限 */}
        <Field label="APIキーデフォルト有効期限">
          <select
            value={apiKeyExpiry}
            onChange={(e) => setApiKeyExpiry(e.target.value)}
            className={inputCls}
          >
            <option value="30d">30日</option>
            <option value="90d">90日</option>
            <option value="180d">180日</option>
            <option value="unlimited">無制限</option>
          </select>
        </Field>
      </SectionCard>

      {/* 4. MCPプロキシ */}
      <SectionCard title="MCPプロキシ">
        <Field label="デフォルトタイムアウト（秒）">
          <input
            type="number"
            value={proxyTimeout}
            onChange={(e) => setProxyTimeout(Number(e.target.value))}
            min={1}
            className={inputCls}
          />
        </Field>
        <Field label="レート制限（リクエスト/分）">
          <input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            min={1}
            className={inputCls}
          />
        </Field>
        {/* PIIマスキング */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-secondary text-xs font-medium">
              PIIマスキング
            </div>
            <div className="text-text-muted text-[10px]">
              個人情報を自動的にマスク処理
            </div>
          </div>
          <Toggle
            checked={piiMasking}
            onChange={setPiiMasking}
            label="PIIマスキングを切り替え"
          />
        </div>
      </SectionCard>

      {/* 5. 監査・ログ */}
      <SectionCard title="監査・ログ">
        <Field label="ログ保管期間">
          <select
            value={logRetention}
            onChange={(e) => setLogRetention(e.target.value)}
            className={inputCls}
          >
            <option value="30d">30日</option>
            <option value="90d">90日</option>
            <option value="180d">180日</option>
            <option value="1y">1年</option>
          </select>
        </Field>
        {/* 自動エクスポート */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-secondary text-xs font-medium">
              自動エクスポート
            </div>
            <div className="text-text-muted text-[10px]">
              ログを外部サービスに定期エクスポート
            </div>
          </div>
          <Toggle
            checked={autoExport}
            onChange={setAutoExport}
            label="自動エクスポートを切り替え"
          />
        </div>
        {/* エクスポート先URL（エクスポートON時のみ表示） */}
        {autoExport && (
          <Field label="エクスポート先URL">
            <input
              type="url"
              placeholder="https://logs.example.com/ingest"
              value={exportUrl}
              onChange={(e) => setExportUrl(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
      </SectionCard>

      {/* 6. 通知 */}
      <SectionCard title="通知">
        <Field label="Slack Webhook URL">
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="メール通知先">
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="アラートしきい値 ブロック率（%）">
          <input
            type="number"
            value={blockRateThreshold}
            onChange={(e) => setBlockRateThreshold(Number(e.target.value))}
            min={0}
            max={100}
            className={inputCls}
          />
        </Field>
      </SectionCard>
    </div>
  );
};

export default AdminSettingsPage;

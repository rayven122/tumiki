import { hasOidcUpstream, hasSamlUpstream, setupOidcSchema } from "~/lib/env";

export const dynamic = "force-dynamic";

const getEnvErrors = (): Record<string, string> => {
  const hasSaml = hasSamlUpstream();
  const hasOidc = hasOidcUpstream();
  const result = setupOidcSchema.safeParse({
    INTERNAL_DATABASE_URL: process.env.INTERNAL_DATABASE_URL,
    TUMIKI_INTERNAL_MANAGER_SECRET_KEY:
      process.env.TUMIKI_INTERNAL_MANAGER_SECRET_KEY,
    TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY:
      process.env.TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY,
    TUMIKI_INTERNAL_MANAGER_PUBLIC_URL:
      process.env.TUMIKI_INTERNAL_MANAGER_PUBLIC_URL,
    TUMIKI_INTERNAL_MANAGER_UPSTREAM:
      hasSaml || hasOidc ? "configured" : undefined,
  });

  const errors = result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );

  if (hasSaml && hasOidc) {
    return {
      ...errors,
      TUMIKI_INTERNAL_MANAGER_UPSTREAM:
        "SAML upstream と OIDC upstream はどちらか一方だけ設定してください",
    };
  }

  return errors;
};

const SetupPage = () => {
  const errors = getEnvErrors();

  const vars = [
    {
      key: "INTERNAL_DATABASE_URL",
      errorKey: "INTERNAL_DATABASE_URL",
      label: "Jackson 接続保存 DB",
    },
    {
      key: "TUMIKI_INTERNAL_MANAGER_SECRET_KEY",
      errorKey: "TUMIKI_INTERNAL_MANAGER_SECRET_KEY",
      label: "Auth.js / Jackson 暗号化キーの導出元",
    },
    {
      key: "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY",
      errorKey: "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY",
      label: "Jackson OIDC ID Token 署名用 private key",
    },
    {
      key: "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      errorKey: "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      label: "issuer / SAML ACS / Auth.js callback URL の基準",
    },
    {
      key: "TUMIKI_INTERNAL_MANAGER_SAML_* / TUMIKI_INTERNAL_MANAGER_OIDC_*",
      errorKey: "TUMIKI_INTERNAL_MANAGER_UPSTREAM",
      label: "SAML または OIDC upstream 設定",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-base font-semibold text-white">
          Tumiki Internal Manager
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          Jackson が Web / Desktop 用 OIDC client
          を自動生成するため、以下を設定してください。
        </p>
        <div className="space-y-2">
          {vars.map(({ key, errorKey, label }) => {
            const error = errors[errorKey];
            return (
              <div
                key={key}
                className={`flex items-start justify-between rounded-lg border px-4 py-3 ${
                  error
                    ? "border-red-800 bg-red-950"
                    : "border-green-800 bg-green-950"
                }`}
              >
                <div>
                  <p className="font-mono text-xs break-all text-white">
                    {key}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{label}</p>
                </div>
                <span
                  className={`mt-0.5 shrink-0 text-xs font-medium ${
                    error ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {error ?? "OK"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;

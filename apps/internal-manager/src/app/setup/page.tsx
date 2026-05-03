import { setupOidcSchema } from "~/lib/env";

const getEnvErrors = (): Record<string, string> => {
  const result = setupOidcSchema.safeParse({
    OIDC_ISSUER: process.env.OIDC_ISSUER,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  });

  if (result.success) return {};

  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
};

const SetupPage = () => {
  const errors = getEnvErrors();

  const vars = [
    { key: "OIDC_ISSUER", label: "Issuer URL" },
    { key: "OIDC_CLIENT_ID", label: "Client ID（管理サーバー用）" },
    { key: "OIDC_CLIENT_SECRET", label: "Client Secret（管理サーバー用）" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-base font-semibold text-white">
          Tumiki Internal Manager
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          以下の環境変数を設定して再起動してください。
        </p>
        <div className="space-y-2">
          {vars.map(({ key, label }) => {
            const error = errors[key];
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
                  <p className="font-mono text-xs text-white">{key}</p>
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

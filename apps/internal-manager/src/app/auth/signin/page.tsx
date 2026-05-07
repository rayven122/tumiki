import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { auth, signIn } from "~/auth";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

const DEFAULT_CALLBACK_URL = "/admin";

const getRequestOrigin = async (): Promise<string | null> => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return null;

  const protocol =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  return `${protocol}://${host}`;
};

const sanitizeCallbackUrl = (
  value: string | string[] | undefined,
  requestOrigin: string | null,
): string => {
  const callbackUrl = Array.isArray(value) ? value[0] : value;
  if (!callbackUrl || callbackUrl.includes("\\")) {
    return DEFAULT_CALLBACK_URL;
  }

  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  if (requestOrigin) {
    try {
      const url = new URL(callbackUrl);
      if (url.origin === requestOrigin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return DEFAULT_CALLBACK_URL;
    }
  }

  return DEFAULT_CALLBACK_URL;
};

const signInWithOidc = async (formData: FormData) => {
  "use server";

  const callbackUrlValue = formData.get("callbackUrl");
  const requestOrigin = await getRequestOrigin();
  const callbackUrl = sanitizeCallbackUrl(
    typeof callbackUrlValue === "string" ? callbackUrlValue : undefined,
    requestOrigin,
  );
  await signIn("oidc", { redirectTo: callbackUrl });
};

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const params = await searchParams;
  const requestOrigin = await getRequestOrigin();
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl, requestOrigin);
  const session = await auth();
  if (session) redirect(callbackUrl);

  return (
    <main className="bg-bg-main text-text-secondary flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-3">
          <div className="border-border-default bg-bg-card flex h-10 w-10 items-center justify-center rounded-lg border">
            <img
              src="/tumiki-logo.svg"
              alt=""
              className="h-6 w-6 object-contain"
            />
          </div>
          <div>
            <p className="text-text-primary text-base font-semibold">Tumiki</p>
            <p className="text-text-subtle text-xs">Tumiki Manager</p>
          </div>
        </div>

        <section className="border-border-default bg-bg-card rounded-xl border p-6 shadow-[var(--shadow-card)]">
          <div className="mb-6">
            <div className="bg-badge-info-bg text-badge-info-text mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
              <ShieldCheck size={14} />
              管理者向けアクセス
            </div>
            <h1 className="text-text-primary text-xl font-semibold">
              Tumiki Manager にログイン
            </h1>
            <p className="text-text-secondary mt-2 text-sm leading-6">
              組織の SSO で認証して、システム設定と管理機能にアクセスします。
            </p>
          </div>

          <form action={signInWithOidc}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              SSO でログイン
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="border-border-default mt-6 border-t pt-5">
            <p className="text-text-muted text-xs leading-5">
              アクセス権限がない場合は、管理者ロールを持つアカウントでログインしてください。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default SignInPage;

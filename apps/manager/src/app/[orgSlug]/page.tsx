import { redirect } from "next/navigation";
import { auth } from "~/auth";
import { getSessionInfo } from "~/lib/auth/session-utils";

type OrgSlugPageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * 組織スラッグのルートページ
 * 正しい組織スラッグにリダイレクトするか、デフォルトページにリダイレクトする
 */
export default async function OrgSlugPage({ params }: OrgSlugPageProps) {
  const { orgSlug } = await params;
  // URLデコードを明示的に行う（@などの特殊文字対応）
  const decodedSlug = decodeURIComponent(orgSlug);

  // auth.jsのセッションを取得
  const session = await auth();

  // ログインしていない場合はサインインページにリダイレクト
  if (!session?.user) {
    redirect("/signin");
  }

  const userOrgSlug = getSessionInfo(session).organizationSlug;

  // セッションに組織スラッグがない場合はホームにリダイレクト
  if (!userOrgSlug) {
    redirect("/");
  }

  // URLの組織スラッグとセッションの組織スラッグが一致しない場合、
  // セッションの組織スラッグにリダイレクト
  if (decodedSlug !== userOrgSlug) {
    redirect(`/${userOrgSlug}/mcps`);
  }

  // 正しい組織スラッグの場合、デフォルトページ（mcps）にリダイレクト
  redirect(`/${decodedSlug}/mcps`);
}

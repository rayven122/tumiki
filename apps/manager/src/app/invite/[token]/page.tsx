import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@tumiki/db/server";
import { InviteAcceptClient } from "./_components/InviteAcceptClient";
import { InviteError } from "./_components/InviteError";
import { InviteAlreadyMember } from "./_components/InviteAlreadyMember";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // 1. セッション確認
  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?redirect=/invite/${encodeURIComponent(token)}`);
  }

  // 2. トークン検証（サーバー側）
  try {
    const invitation = await db.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: true,
        invitedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 3. 存在チェック
    if (!invitation) {
      return <InviteError errorType="NOT_FOUND" />;
    }

    // 4. 有効期限チェック
    if (new Date() > invitation.expires) {
      return (
        <InviteError
          errorType="GONE"
          organizationSlug={invitation.organization.slug}
        />
      );
    }

    // 5. メールアドレス照合
    if (session.user.email !== invitation.email) {
      return (
        <InviteError
          errorType="FORBIDDEN"
          organizationSlug={invitation.organization.slug}
        />
      );
    }

    // 6. 既存メンバーチェック
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
      },
    });

    if (existingMember) {
      return (
        <InviteAlreadyMember
          organizationSlug={invitation.organization.slug}
          organizationName={invitation.organization.name}
        />
      );
    }

    // 7. 正常 → クライアントコンポーネントへ
    // ロール配列から管理者権限を判定
    const isAdmin = invitation.roles.some(
      (role) => role === "Owner" || role === "Admin",
    );

    return (
      <InviteAcceptClient
        token={token}
        organizationName={invitation.organization.name}
        invitedByName={invitation.invitedByUser.name}
        isAdmin={isAdmin}
      />
    );
  } catch (error) {
    console.error("招待ページエラー:", error);
    return <InviteError errorType="UNKNOWN" />;
  }
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Mail, UserPlus } from "lucide-react";

type InviteAcceptClientProps = {
  token: string;
  organizationName: string;
  invitedByName: string | null;
  isAdmin: boolean;
};

export const InviteAcceptClient = ({
  token,
  organizationName,
  invitedByName,
  isAdmin,
}: InviteAcceptClientProps) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const { update: updateSession } = useSession();
  const router = useRouter();
  const utils = api.useUtils();

  const acceptMutation = api.organization.acceptInvitation.useMutation({
    onSuccess: async (data) => {
      toast.success(`${organizationName}への参加が完了しました！`);
      // tRPCキャッシュを無効化
      await utils.invalidate();
      // Auth.jsセッションを更新
      await updateSession({});
      // 新しい組織のページへ遷移
      router.push(`/${data.organizationSlug}/mcps`);
    },
    onError: (error) => {
      toast.error(error.message || "招待の受け入れに失敗しました");
      setIsAccepting(false);
    },
  });

  const handleAccept = () => {
    setIsAccepting(true);
    acceptMutation.mutate({ token });
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            組織への招待
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              {invitedByName}さんから{organizationName}への招待が届いています。
            </p>
            {isAdmin && (
              <p className="mt-2 text-sm font-semibold text-blue-600">
                管理者として招待されています
              </p>
            )}
          </div>
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full"
          >
            {isAccepting ? (
              "処理中..."
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                参加する
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

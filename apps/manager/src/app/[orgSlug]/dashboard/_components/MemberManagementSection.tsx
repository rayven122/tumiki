"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Crown, User, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export const MemberManagementSection = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: organization, isLoading: organizationLoading } =
    api.organization.getById.useQuery();

  const members = organization?.members;

  const utils = api.useUtils();

  const inviteMutation = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      setIsInviteDialogOpen(false);
      setShowSuccessAnimation(true);
      setErrorMessage(null);
      void utils.organization.getById.invalidate();
      void utils.organization.getInvitations.invalidate();
    },
    onError: (error) => {
      setErrorMessage(
        error.message ||
          "メンバーの招待に失敗しました。もう一度お試しください。",
      );
    },
  });

  // アニメーションを3秒後に非表示（メモリリーク対策）
  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation]);

  const removeMemberMutation = api.organization.removeMember.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      // メンバーリストの更新
      void utils.organization.getById.invalidate();
    },
    onError: (error) => {
      setErrorMessage(
        error.message ||
          "メンバーの削除に失敗しました。もう一度お試しください。",
      );
    },
  });

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      inviteMutation.mutate({
        email: inviteEmail.trim(),
        roles: ["Member"],
      });
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    await removeMemberMutation.mutateAsync({
      memberId,
    });

    // 自分自身を削除した場合
    if (userId === session?.user.id) {
      toast.info("組織から退会しました。組織一覧ページに移動します。");
      // セッション更新を待ってからリダイレクト
      await update();
      router.push("/organizations/dashboard");
    }
  };

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  if (organizationLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>メンバー管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200"></div>
                  <div className="h-3 w-1/4 rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* メンバー招待成功時のアニメーション */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <SuccessAnimation
            title="招待を送信しました！"
            description="招待メールが送信されました。<br/>メンバーが承認するとチームに参加できます。"
            className=""
          />
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>メンバー管理</CardTitle>
          {isAdmin && (
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  メンバーを招待
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>メンバーを招待</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={!inviteEmail.trim() || inviteMutation.isPending}
                    >
                      招待を送信
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        {errorMessage && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}
        <CardContent>
          {!members || members.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              メンバーがいません。
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.user.image ?? undefined} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.user.name ?? "名前未設定"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user.email}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {member.roles.some(
                          (role) =>
                            role.name === "Owner" || role.name === "Admin",
                        ) ? (
                          <Badge variant="default" className="text-xs">
                            <Crown className="mr-1 h-3 w-3" />
                            管理者
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <User className="mr-1 h-3 w-3" />
                            メンバー
                          </Badge>
                        )}
                        {member.roles.map((role) => (
                          <Badge
                            key={role.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400">
                      参加日:{" "}
                      {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                    {isAdmin && member.userId !== organization?.createdBy && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>メンバーを削除</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.user.name ?? member.user.email}{" "}
                              を組織から削除しますか？
                              この操作は取り消せません。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveMember(member.id, member.userId)
                              }
                              className="bg-red-600 hover:bg-red-700"
                            >
                              削除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

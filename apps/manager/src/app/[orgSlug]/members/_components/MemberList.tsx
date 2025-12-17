"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { UserPlus, Trash2, Crown, User, Mail } from "lucide-react";
import { api } from "@/trpc/react";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { type GetOrganizationBySlugOutput } from "@/server/api/routers/organization/getBySlug";
import { toast } from "sonner";

type MemberListProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MemberList = ({ organization }: MemberListProps) => {
  const [inviteEmails, setInviteEmails] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [invitedCount, setInvitedCount] = useState(0);

  const utils = api.useUtils();

  const isAdmin = organization.isAdmin;

  const inviteMembersMutation = api.organization.inviteMembers.useMutation({
    onSuccess: async (data) => {
      // UIを更新
      setInviteEmails("");
      setIsInviteDialogOpen(false);

      // キャッシュを無効化（並列実行して完了を待つ）
      await Promise.all([
        utils.organization.getBySlug.invalidate({
          slug: organization.slug,
        }),
        utils.organization.getInvitations.invalidate(),
      ]);

      // 結果を通知
      const succeeded = data.succeeded.length;
      const failed = data.failed.length;

      if (succeeded > 0 && failed === 0) {
        setInvitedCount(succeeded);
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowSuccessAnimation(false);
        }, 3000);
      } else if (succeeded > 0 && failed > 0) {
        toast.success(`${succeeded}件の招待を送信しました`);
        toast.error(
          `${failed}件の招待に失敗しました: ${data.failed.map((f) => `${f.email} (${f.reason})`).join(", ")}`,
        );
      } else {
        toast.error(
          `招待の送信に失敗しました: ${data.failed.map((f) => `${f.email} (${f.reason})`).join(", ")}`,
        );
      }
    },
    onError: (error) => {
      toast.error(error.message || "招待の送信中にエラーが発生しました");
    },
  });

  const removeMemberMutation = api.organization.removeMember.useMutation({
    onSuccess: () => {
      void utils.organization.getBySlug.invalidate({
        slug: organization.slug,
      });
      toast.success("メンバーを削除しました");
    },
    onError: (error) => {
      toast.error(error.message || "メンバーの削除に失敗しました");
    },
  });

  const handleInvite = () => {
    // カンマ、改行、セミコロンで分割
    const emailList = inviteEmails
      .split(/[,;\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    // サーバー側で処理
    inviteMembersMutation.mutate({
      emails: emailList,
      isAdmin: false,
      roleIds: [],
      groupIds: [],
    });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate({
      memberId,
    });
  };

  return (
    <>
      {/* メンバー招待成功時のアニメーション */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <SuccessAnimation
            title={
              invitedCount === 1
                ? "招待を送信しました！"
                : `${invitedCount}件の招待を送信しました！`
            }
            description="招待メールが送信されました。<br/>メンバーが承認するとチームに参加できます。"
            className=""
          />
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>メンバー一覧</CardTitle>
            <p className="text-muted-foreground text-sm">
              現在 {organization.members.length} 人のメンバーが参加しています
            </p>
          </div>
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
                    <Label htmlFor="emails">メールアドレス</Label>
                    <Textarea
                      id="emails"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                      rows={5}
                      className="font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      複数のメールアドレスはカンマ（,）、改行、またはセミコロン（;）で区切ってください
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      disabled={inviteMembersMutation.isPending}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={
                        !inviteEmails.trim() || inviteMembersMutation.isPending
                      }
                    >
                      {inviteMembersMutation.isPending
                        ? "送信中..."
                        : "招待を送信"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {!organization.members || organization.members.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              メンバーがいません。
            </p>
          ) : (
            <div className="space-y-4">
              {organization.members.map((member) => (
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
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        {member.user.email}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {member.isAdmin ? (
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
                    {isAdmin && member.userId !== organization.createdBy && (
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
                              onClick={() => handleRemoveMember(member.id)}
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

"use client";

import { useState, useEffect } from "react";
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
import { UserPlus, Trash2, Crown, User, Mail, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type GetOrganizationBySlugOutput } from "@/server/api/routers/organization/getBySlug";

type MemberListProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MemberList = ({ organization }: MemberListProps) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utils = api.useUtils();

  const inviteMutation = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      setIsInviteDialogOpen(false);
      setShowSuccessAnimation(true);
      setErrorMessage(null);
      void utils.organization.getBySlug.invalidate({
        slug: organization.slug,
      });
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
      void utils.organization.getBySlug.invalidate({
        slug: organization.slug,
      });
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
        isAdmin: false,
      });
    }
  };

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate({
      memberId,
    });
  };

  const isAdmin = organization.isAdmin;

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

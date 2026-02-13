"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2, Crown, User, Mail, Shield, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { type GetOrganizationBySlugOutput } from "@/features/organization";
import { toast } from "sonner";
import type { OrganizationRole } from "@/server/utils/organizationPermissions";
import { MemberRoleSelector } from "./MemberRoleSelector";

type MemberListProps = {
  organization: GetOrganizationBySlugOutput;
};

// ロールの説明
const ROLE_DESCRIPTIONS: Record<
  OrganizationRole,
  { label: string; description: string; icon: typeof Crown }
> = {
  Owner: {
    label: "オーナー",
    description: "全権限（組織削除含む）",
    icon: Crown,
  },
  Admin: {
    label: "管理者",
    description: "組織削除以外の全機能",
    icon: Shield,
  },
  Member: {
    label: "メンバー",
    description: "MCP作成・メンバー閲覧",
    icon: User,
  },
  Viewer: {
    label: "閲覧者",
    description: "読み取り専用",
    icon: Eye,
  },
};

export const MemberList = ({ organization }: MemberListProps) => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [inviteEmails, setInviteEmails] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [invitedCount, setInvitedCount] = useState(0);
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>("Member");

  const utils = api.useUtils();

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

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
      // メンバーリストの更新
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

    // サーバー側で処理（選択されたロールを使用）
    inviteMembersMutation.mutate({
      emails: emailList,
      roles: [selectedRole],
    });
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    await removeMemberMutation.mutateAsync({
      memberId,
    });

    // 自分自身を削除した場合
    if (userId === session?.user.id) {
      toast.info("組織から退会しました。");
      // セッション更新を待ってからリダイレクト
      await update({});
      router.push("/onboarding");
    }
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
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>メンバーを招待</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="emails">メールアドレス</Label>
                    <Textarea
                      id="emails"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                      rows={5}
                      className="font-mono text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                      複数のメールアドレスはカンマ（,）、改行、またはセミコロン（;）で区切ってください
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="role">ロール</Label>
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          setSelectedRole(value as OrganizationRole)
                        }
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="ロールを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {(["Admin", "Member", "Viewer"] as const).map(
                            (role) => {
                              const roleInfo = ROLE_DESCRIPTIONS[role];
                              const Icon = roleInfo.icon;
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{roleInfo.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            },
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* 選択されたロールの説明を表示 */}
                    <div className="bg-muted/40 rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        {(() => {
                          const roleInfo = ROLE_DESCRIPTIONS[selectedRole];
                          const Icon = roleInfo.icon;
                          return (
                            <>
                              <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {roleInfo.label}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {roleInfo.description}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
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
              {organization.members.map((member) => {
                const isOwner = member.userId === organization.createdBy;
                return (
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* ロールセレクター/バッジ */}
                      {isOwner ? (
                        <Select value="Owner" disabled>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 shrink-0" />
                                <span>オーナー</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : isAdmin ? (
                        <MemberRoleSelector
                          memberId={member.id}
                          memberName={
                            member.user.name ?? member.user.email ?? ""
                          }
                          currentRole={
                            (member.roles.find((r) =>
                              ["Owner", "Admin", "Member", "Viewer"].includes(
                                r.name,
                              ),
                            )?.name ?? "Member") as OrganizationRole
                          }
                          organizationSlug={organization.slug}
                        />
                      ) : (
                        <>
                          {member.roles.map((role) => {
                            const roleInfo =
                              ROLE_DESCRIPTIONS[role.name as OrganizationRole];
                            if (roleInfo) {
                              const Icon = roleInfo.icon;
                              return (
                                <Badge
                                  key={role.id}
                                  variant={
                                    role.name === "Admin"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  <Icon className="mr-1 h-3 w-3" />
                                  {roleInfo.label}
                                </Badge>
                              );
                            }
                            return null;
                          })}
                        </>
                      )}
                      <div className="text-xs text-gray-400">
                        参加日:{" "}
                        {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                      </div>
                      {isAdmin && member.userId !== organization.createdBy && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                メンバーを削除
                              </AlertDialogTitle>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
